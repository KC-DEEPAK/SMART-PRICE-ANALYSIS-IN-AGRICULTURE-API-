from flask import Blueprint, jsonify, request

from services.api_service import APIService
from services.alert_service import AlertService
from services.price_service import PriceService
from services.push_service import PushService
from services.seed_service import SeedService
from services.user_service import UserService
from services.crop_price_service import CropPriceCollectorService

from datetime import datetime

# Create the main Blueprint
main_bp = Blueprint("main", __name__)

@main_bp.route("/api/data", methods=["GET"])
def get_all_data():
    """
    Central API endpoint returning ALL normalized crop price records.
    Used by Dashboard, Price List, Comparison, Map, Smart Sell, etc.
    """
    status, records, source = CropPriceCollectorService.run_data_collection(force_refresh=False)
    
    normalized_list = []
    for idx, r in enumerate(records, 1):
        cat = CropPriceCollectorService.categorize_crop(r["crop"])
        normalized_list.append({
            "id": f"{r['crop']}_{r['market']}_{r['date']}_{idx}",
            "crop": r["crop"],
            "Commodity": r["crop"],
            "commodity": r["crop"],
            "Crop": r["crop"],
            "crop_name": r["crop"],
            "category": cat,
            "Category": cat,
            "state": r["state"],
            "State": r["state"],
            "district": r["district"],
            "District": r["district"],
            "market": r["market"],
            "Market": r["market"],
            "min_price": r["min_price"],
            "Min_x0020_Price": r["min_price"],
            "max_price": r["max_price"],
            "Max_x0020_Price": r["max_price"],
            "modal_price": r["modal_price"],
            "Modal_x0020_Price": r["modal_price"],
            "unit": r.get("unit", "quintal"),
            "date": r["date"],
            "Arrival_Date": r["date"],
            "source": source,
            "_source": source,
            "source_url": "https://agmarknet.gov.in",
            "data_status": status
        })
    return jsonify(normalized_list), 200

@main_bp.route("/api/crops", methods=["GET"])
def get_available_crops():
    """
    Return all available crops collected from the external data collection pipeline.
    """
    crops_data = CropPriceCollectorService.get_available_crops()
    return jsonify(crops_data), 200

@main_bp.route("/api/prices", methods=["GET"])
def get_crop_prices():
    """
    Search crop market prices collected via external scraper / backend pipeline.
    Query params:
        crop: Crop name (e.g. Tomato, Groundnut, Onion, or 'all')
        state: State name (optional, e.g. Karnataka)
        refresh: Optional boolean to force live scrape ('true')
    """
    crop_query = request.args.get("crop", "").strip()
    state_query = request.args.get("state", "").strip() or None
    force_refresh = request.args.get("refresh", "false").lower() == "true"

    if not crop_query or crop_query.lower() == "all":
        return get_all_data()

    response_data = CropPriceCollectorService.get_prices(
        crop_query=crop_query,
        state_query=state_query,
        force_refresh=force_refresh
    )

    return jsonify(response_data), 200

@main_bp.route("/api/markets", methods=["GET"])
def get_markets():
    """
    Returns unique market list and market records filtered by optional crop.
    """
    crop_query = request.args.get("crop", "").strip()
    status, records, source = CropPriceCollectorService.run_data_collection(force_refresh=False)
    
    if crop_query and crop_query.lower() != "all":
        norm_crop = CropPriceCollectorService.normalize_crop_name(crop_query)
        records = [r for r in records if r["crop"].lower() == norm_crop.lower()]
        
    unique_markets = sorted(list(set(r["market"] for r in records)))
    return jsonify({
        "count": len(unique_markets),
        "markets": unique_markets,
        "records": records,
        "data_status": status
    }), 200

@main_bp.route("/api/data-status", methods=["GET"])
def get_central_data_status():
    """
    Returns data collection & storage status metadata for UI status badges.
    """
    status, records, source = CropPriceCollectorService.run_data_collection(force_refresh=False)
    crops_info = CropPriceCollectorService.get_available_crops()
    unique_markets = len(set(r["market"] for r in records))
    
    return jsonify({
        "data_status": status,
        "last_updated": datetime.now().strftime("%Y-%m-%d"),
        "last_successful_update": CropPriceCollectorService._last_successful_update,
        "source": source,
        "total_crops": crops_info["count"],
        "total_markets": unique_markets,
        "total_records": len(records),
        "categories": crops_info["categories"]
    }), 200

