# pyrefly: ignore [missing-import]
import resend
from config import Config
import logging

logger = logging.getLogger(__name__)

# Initialize resend API key safely
try:
    if Config.RESEND_API_KEY:
        resend.api_key = Config.RESEND_API_KEY
except:
    pass

class EmailService:
    @staticmethod
    def send_price_alert(user_name, email, crop, price, market, state):
        """Sends a price alert email using Resend"""
        api_key = getattr(Config, 'RESEND_API_KEY', None)
        if not api_key or str(api_key).strip() in ["", "re_YOUR_RESEND_API_KEY_HERE"]:
            logger.error("RESEND_API_KEY is not configured or is set to placeholder.")
            return False, "RESEND_API_KEY is not configured or is set to a placeholder."
            
        if not email or "@" not in str(email):
            logger.error(f"Invalid recipient email address: '{email}'")
            return False, f"Invalid recipient email address: {email}"

        # Assign API key to resend library before sending
        resend.api_key = str(api_key).strip()

        subject = "🌾 Smart Crop Price Alert"
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #2e7d32;">🌾 Smart Crop Price Alert</h2>
            <p>Hello <strong>{user_name}</strong>,</p>
            <p>Today's price for <strong>{crop}</strong> is <strong>₹{price}</strong>.</p>
            <div style="background-color: #f1f8e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Best Market:</strong> {market}</p>
                <p style="margin: 5px 0;"><strong>State:</strong> {state}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <span style="background-color: #4caf50; color: white; padding: 10px 20px; border-radius: 5px; font-weight: bold;">
                    ✅ SELL NOW
                </span>
            </div>
            <p style="color: #666; font-size: 14px; text-align: center;">
                Thank you for using Smart Crop Price Analysis.
            </p>
        </div>
        """
        
        try:
            params = {
                "from": "Smart Crop <onboarding@resend.dev>", 
                "to": [str(email).strip()],
                "subject": subject,
                "html": html_content
            }
            
            logger.info(f"Attempting to send email via Resend to {email}...")
            response = resend.Emails.send(params)
            logger.info(f"Resend API Response for {email}: {response}")
            return True, response
        except Exception as e:
            logger.error(f"Failed to send email via Resend to {email}: {str(e)}")
            return False, str(e)
