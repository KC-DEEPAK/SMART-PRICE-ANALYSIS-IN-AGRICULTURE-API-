import requests
import time
import os
import logging
from config import Config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class APIService:
    """Service to handle fetching API data and communicating with Gemini."""
    
    # Static cache to store API data based on CACHE_TIMEOUT
    _cache = {
        "data": None,
        "timestamp": 0
    }

    @staticmethod
    def clear_cache():
        """Helper method to invalidate in-memory cache."""
        APIService._cache["data"] = None
        APIService._cache["timestamp"] = 0
        logger.info("APIService cache invalidated.")

    @staticmethod
    def fetch_live_crop_prices(force_refresh=False):
        """
        Fetch live crop prices from data.gov.in API.
        Uses in-memory caching to avoid repeated API calls.
        """
        # Check cache validity
        if not force_refresh and APIService._cache["data"] is not None:
            if time.time() - APIService._cache["timestamp"] < Config.CACHE_TIMEOUT:
                logger.info("Returning cached crop prices.")
                return APIService._cache["data"], None
                
        api_key = Config.DATA_GOV_API_KEY
        resource_id = Config.DATA_GOV_RESOURCE_ID
        
        if not api_key:
            return None, "DATA_GOV_API_KEY is not configured on the server."
            
        url = f"https://api.data.gov.in/resource/{resource_id}"
        
        # We request 500 records to provide a good dataset.
        # Limit adjusted to 500 to keep the response snappy.
        params = {
            "api-key": api_key,
            "format": "json",
            "limit": int(os.getenv("LIMIT_PER_CROP", 500))
        }
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        
        try:
            logger.info("Fetching live data from data.gov.in API...")
            response = requests.get(url, params=params, headers=headers, timeout=20)
            response.raise_for_status()
            
            data = response.json()
            
            if not data or "records" not in data:
                return None, "Received invalid or empty response format from Government API."
                
            records = data.get("records", [])
            if not records:
                return None, "No active market records are available right now."
                
            # Transform to match frontend's expected JSON structure (which matches the old CSV)
            transformed_data = []
            for record in records:
                transformed_data.append({
                    "State": record.get("state", ""),
                    "District": record.get("district", ""),
                    "Market": record.get("market", ""),
                    "Commodity": record.get("commodity", ""),
                    "Variety": record.get("variety", ""),
                    "Grade": record.get("grade", ""),
                    "Arrival_Date": record.get("arrival_date", ""),
                    "Min_x0020_Price": record.get("min_price", 0),
                    "Max_x0020_Price": record.get("max_price", 0),
                    "Modal_x0020_Price": record.get("modal_price", 0)
                })
                
            # Update cache with new data
            APIService._cache["data"] = transformed_data
            APIService._cache["timestamp"] = time.time()
            logger.info(f"Successfully fetched and cached {len(transformed_data)} crop price records.")
            
            return transformed_data, None
            
        except requests.exceptions.Timeout:
            return None, "Government API request timed out."
        except requests.exceptions.ConnectionError:
            return None, "Government API is currently unavailable."
        except requests.exceptions.RequestException as e:
            return None, f"Error fetching from Government API: {str(e)}"
        except Exception as e:
            return None, f"An unexpected error occurred: {str(e)}"

    @staticmethod
    def get_gemini_chat_response(message, crop_price_data):
        """
        Request AI response from Gemini based on user message and active market prices context.
        """
        gemini_key = Config.GEMINI_API_KEY
        if not gemini_key:
            return None, 500, "Gemini API key is not configured on the server"
            
        # Format crop price data for AI context, limits subset to save token consumption.
        top_prices = "No price data available."
        if crop_price_data and isinstance(crop_price_data, list):
            top_prices = ", ".join([
                f"{d.get('Commodity', 'Unknown')}: ₹{d.get('Modal_x0020_Price', '0')} at {d.get('Market', 'Unknown')}"
                for d in crop_price_data[:15]
            ])
            
        system_prompt = f"""You are a Smart Farmer Assistant, an AI expert in agriculture. 
You provide advice on crop prices, diseases, fertilizers, and general farming tips.
Be concise, helpful, and use simple language suitable for farmers.

Here is some current market price data for context:
{top_prices}

Please answer the following user question:"""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
        
        try:
            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": f"{system_prompt}\n\nUser Question: {message}"}]
                    }
                ]
            }
            response = requests.post(
                url, 
                json=payload, 
                headers={"Content-Type": "application/json"}, 
                timeout=15
            )
            
            if response.status_code != 200:
                try:
                    error_details = response.json()
                    error_msg = error_details.get("error", {}).get("message", "Unknown Gemini API error")
                except Exception:
                    error_msg = response.text
                return None, response.status_code, f"Gemini API error: {error_msg}"
                
            res_data = response.json()
            if res_data.get("candidates") and len(res_data["candidates"]) > 0:
                text_response = res_data["candidates"][0]["content"]["parts"][0]["text"]
                return text_response, 200, None
                
            return None, 500, "No response candidates returned from Gemini"
            
        except Exception as e:
            return None, 500, f"Server error while contacting Gemini API: {str(e)}"