@main_bp.route("/api/debug/data-flow", methods=["GET"])
def get_debug_data_flow():
    """
    Admin & Demonstration endpoint for project guide presentation.
    Prints structured data flow logs to console and returns JSON audit report.
    """
    status, records, source = CropPriceCollectorService.run_data_collection(force_refresh=False)
    crops_info = CropPriceCollectorService.get_available_crops()
    unique_markets = len(set(r["market"] for r in records))
    
    scraper_status = "SUCCESS" if records else "FAILED"
    stored_records = len(records)
    
    console_log = f"""
========================================
KRISHI MITRA DATA COLLECTION
========================================
Source: {source}
Status: {scraper_status}
Crops collected: {crops_info['count']}
Markets collected: {unique_markets}
Records collected: {stored_records}
Stored successfully: YES
Last updated: {datetime.now().strftime("%Y-%m-%d")}
Frontend status: {status.upper()}
========================================
"""
    print(console_log)
    
    return jsonify({
        "source": source,
        "scraper_status": scraper_status,
        "last_scraping_attempt": CropPriceCollectorService._last_attempt_time or datetime.now().isoformat(),
        "last_successful_scraping_time": CropPriceCollectorService._last_successful_update,
        "number_of_crops": crops_info["count"],
        "number_of_markets": unique_markets,
        "number_of_records": stored_records,
        "storage_status": "stored_successfully",
        "current_frontend_data_status": status,
        "console_log": console_log
    }), 200

@main_bp.route("/api/prices/refresh", methods=["POST"])
def refresh_crop_prices():
    """
    Manual trigger endpoint to initiate live data collection for demonstration.
    """
    data = request.get_json() or {}
    crop_query = data.get("crop") or request.args.get("crop", "Tomato")
    state_query = data.get("state") or request.args.get("state")

    response_data = CropPriceCollectorService.get_prices(
        crop_query=crop_query,
        state_query=state_query,
        force_refresh=True
    )

    return jsonify({
        "success": True,
        "message": "Manual data collection completed.",
        "result": response_data
    }), 200

@main_bp.route("/api/prices/status", methods=["GET"])
def get_prices_status():
    """
    Admin / Debug endpoint returning current scraper and database status.
    """
    status = CropPriceCollectorService.get_collector_status()
    return jsonify(status), 200





