import requests
import time
import os
import logging
from datetime import datetime

from config import Config
from services.price_cache_service import PriceCacheService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class APIService:
    """
    Service for fetching and merging crop market prices.

    Pipeline:
        LIVE DATA (data.gov.in)
            +
        MASTER OLD DATA (master_crop_prices.json / price_cache.json)
            +
        FALLBACK DATA (fallback_crop_prices.json)
            =
        FINAL MERGED DATASET

    Ensures that when data.gov.in returns fewer records or times out,
    older records are never lost, and the application remains 100% operational.
    """

    _cache = {
        "data": None,
        "timestamp": 0
    }

    _active_status = {
        "source": "fallback",
        "record_count": 0,
        "fetched_at": "",
        "is_live": False
    }

    @staticmethod
    def clear_cache():
        APIService._cache["data"] = None
        APIService._cache["timestamp"] = 0
        logger.info("[CACHE] APIService in-memory cache cleared.")

    @staticmethod
    def get_status_info():
        """Returns metadata about the active data source."""
        if not APIService._active_status["fetched_at"]:
            cache_info = PriceCacheService.get_cache_info()
            if cache_info:
                APIService._active_status.update({
                    "source": cache_info.get("source", "cache"),
                    "record_count": cache_info.get("record_count", 0),
                    "fetched_at": cache_info.get("fetched_at", ""),
                    "is_live": False
                })
        return APIService._active_status

    @staticmethod
    def fetch_live_crop_prices(force_refresh=False):

        # ---------------------------------------------------------
        # STEP 0: IN-MEMORY CACHE
        # ---------------------------------------------------------
        if not force_refresh and APIService._cache["data"] is not None:
            age = time.time() - APIService._cache["timestamp"]
            if age < Config.CACHE_TIMEOUT:
                logger.info(
                    f"[CACHE] Returning in-memory data "
                    f"({len(APIService._cache['data'])} records)"
                )
                return APIService._cache["data"], None

        # ---------------------------------------------------------
        # CONFIGURATION
        # ---------------------------------------------------------
        api_key = Config.DATA_GOV_API_KEY
        resource_id = Config.DATA_GOV_RESOURCE_ID
        url = f"https://api.data.gov.in/resource/{resource_id}"

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/91.0.4472.124 Safari/537.36"
            )
        }

        # ---------------------------------------------------------
        # STEP 1: FETCH LIVE GOVERNMENT API DATA
        # ---------------------------------------------------------
        live_fetched_records = []
        is_live_success = False

        if api_key:
            page_limit = int(os.getenv("LIMIT_PER_CROP", 1000))
            max_pages = 5  # Max 5 pages (5,000 records) per fetch loop

            for page in range(max_pages):
                offset = page * page_limit
                params = {
                    "api-key": api_key,
                    "format": "json",
                    "limit": page_limit,
                    "offset": offset
                }

                try:
                    logger.info(f"[LIVE] Requesting data.gov.in (limit={page_limit}, offset={offset})...")
                    response = requests.get(
                        url,
                        params=params,
                        headers=headers,
                        timeout=(3.5, 6.0)
                    )

                    if response.status_code == 200:
                        data = response.json()
                        records = data.get("records", []) if isinstance(data, dict) else []

                        if not records:
                            break

                        for record in records:
                            cleaned = PriceCacheService.clean_record(record, default_source="live")
                            if cleaned:
                                live_fetched_records.append(cleaned)

                        if len(records) < page_limit:
                            break
                    else:
                        logger.warning(f"[LIVE] Government API returned HTTP {response.status_code}")
                        break

                except requests.exceptions.Timeout:
                    logger.warning("[LIVE] Government API timeout.")
                    break
                except requests.exceptions.ConnectionError:
                    logger.warning("[LIVE] Could not connect to data.gov.in.")
                    break
                except Exception as error:
                    logger.warning(f"[LIVE] Government API request error: {error}")
                    break

            if live_fetched_records:
                is_live_success = True
                logger.info(f"[LIVE] Government API returned {len(live_fetched_records)} records")
            else:
                logger.warning("[LIVE] Government API returned 0 records or failed.")
        else:
            logger.warning("[LIVE] DATA_GOV_API_KEY is not configured.")

        # ---------------------------------------------------------
        # STEP 2: LOAD MASTER & FALLBACK DATASETS
        # ---------------------------------------------------------
        master_records = PriceCacheService.get_master()
        if not master_records:
            master_records = PriceCacheService.get_cache() or []
        logger.info(f"[MASTER] Existing master dataset contains {len(master_records)} records")

        fallback_records = PriceCacheService.get_fallback() or []
        logger.info(f"[FALLBACK] Fallback dataset contains {len(fallback_records)} records")

        # ---------------------------------------------------------
        # STEP 3: MERGE DATASETS (LIVE + MASTER + FALLBACK)
        # ---------------------------------------------------------
        final_merged_records = PriceCacheService.merge_datasets(
            live_records=live_fetched_records,
            master_records=master_records,
            fallback_records=fallback_records
        )
        logger.info(f"[MERGE] Final merged dataset contains {len(final_merged_records)} records")

        if not final_merged_records:
            logger.error("[ERROR] Live API, master data, cache and fallback are all unavailable.")
            return [], "No market data available right now."

        # ---------------------------------------------------------
        # STEP 4: PERSIST MERGED RESULT TO CACHE & MASTER
        # ---------------------------------------------------------
        now_str = datetime.now().isoformat()
        try:
            PriceCacheService.save_cache(final_merged_records, source="merged")
            logger.info(f"[CACHE] Saved {len(final_merged_records)} records")
        except Exception as e:
            logger.warning(f"[CACHE WARNING] Failed to save cache: {e}")

        try:
            PriceCacheService.save_master(final_merged_records)
        except Exception as e:
            logger.warning(f"[MASTER WARNING] Failed to update master: {e}")

        # Update in-memory cache
        APIService._cache["data"] = final_merged_records
        APIService._cache["timestamp"] = time.time()
        APIService._active_status = {
            "source": "live" if is_live_success else "cache",
            "record_count": len(final_merged_records),
            "fetched_at": now_str,
            "is_live": is_live_success
        }

        return final_merged_records, None