from flask import Flask
from flask_cors import CORS
from config import Config
from routes import main_bp
import logging

# Configure basic logging for the backend application
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def create_app():
    """
    Application factory pattern to create and configure the Flask app.
    """
    app = Flask(__name__)
    
    # Enable Cross-Origin Resource Sharing (CORS) for all routes
    CORS(app)
    
    # Register blueprints (routing)
    app.register_blueprint(main_bp)
    
    return app

# Application instance for running via WSGI (e.g. Render) or locally
app = create_app()

if __name__ == "__main__":
    # Run the application locally on the configured port
    app.run(host="0.0.0.0", port=Config.PORT, debug=True)
