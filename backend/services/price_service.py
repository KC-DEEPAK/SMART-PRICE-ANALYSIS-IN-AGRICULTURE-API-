import logging
from services.api_service import APIService
from services.alert_service import AlertService
from services.email_service import EmailService
from services.push_service import PushService
from services.firebase_service import FirebaseService

logger = logging.getLogger(__name__)


def normalize_crop_name(name: str) -> str:
    """
    Normalizes crop commodity names for robust matching:
    - Strips leading/trailing whitespace
    - Converts to lowercase
    - Normalizes internal spaces to single space
    """
    if not name:
        return ""
    return " ".join(str(name).strip().lower().split())


def safe_float(val, default=0.0):
    """Safely converts price value to float without crashing."""
    if val is None:
        return default

    try:
        if isinstance(val, str):
            val = val.strip().replace("₹", "").replace(",", "")

        return float(val)

    except (ValueError, TypeError) as e:
        logger.warning(
            f"Could not convert price value '{val}' to float: {e}"
        )
        return default


class PriceService:

    @staticmethod
    def check_alerts_and_notify():
        """
        Fetches live crop prices and checks against all active alerts.

        When today's price >= target price:
        1. Sends email notification.
        2. Sends FCM push notification to user's registered devices.
        """

        logger.info("=== Starting Price Alerts Check ===")

        # ---------------------------------------------------------
        # 1. Fetch live crop prices
        # ---------------------------------------------------------
        data, error = APIService.fetch_live_crop_prices()

        if error or not data:
            logger.error(
                f"Error fetching prices for alerts check: {error}"
            )
            return False, f"Failed to fetch prices: {error}"

        logger.info(
            f"1. Market records received: {len(data)}"
        )

        # ---------------------------------------------------------
        # 2. Prepare highest price for each crop
        # ---------------------------------------------------------
        crop_highest_prices = {}

        for item in data:

            raw_commodity = (
                item.get("Commodity")
                or item.get("commodity")
                or ""
            )

            norm_commodity = normalize_crop_name(
                raw_commodity
            )

            if not norm_commodity:
                continue

            min_p = safe_float(
                item.get(
                    "Min_x0020_Price",
                    item.get("min_price", 0)
                )
            )

            max_p = safe_float(
                item.get(
                    "Max_x0020_Price",
                    item.get("max_price", 0)
                )
            )

            modal_p = safe_float(
                item.get(
                    "Modal_x0020_Price",
                    item.get("modal_price", 0)
                )
            )

            price = max(
                min_p,
                max_p,
                modal_p
            )

            market = (
                item.get("Market")
                or item.get("market")
                or "Unknown Market"
            )

            state = (
                item.get("State")
                or item.get("state")
                or "Unknown State"
            )

            if (
                norm_commodity not in crop_highest_prices
                or price > crop_highest_prices[norm_commodity]["price"]
            ):
                crop_highest_prices[norm_commodity] = {
                    "price": price,
                    "market": market,
                    "state": state,
                    "commodity_display": raw_commodity
                }

        available_commodities = list(
            crop_highest_prices.keys()
        )

        logger.info(
            f"2. Available normalized commodities "
            f"({len(available_commodities)}): "
            f"{available_commodities}"
        )

        # ---------------------------------------------------------
        # 3. Get active alerts
        # ---------------------------------------------------------
        alerts, error = AlertService.get_all_active_alerts()

        if error:
            logger.error(
                f"Error fetching active alerts: {error}"
            )
            return False, error

        logger.info(
            f"3. Number of active alerts: {len(alerts)}"
        )

        notifications_sent = 0
        push_notifications_sent = 0

        # ---------------------------------------------------------
        # 4. Check every alert
        # ---------------------------------------------------------
        for alert in alerts:

            raw_alert_crop = alert.get(
                "crop",
                ""
            )

            norm_alert_crop = normalize_crop_name(
                raw_alert_crop
            )

            try:
                target_price = float(
                    alert.get("target_price", 0)
                )

            except (ValueError, TypeError) as e:

                logger.error(
                    f"Invalid target_price "
                    f"'{alert.get('target_price')}' "
                    f"for alert ID "
                    f"{alert.get('id')}: {e}"
                )

                continue

            user_id = alert.get("user_id")
            user_email = alert.get("email", "")
            user_name = alert.get(
                "user_name",
                "Farmer"
            )

            logger.info(
                f"4. Checking alert ID "
                f"{alert.get('id')}: "
                f"Raw Crop='{raw_alert_crop}' "
                f"(normalized: '{norm_alert_crop}'), "
                f"5. Target Price=₹{target_price}, "
                f"User Email='{user_email}', "
                f"User ID='{user_id}'"
            )

            # -----------------------------------------------------
            # 5. Find crop in live market data
            # -----------------------------------------------------
            if norm_alert_crop not in crop_highest_prices:

                logger.warning(
                    f"Crop not found: "
                    f"'{norm_alert_crop}'. "
                    f"Available crops: "
                    f"{available_commodities}"
                )

                continue

            current_market_data = (
                crop_highest_prices[
                    norm_alert_crop
                ]
            )

            current_price = (
                current_market_data["price"]
            )

            logger.info(
                f"Crop matched: "
                f"'{norm_alert_crop}'. "
                f"6. Matching market price: "
                f"₹{current_price} at "
                f"{current_market_data['market']} "
                f"({current_market_data['state']})"
            )

            # -----------------------------------------------------
            # 6. Check target price
            # -----------------------------------------------------
            threshold_met = (
                current_price >= target_price
            )

            logger.info(
                f"7. Threshold condition "
                f"(Actual ₹{current_price} "
                f">= Target ₹{target_price}): "
                f"{threshold_met}"
            )

            if not threshold_met:
                continue

            # =====================================================
            # 7. EMAIL NOTIFICATION
            # =====================================================
            logger.info(
                f"8. Calling EmailService "
                f"for alert ID "
                f"{alert.get('id')} "
                f"({raw_alert_crop}) "
                f"to {user_email}..."
            )

            email_success, email_res = (
                EmailService.send_price_alert(
                    user_name=user_name,
                    email=user_email,
                    crop=current_market_data[
                        "commodity_display"
                    ],
                    price=current_price,
                    market=current_market_data[
                        "market"
                    ],
                    state=current_market_data[
                        "state"
                    ]
                )
            )

            logger.info(
                f"9. EmailService result: "
                f"success={email_success}, "
                f"response/error={email_res}"
            )

            if email_success:
                notifications_sent += 1

            else:
                logger.warning(
                    f"Email delivery failed "
                    f"for alert ID "
                    f"{alert.get('id')} "
                    f"to {user_email}: "
                    f"{email_res}"
                )

            # =====================================================
            # 8. FCM PUSH NOTIFICATION
            # =====================================================

            if not user_id:
                logger.warning(
                    f"No user_id found for alert "
                    f"{alert.get('id')}. "
                    f"Skipping push notification."
                )
                continue

            try:

                device_tokens, token_error = (
                    PushService.get_user_tokens(
                        user_id
                    )
                )

                if token_error:
                    logger.error(
                        f"Could not get FCM tokens "
                        f"for user {user_id}: "
                        f"{token_error}"
                    )
                    continue

                if not device_tokens:
                    logger.warning(
                        f"No FCM device tokens found "
                        f"for user {user_id}"
                    )
                    continue

                logger.info(
                    f"Found {len(device_tokens)} "
                    f"FCM device token(s) "
                    f"for user {user_id}"
                )

                push_title = (
                    f"🌾 {current_market_data['commodity_display']} "
                    f"Price Alert"
                )

                push_body = (
                    f"Price reached ₹{current_price} "
                    f"at {current_market_data['market']}, "
                    f"{current_market_data['state']}. "
                    f"Your target was ₹{target_price}."
                )

                for fcm_token in device_tokens:

                    push_success, push_result = (
                        FirebaseService.send_notification(
                            fcm_token,
                            push_title,
                            push_body
                        )
                    )

                    if push_success:

                        push_notifications_sent += 1

                        logger.info(
                            f"FCM push notification sent "
                            f"successfully for alert "
                            f"{alert.get('id')}"
                        )

                    else:

                        logger.error(
                            f"FCM push notification failed "
                            f"for alert "
                            f"{alert.get('id')}: "
                            f"{push_result}"
                        )

            except Exception as e:

                logger.exception(
                    f"Unexpected error while sending "
                    f"FCM notification for alert "
                    f"{alert.get('id')}: {e}"
                )

        # ---------------------------------------------------------
        # 9. Final summary
        # ---------------------------------------------------------
        summary_msg = (
            f"Alerts check completed. "
            f"{notifications_sent} email notifications sent "
            f"and {push_notifications_sent} push notifications sent."
        )

        logger.info(
            f"=== Alerts Check Summary: "
            f"{summary_msg} ==="
        )

        return True, summary_msg