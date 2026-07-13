import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Application configuration and environment variables."""
    # Data.gov.in API Key
    DATA_GOV_API_KEY = os.getenv("DATA_GOV_API_KEY")
    
    # Resource ID for live crop market prices (Daily)
    # 9ef84268-d588-465a-a308-a864a43d0070 is the well-known daily market prices resource index
    DATA_GOV_RESOURCE_ID = os.getenv("API_URL", "9ef84268-d588-465a-a308-a864a43d0070")
    
    # Gemini AI API Key for the chatbot
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    
    # Port to run the application on
    PORT = int(os.getenv("PORT", 5000))
    
    # Cache duration for API responses (in seconds)
    # Default is 3600 seconds (1 hour) to balance freshness and API limits
    CACHE_TIMEOUT = 3600
    
    # Email and Auth Configurations
    RESEND_API_KEY = os.getenv("RESEND_API_KEY")
    CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")

