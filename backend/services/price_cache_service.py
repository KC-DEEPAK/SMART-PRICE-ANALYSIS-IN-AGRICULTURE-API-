import os
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
CACHE_FILE = os.path.join(DATA_DIR, "price_cache.json")
FALLBACK_FILE = os.path.join(DATA_DIR, "fallback_crop_prices.json")


class PriceCacheService:
    """Service to handle persistent caching and fallback loading for crop market prices."""

    @staticmethod
    def save_cache(data, source="data.gov.in"):
        """
        Save successful crop price data to persistent JSON cache file.
        Validates data before saving to prevent overwriting valid cache with empty/invalid data.
        """
        if not data or not isinstance(data, list) or len(data) == 0:
            logger.warning("[CACHE] Attempted to save invalid/empty data to cache. Overwrite aborted.")
            return False

        try:
            os.makedirs(DATA_DIR, exist_ok=True)
            cache_payload = {
                "fetched_at": datetime.now().isoformat(),
                "source": source,
                "data": data
            }

            # Write atomically to cache file
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(cache_payload, f, indent=2, ensure_ascii=False)

            logger.info(f"[CACHE] Latest successful price data saved ({len(data)} records)")
            return True
        except Exception as e:
            logger.error(f"[CACHE] Error writing to price_cache.json: {e}")
            return False

    @staticmethod
    def get_cache():
        """
        Load cached crop price data from persistent JSON file if valid.
        Returns list of price records or None.
        """
        if not os.path.exists(CACHE_FILE):
            return None

        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                payload = json.load(f)

            if isinstance(payload, dict) and "data" in payload:
                cached_records = payload.get("data")
                if cached_records and isinstance(cached_records, list) and len(cached_records) > 0:
                    return cached_records
        except Exception as e:
            logger.error(f"[CACHE] Error reading price_cache.json: {e}")

        return None

    @staticmethod
    def get_fallback():
        """
        Load existing static fallback crop price dataset.
        Returns list of price records or None.
        """
        if not os.path.exists(FALLBACK_FILE):
            return None

        try:
            with open(FALLBACK_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)

            if data and isinstance(data, list) and len(data) > 0:
                return data
        except Exception as e:
            logger.error(f"[FALLBACK] Error reading fallback_crop_prices.json: {e}")

        return None
