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
            r"/api/*": {
                "origins": [
                    "https://localhost",
                    "http://localhost",
                    "http://127.0.0.1:5000",
                    "http://localhost:3000"
                ],
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

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "ok",
            "message": "Krishi Mitra backend is running"
        }), 200

    return app


app = create_app()


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=Config.PORT,
        debug=True
    )