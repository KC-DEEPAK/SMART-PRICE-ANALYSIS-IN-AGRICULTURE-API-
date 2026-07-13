from flask import Blueprint, jsonify, request
from services.api_service import APIService
from services.alert_service import AlertService
from services.price_service import PriceService


# Create the main Blueprint
main_bp = Blueprint('main', __name__)

@main_bp.route("/")
def home():
    """Health check route."""
    return "Backend is running successfully 🚀 (Live Government API Version)"

@main_bp.route("/api/data", methods=["GET"])
def get_data():
    """
    Fetch and return live crop prices from data.gov.in API.
    The response format mimics the previously used CSV JSON output
    to maintain compatibility with the existing React frontend.
    """
    data, error = APIService.fetch_live_crop_prices()
    
    if error:
        # Returning an empty array to prevent complete frontend crash 
        # or we could return 500. We will return 500 with error log
        # to properly handle API failures on the frontend.
        # Still falling back to empty list just in case.
        return jsonify([]), 500
        
    return jsonify(data)

@main_bp.route("/api/chat", methods=["POST"])
def chat():
    """
    Handle chat queries via Gemini API, provided with current crop market context.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
            
        message = data.get("message", "").strip()
        crop_price_data = data.get("cropPriceData", [])
        
        if not message:
            return jsonify({"success": False, "error": "Message cannot be empty"}), 400
            
        # Get AI response
        reply, status_code, error = APIService.get_gemini_chat_response(message, crop_price_data)
        
        if error:
            return jsonify({"success": False, "error": error}), status_code
            
        return jsonify({"success": True, "reply": reply})

    except Exception as e:
        return jsonify({"success": False, "error": f"Server error: {str(e)}"}), 500

@main_bp.route("/api/alerts", methods=["GET"])
def get_alerts():
    user_id = request.headers.get("x-clerk-user-id")
    if not user_id:
        return jsonify({"success": False, "error": "Unauthorized"}), 401
        
    alerts, error = AlertService.get_alerts(user_id)
    if error:
        return jsonify({"success": False, "error": error}), 500
    return jsonify({"success": True, "alerts": alerts})

@main_bp.route("/api/alerts", methods=["POST"])
def add_alert():
    user_id = request.headers.get("x-clerk-user-id")
    if not user_id:
        return jsonify({"success": False, "error": "Unauthorized"}), 401
        
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "No data provided"}), 400
        
    user_name = data.get("user_name", "Farmer")
    email = data.get("email")
    crop = data.get("crop")
    try:
        target_price = float(data.get("target_price", 0))
    except (ValueError, TypeError):
        return jsonify({"success": False, "error": "Invalid price"}), 400
        
    notification_enabled = data.get("notification_enabled", True)
    
    if not email or not crop:
        return jsonify({"success": False, "error": "Email and Crop are required"}), 400
        
    success, result = AlertService.add_alert(user_id, user_name, email, crop, target_price, notification_enabled)
    if success:
        return jsonify({"success": True, "message": result})
    else:
        return jsonify({"success": False, "error": result}), 500

@main_bp.route("/api/alerts/<int:alert_id>", methods=["DELETE"])
def delete_alert(alert_id):
    user_id = request.headers.get("x-clerk-user-id")
    if not user_id:
        return jsonify({"success": False, "error": "Unauthorized"}), 401
        
    success, error = AlertService.delete_alert(alert_id, user_id)
    if success:
        return jsonify({"success": True, "message": "Alert deleted"})
    else:
        return jsonify({"success": False, "error": error}), 500
        
@main_bp.route("/api/check-alerts", methods=["POST"])
def check_alerts():
    """Trigger checking crop prices against alerts"""
    success, msg = PriceService.check_alerts_and_notify()
    if success:
        return jsonify({"success": True, "message": msg})
    else:
        return jsonify({"success": False, "error": msg}), 500
