import os
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
CACHE_FILE = os.path.join(DATA_DIR, "price_cache.json")
TMP_CACHE_FILE = os.path.join(DATA_DIR, "price_cache.json.tmp")
MASTER_FILE = os.path.join(DATA_DIR, "master_crop_prices.json")
TMP_MASTER_FILE = os.path.join(DATA_DIR, "master_crop_prices.json.tmp")
FALLBACK_FILE = os.path.join(DATA_DIR, "fallback_crop_prices.json")


class PriceCacheService:
    """Service to handle persistent master data, caching, and multi-tier merging for crop market prices."""

    @staticmethod
    def _normalize_key(record):
        """Generates a unique composite key for duplicate detection."""
        state = str(record.get("State") or record.get("state") or "").strip().lower()
        district = str(record.get("District") or record.get("district") or "").strip().lower()
        market = str(record.get("Market") or record.get("market") or "").strip().lower()
        commodity = str(record.get("Commodity") or record.get("commodity") or record.get("Crop") or "").strip().lower()
        variety = str(record.get("Variety") or record.get("variety") or "").strip().lower()
        grade = str(record.get("Grade") or record.get("grade") or "").strip().lower()
        arrival_date = str(record.get("Arrival_Date") or record.get("arrival_date") or "").strip().lower().replace("-", "/")
        return (state, district, market, commodity, variety, grade, arrival_date)

    @staticmethod
    def clean_record(record, default_source="historical"):
        """Validates and formats a single market price record."""
        commodity = str(record.get("Commodity") or record.get("commodity") or record.get("Crop") or "").strip()
        market = str(record.get("Market") or record.get("market") or "").strip()

        if not commodity or not market:
            return None

        def to_num(val):
            try:
                return float(val)
            except (ValueError, TypeError):
                return 0.0

        min_price = to_num(record.get("Min_x0020_Price", record.get("min_price", 0)))
        max_price = to_num(record.get("Max_x0020_Price", record.get("max_price", 0)))
        modal_price = to_num(record.get("Modal_x0020_Price", record.get("modal_price", 0)))

        return {
            "State": str(record.get("State") or record.get("state") or "").strip(),
            "District": str(record.get("District") or record.get("district") or "").strip(),
            "Market": market,
            "Commodity": commodity,
            "Variety": str(record.get("Variety") or record.get("variety") or "Standard").strip(),
            "Grade": str(record.get("Grade") or record.get("grade") or "FAQ").strip(),
            "Arrival_Date": str(record.get("Arrival_Date") or record.get("arrival_date") or "").strip(),
            "Min_x0020_Price": min_price,
            "Max_x0020_Price": max_price,
            "Modal_x0020_Price": modal_price,
            "_source": str(record.get("_source") or default_source).strip()
        }

    @staticmethod
    def merge_datasets(live_records=None, master_records=None, fallback_records=None):
        """
        Merges Live + Master + Fallback datasets.
        Live records have priority over older records for matching composite keys.
        Preserves all distinct market records (e.g. Tomato at Bangalore vs Tomato at Mysore).
        """
        merged_dict = {}

        # 1. Fallback dataset (lowest priority)
        if fallback_records and isinstance(fallback_records, list):
            for r in fallback_records:
                cr = PriceCacheService.clean_record(r, default_source="fallback")
                if cr:
                    key = PriceCacheService._normalize_key(cr)
                    merged_dict[key] = cr

        # 2. Master / Cache dataset (medium priority)
        if master_records and isinstance(master_records, list):
            for r in master_records:
                cr = PriceCacheService.clean_record(r, default_source="historical")
                if cr:
                    key = PriceCacheService._normalize_key(cr)
                    merged_dict[key] = cr

        # 3. Live dataset (highest priority)
        if live_records and isinstance(live_records, list):
            for r in live_records:
                cr = PriceCacheService.clean_record(r, default_source="live")
                if cr:
                    key = PriceCacheService._normalize_key(cr)
                    merged_dict[key] = cr

        final_list = list(merged_dict.values())
        return final_list

    @staticmethod
    def get_master():
        """Load master historical dataset from master_crop_prices.json."""
        if not os.path.exists(MASTER_FILE):
            return []
        try:
            with open(MASTER_FILE, "r", encoding="utf-8-sig") as f:
                data = json.load(f)
            if isinstance(data, list):
                return data
            elif isinstance(data, dict) and "data" in data:
                return data.get("data", [])
        except Exception as e:
            logger.error(f"[MASTER] Error reading master_crop_prices.json: {e}")
        return []

    @staticmethod
    def save_master(data):
        """Save merged list atomically to master_crop_prices.json."""
        if not data or not isinstance(data, list) or len(data) == 0:
            logger.warning("[MASTER] Attempted to save empty data to master. Aborted.")
            return False
        try:
            os.makedirs(DATA_DIR, exist_ok=True)
            with open(TMP_MASTER_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            os.replace(TMP_MASTER_FILE, MASTER_FILE)
            logger.info(f"[MASTER] Updated master_crop_prices.json with {len(data)} total records.")
            return True
        except Exception as e:
            logger.error(f"[MASTER] Error saving master_crop_prices.json: {e}")
            if os.path.exists(TMP_MASTER_FILE):
                try:
                    os.remove(TMP_MASTER_FILE)
                except Exception:
                    pass
            return False

    @staticmethod
    def save_cache(data, source="data.gov.in"):
        """Save successful crop price data to persistent price_cache.json atomically."""
        if not data or not isinstance(data, list) or len(data) == 0:
            logger.warning("[CACHE] Attempted to save empty data to cache. Aborted.")
            return False

        try:
            os.makedirs(DATA_DIR, exist_ok=True)
            cache_payload = {
                "fetched_at": datetime.now().isoformat(),
                "source": source,
                "record_count": len(data),
                "data": data
            }

            with open(TMP_CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(cache_payload, f, indent=2, ensure_ascii=False)

            os.replace(TMP_CACHE_FILE, CACHE_FILE)
            logger.info(f"[CACHE] Saved {len(data)} records to price_cache.json")
            return True
        except Exception as e:
            logger.error(f"[CACHE] Error writing to price_cache.json: {e}")
            if os.path.exists(TMP_CACHE_FILE):
                try:
                    os.remove(TMP_CACHE_FILE)
                except Exception:
                    pass
            return False

    @staticmethod
    def get_cache():
        """Load cached crop price data from persistent JSON file if valid."""
        if not os.path.exists(CACHE_FILE):
            return None

        try:
            with open(CACHE_FILE, "r", encoding="utf-8-sig") as f:
                payload = json.load(f)

            if isinstance(payload, dict) and "data" in payload:
                cached_records = payload.get("data")
                if cached_records and isinstance(cached_records, list) and len(cached_records) > 0:
                    return cached_records
        except Exception as e:
            logger.error(f"[CACHE] Error reading price_cache.json: {e}")

        return None

    @staticmethod
    def get_cache_info():
        """Load cache metadata."""
        if not os.path.exists(CACHE_FILE):
            return None

        try:
            with open(CACHE_FILE, "r", encoding="utf-8-sig") as f:
                payload = json.load(f)

            if isinstance(payload, dict) and "data" in payload:
                return {
                    "fetched_at": payload.get("fetched_at", ""),
                    "source": payload.get("source", "price_cache.json"),
                    "record_count": len(payload.get("data", []))
                }
        except Exception as e:
            logger.error(f"[CACHE] Error reading cache metadata: {e}")

        return None

    @staticmethod
    def get_fallback():
        """Load static fallback crop price dataset."""
        if not os.path.exists(FALLBACK_FILE):
            return None

        try:
            with open(FALLBACK_FILE, "r", encoding="utf-8-sig") as f:
                data = json.load(f)

            if data and isinstance(data, list) and len(data) > 0:
                return data
        except Exception as e:
            logger.error(f"[FALLBACK] Error reading fallback_crop_prices.json: {e}")

        return None
