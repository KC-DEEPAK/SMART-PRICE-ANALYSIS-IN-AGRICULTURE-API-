import logging
from services.api_service import APIService
from services.alert_service import AlertService
from services.email_service import EmailService

logger = logging.getLogger(__name__)

class PriceService:
    @staticmethod
    def check_alerts_and_notify():
        """
        Fetches live crop prices and checks against all active alerts.
        Sends email notification if Today's Price >= Target Price.
        """
        logger.info("Checking alerts against current market prices...")
        data, error = APIService.fetch_live_crop_prices()
        
        if error or not data:
            logger.error(f"Error fetching prices for alerts check: {error}")
            return False, "Failed to fetch prices"
            
        # Structure data for easy lookup finding the max price for each crop
        crop_highest_prices = {}
        for item in data:
            commodity = item.get("commodity", "").lower()
            try:
                min_p = float(item.get("min_price", 0))
                max_p = float(item.get("max_price", 0))
                modal_p = float(item.get("modal_price", 0))
                price = max(min_p, max_p, modal_p)
            except (ValueError, TypeError):
                continue
                
            if commodity not in crop_highest_prices or price > crop_highest_prices[commodity]["price"]:
                crop_highest_prices[commodity] = {
                    "price": price,
                    "market": item.get("market", "Unknown Market"),
                    "state": item.get("state", "Unknown State"),
                    "commodity_display": item.get("commodity", "")
                }
                
        # Get active alerts
        alerts, error = AlertService.get_all_active_alerts()
        if error:
            logger.error(f"Error fetching active alerts: {error}")
            return False, error
            
        notifications_sent = 0
        for alert in alerts:
            alert_crop = alert.get("crop", "").lower()
            target_price = alert.get("target_price", 0)
            
            if alert_crop in crop_highest_prices:
                current_market_data = crop_highest_prices[alert_crop]
                current_price = current_market_data["price"]
                
                if current_price >= target_price:
                    # Condition met, send email!
                    logger.info(f"Condition met for {alert.get('email')} for crop {alert.get('crop')} (Target: {target_price}, Actual: {current_price})")
                    success, msg = EmailService.send_price_alert(
                        user_name=alert.get("user_name", "User"),
                        email=alert.get("email"),
                        crop=current_market_data["commodity_display"],
                        price=current_price,
                        market=current_market_data["market"],
                        state=current_market_data["state"]
                    )
                    
                    if success:
                        notifications_sent += 1
                        
        return True, f"Alerts check completed. {notifications_sent} notifications sent."