@main_bp.route("/api/chat", methods=["POST"])
def chat():
    """
    Handle chat queries via Gemini API.
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400

        message = data.get("message", "").strip()
        crop_price_data = data.get("cropPriceData", [])

        if not message:
            return jsonify({
                "success": False,
                "error": "Message cannot be empty"
            }), 400

        reply, status_code, error = APIService.get_gemini_chat_response(
            message,
            crop_price_data
        )

        if error:
            return jsonify({
                "success": False,
                "error": error
            }), status_code

        return jsonify({
            "success": True,
            "reply": reply
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Server error: {str(e)}"
        }), 500


# ============================================================
# PRICE ALERTS
# ============================================================

@main_bp.route("/api/alerts", methods=["GET"])
def get_alerts():

    user_id = request.headers.get("x-clerk-user-id")

    if not user_id:
        return jsonify({
            "success": False,
            "error": "Unauthorized"
        }), 401

    alerts, error = AlertService.get_alerts(user_id)

    if error:
        return jsonify({
            "success": False,
            "error": error
        }), 500

    return jsonify({
        "success": True,
        "alerts": alerts
    })


@main_bp.route("/api/alerts", methods=["POST"])
def add_alert():

    user_id = request.headers.get("x-clerk-user-id")

    if not user_id:
        return jsonify({
            "success": False,
            "error": "Unauthorized"
        }), 401

    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "error": "No data provided"
        }), 400

    user_name = data.get("user_name", "Farmer")
    email = data.get("email")
    crop = data.get("crop")

    try:
        target_price = float(data.get("target_price", 0))
    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "error": "Invalid price"
        }), 400

    notification_enabled = data.get(
        "notification_enabled",
        True
    )

    if not email or not crop:
        return jsonify({
            "success": False,
            "error": "Email and Crop are required"
        }), 400

    success, result = AlertService.add_alert(
        user_id,
        user_name,
        email,
        crop,
        target_price,
        notification_enabled
    )

    if success:
        return jsonify({
            "success": True,
            "message": result
        })

    return jsonify({
        "success": False,
        "error": result
    }), 500


@main_bp.route("/api/alerts/<int:alert_id>", methods=["DELETE"])
def delete_alert(alert_id):

    user_id = request.headers.get("x-clerk-user-id")

    if not user_id:
        return jsonify({
            "success": False,
            "error": "Unauthorized"
        }), 401

    success, error = AlertService.delete_alert(
        alert_id,
        user_id
    )

    if success:
        return jsonify({
            "success": True,
            "message": "Alert deleted"
        })

    return jsonify({
        "success": False,
        "error": error
    }), 500


@main_bp.route("/api/check-alerts", methods=["POST"])
def check_alerts():
    """Trigger checking crop prices against alerts."""

    success, msg = PriceService.check_alerts_and_notify()

    if success:
        return jsonify({
            "success": True,
            "message": msg
        })

    return jsonify({
        "success": False,
        "error": msg
    }), 500


# ============================================================
# FCM DEVICE TOKEN REGISTRATION
# ============================================================

@main_bp.route("/api/register-device", methods=["POST"])
def register_device():
    """
    Register an FCM device token for the logged-in user.

    Frontend sends:

        Header:
            x-clerk-user-id

        JSON:
            {
                "fcm_token": "FCM_DEVICE_TOKEN"
            }
    """

    user_id = request.headers.get("x-clerk-user-id")

    if not user_id:
        return jsonify({
            "success": False,
            "error": "Unauthorized: Clerk user ID is missing"
        }), 401

    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "error": "No data provided"
        }), 400

    fcm_token = data.get("fcm_token")

    if not fcm_token:
        return jsonify({
            "success": False,
            "error": "FCM token is required"
        }), 400

    success, message = PushService.save_token(
        user_id,
        fcm_token
    )

    if success:
        return jsonify({
            "success": True,
            "message": message
        }), 200

    return jsonify({
        "success": False,
        "error": message
    }), 500


# ============================================================
# SEED VARIETY RECOMMENDATIONS
# ============================================================

@main_bp.route("/api/seed-recommendations", methods=["GET"])
def get_seed_recommendations():
    """
    Get recommended seed varieties based on crop and optional state/season.
    Query params:
        crop: Crop name (e.g. Paddy, Wheat, Tomato, Cotton, etc.)
        state: State name (optional)
        season: Season name (optional)
    """
    crop = request.args.get("crop", "").strip()
    state = request.args.get("state", "").strip()
    season = request.args.get("season", "").strip()

    if not crop:
        return jsonify({
            "success": False,
            "error": "Crop parameter is required (e.g. ?crop=Tomato)"
        }), 400

    result = SeedService.get_recommendations(
        crop_query=crop,
        state_query=state if state else None,
        season_query=season if season else None
    )

    return jsonify(result), 200


@main_bp.route("/api/seed-recommendations/meta", methods=["GET"])
def get_seed_meta():
    """Get metadata list of available crops and states for frontend filters."""
    meta = SeedService.get_metadata()
    return jsonify({
        "success": True,
        **meta
    }), 200


# ============================================================
# USER SYNCHRONIZATION & ADMIN PORTAL APIS
# ============================================================

@main_bp.route("/api/user/sync", methods=["POST"])
def sync_user():
    """
    Synchronize authenticated Clerk user information with local backend.
    """
    user_id = request.headers.get("x-clerk-user-id")
    if not user_id:
        return jsonify({
            "success": False,
            "error": "Unauthorized: Clerk user ID is missing"
        }), 401

    data = request.get_json() or {}
    name = data.get("name") or request.headers.get("x-clerk-user-name") or "Farmer"
    email = data.get("email") or request.headers.get("x-clerk-user-email") or ""

    success, result = UserService.sync_user(user_id, name, email)

    if success:
        return jsonify({
            "success": True,
            "is_admin": UserService.is_admin_email(email),
            "user": result
        }), 200

    return jsonify({
        "success": False,
        "error": str(result)
    }), 500


@main_bp.route("/api/admin/check", methods=["GET"])
def check_admin():
    """
    Verify whether the current Clerk user is authorized as an Admin.
    """
    is_admin, error_or_id, status_code = UserService.verify_admin_request(request)

    if not is_admin:
        return jsonify({
            "success": False,
            "error": error_or_id
        }), status_code

    return jsonify({
        "success": True,
        "is_admin": True,
        "admin_email": UserService.get_admin_email()
    }), 200


@main_bp.route("/api/admin/stats", methods=["GET"])
def get_admin_stats():
    """
    Get summary metrics for Admin Dashboard.
    Protected: Admin access required.
    """
    is_admin, error_or_id, status_code = UserService.verify_admin_request(request)

    if not is_admin:
        return jsonify({
            "success": False,
            "error": error_or_id
        }), status_code

    stats = UserService.get_admin_stats()

    return jsonify({
        "success": True,
        "stats": stats
    }), 200


@main_bp.route("/api/admin/users", methods=["GET"])
def get_admin_users():
    """
    Get list of registered farmers / users.
    Protected: Admin access required.
    Supports ?q= search parameter.
    """
    is_admin, error_or_id, status_code = UserService.verify_admin_request(request)

    if not is_admin:
        return jsonify({
            "success": False,
            "error": error_or_id
        }), status_code

    query = request.args.get("q", "").strip()
    users = UserService.get_all_users(search_query=query)

    return jsonify({
        "success": True,
        "users": users,
        "count": len(users)
    }), 200
