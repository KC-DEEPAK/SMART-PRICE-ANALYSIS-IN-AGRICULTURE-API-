from flask import Blueprint, jsonify, request

from services.api_service import APIService
from services.alert_service import AlertService
from services.price_service import PriceService
from services.push_service import PushService
from services.seed_service import SeedService
from services.user_service import UserService


# Create the main Blueprint
main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def home():
    """Health check route."""
    return "Backend is running successfully 🚜 (Live Government API Version)"


@main_bp.route("/api/data", methods=["GET"])
def get_data():
    """
    Fetch and return live crop prices from data.gov.in API with cache/fallback resiliency.
    """
    data, error = APIService.fetch_live_crop_prices()

    if not data and error:
        return jsonify([]), 500

    return jsonify(data)



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
