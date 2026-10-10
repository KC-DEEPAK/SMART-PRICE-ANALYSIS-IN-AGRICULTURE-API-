import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from routes import main_bp
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


def create_app():
    app = Flask(__name__)

    # Explicit CORS configuration for web + Capacitor Android
    CORS(
        app,
        resources={
            r"/api/.*": {
                "origins": "*",
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": [
                    "Content-Type",
                    "Authorization",
                    "x-clerk-user-id",
                    "x-clerk-user-email"
                ],
            }
        }
    )

    app.register_blueprint(main_bp)

    # Initialize daily background scheduled scraper
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from services.crop_price_service import CropPriceCollectorService
        
        scheduler = BackgroundScheduler()
        # Schedule data collector once daily
        scheduler.add_job(
            func=lambda: CropPriceCollectorService.get_prices(crop_query="Tomato", force_refresh=True),
            trigger="interval",
            hours=24,
            id="daily_crop_price_collector"
        )
        scheduler.start()
        logging.info("[SCHEDULER] Daily crop price data collection scheduler started.")
    except Exception as e:
        logging.warning(f"[SCHEDULER] Background scheduler startup notice: {e}")

    @app.route("/api/health", methods=["GET"])
    def health_check():
        from services.api_service import APIService
        status_info = APIService.get_status_info()
        return jsonify({
            "status": "ok",
            "message": "Krishi Mitra backend is running",
            "data_source": status_info.get("source", "unknown"),
            "record_count": status_info.get("record_count", 0),
            "is_live": status_info.get("is_live", False)
        }), 200


    return app


app = create_app()


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=Config.PORT,
        debug=True
    )