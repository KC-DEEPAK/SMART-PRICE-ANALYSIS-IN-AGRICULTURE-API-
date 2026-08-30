from flask import Flask
from flask_cors import CORS
from config import Config
from routes import main_bp
import logging

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


def create_app():
    """
    Application factory pattern to create and configure the Flask app.
    """
    app = Flask(__name__)

    # ---------------------------------------------------------
    # CORS CONFIGURATION
    # ---------------------------------------------------------
    # Capacitor Android WebView uses https://localhost as origin.
    # Allow both localhost and normal web requests.
    CORS(
        app,
        resources={
            r"/*": {
                "origins": [
                    "https://localhost",
                    "http://localhost",
                    "http://localhost:3000",
                    "http://localhost:5173",
                    "https://smart-price-analysis-in-agriculture-api.onrender.com"
                ],
                "methods": [
                    "GET",
                    "POST",
                    "PUT",
                    "PATCH",
                    "DELETE",
                    "OPTIONS"
                ],
                "allow_headers": [
                    "Content-Type",
                    "Authorization",
                    "Accept",
                    "Origin",
                    "X-Requested-With"
                ],
                "supports_credentials": True
            }
        }
    )

    # ---------------------------------------------------------
    # REGISTER BLUEPRINTS
    # ---------------------------------------------------------
    app.register_blueprint(main_bp)

    return app


# Application instance for Render / WSGI
app = create_app()


if __name__ == "__main__":
    # Run locally
    app.run(
        host="0.0.0.0",
        port=Config.PORT,
        debug=True
    )