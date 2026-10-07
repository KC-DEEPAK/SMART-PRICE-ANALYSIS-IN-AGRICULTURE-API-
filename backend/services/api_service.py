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
        MASTER OLD DATA
            +
        FALLBACK DATA
            =
        FINAL MERGED DATASET
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

        if not APIService._active_status.get("fetched_at"):

            cache_info = PriceCacheService.get_cache_info()

            if cache_info:
                source_val = cache_info.get("source", "cache")

                APIService._active_status.update({
                    "status": "ok",
                    "message": "Krishi Mitra backend is running",
                    "source": source_val,
                    "data_source": source_val,
                    "record_count": cache_info.get("record_count", 0),
                    "fetched_at": cache_info.get("fetched_at", ""),
                    "is_live": False
                })

            else:
                master = (
                    PriceCacheService.get_master()
                    or PriceCacheService.get_fallback()
                    or []
                )

                APIService._active_status.update({
                    "status": "ok",
                    "message": "Krishi Mitra backend is running",
                    "source": "cache",
                    "data_source": "cache",
                    "record_count": len(master),
                    "fetched_at": datetime.now().isoformat(),
                    "is_live": False
                })

        return APIService._active_status

    @staticmethod
    def fetch_live_crop_prices(force_refresh=False):

        # =========================================================
        # STEP 0: IN-MEMORY CACHE
        # =========================================================

        if (
            not force_refresh
            and APIService._cache["data"] is not None
        ):
            age = time.time() - APIService._cache["timestamp"]

            if age < Config.CACHE_TIMEOUT:

                logger.info(
                    f"[CACHE] Returning in-memory data "
                    f"({len(APIService._cache['data'])} records)"
                )

                return APIService._cache["data"], None

        # =========================================================
        # CONFIGURATION
        # =========================================================

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

        # =========================================================
        # STEP 1: FETCH LIVE GOVERNMENT API DATA
        # =========================================================

        live_fetched_records = []
        is_live_success = False

        if api_key:

            # IMPORTANT:
            # Request only 10 records for testing
            page_limit = 10

            # Keep this small while testing
            max_pages = 1

            max_retries = 2

            retryable_statuses = {
                500,
                502,
                503,
                504
            }

            for page in range(max_pages):

                offset = page * page_limit

                params = {
                    "api-key": api_key,
                    "format": "json",
                    "limit": page_limit,
                    "offset": offset
                }

                page_records = []
                page_success = False

                for attempt in range(max_retries + 1):

                    try:

                        logger.info(
                            f"[LIVE] Requesting data.gov.in "
                            f"(limit={page_limit}, "
                            f"offset={offset}, "
                            f"attempt={attempt + 1}/3)..."
                        )

                        response = requests.get(
                            url,
                            params=params,
                            headers=headers,
                            timeout=(5, 10)
                        )

                        logger.info(
                            f"[LIVE] HTTP Status: "
                            f"{response.status_code}"
                        )

                        # -------------------------------------------------
                        # SUCCESS
                        # -------------------------------------------------

                        if response.status_code == 200:

                            data = response.json()

                            records = (
                                data.get("records", [])
                                if isinstance(data, dict)
                                else []
                            )

                            logger.info(
                                f"[LIVE] API returned "
                                f"{len(records)} raw records"
                            )

                            for record in records:

                                cleaned = (
                                    PriceCacheService.clean_record(
                                        record,
                                        default_source="live"
                                    )
                                )

                                if cleaned:
                                    page_records.append(cleaned)

                            page_success = True

                            break

                        # -------------------------------------------------
                        # RETRYABLE SERVER ERROR
                        # -------------------------------------------------

                        elif (
                            response.status_code in retryable_statuses
                            and attempt < max_retries
                        ):

                            backoff = 1 * (attempt + 1)

                            logger.warning(
                                f"[LIVE] Government API returned "
                                f"HTTP {response.status_code}. "
                                f"Retrying in {backoff}s..."
                            )

                            time.sleep(backoff)

                        # -------------------------------------------------
                        # OTHER ERROR
                        # -------------------------------------------------

                        else:

                            logger.warning(
                                f"[LIVE] Government API returned "
                                f"HTTP {response.status_code}"
                            )

                            logger.warning(
                                f"[LIVE] Response: "
                                f"{response.text[:500]}"
                            )

                            break

                    except requests.exceptions.Timeout as error:

                        logger.warning(
                            f"[LIVE] API timeout: {error}"
                        )

                        if attempt < max_retries:

                            time.sleep(
                                1 * (attempt + 1)
                            )

                        else:

                            break

                    except requests.exceptions.ConnectionError as error:

                        logger.warning(
                            f"[LIVE] Connection error: {error}"
                        )

                        if attempt < max_retries:

                            time.sleep(
                                1 * (attempt + 1)
                            )

                        else:

                            break

                    except requests.exceptions.RequestException as error:

                        logger.warning(
                            f"[LIVE] Request error: {error}"
                        )

                        break

                    except Exception as error:

                        logger.warning(
                            f"[LIVE] Unexpected API error: {error}"
                        )

                        break

                # ---------------------------------------------------------
                # PROCESS PAGE
                # ---------------------------------------------------------

                if page_success:

                    live_fetched_records.extend(
                        page_records
                    )

                    logger.info(
                        f"[LIVE] Cleaned records: "
                        f"{len(page_records)}"
                    )

                else:

                    logger.warning(
                        "[LIVE] Page request failed."
                    )

                    break

            # -------------------------------------------------------------
            # LIVE RESULT
            # -------------------------------------------------------------

            if live_fetched_records:

                is_live_success = True

                logger.info(
                    f"[LIVE] Government API successfully returned "
                    f"{len(live_fetched_records)} records."
                )

            else:

                logger.warning(
                    "[LIVE] Government API returned 0 usable records."
                )

        else:

            logger.warning(
                "[LIVE] DATA_GOV_API_KEY is not configured."
            )

        # =========================================================
        # STEP 2: LOAD MASTER & FALLBACK DATA
        # =========================================================

        master_records = PriceCacheService.get_master()

        if not master_records:

            master_records = (
                PriceCacheService.get_cache()
                or []
            )

        logger.info(
            f"[MASTER] Existing master dataset contains "
            f"{len(master_records)} records"
        )

        fallback_records = (
            PriceCacheService.get_fallback()
            or []
        )

        logger.info(
            f"[FALLBACK] Fallback dataset contains "
            f"{len(fallback_records)} records"
        )

        # =========================================================
        # STEP 3: MERGE DATASETS
        # =========================================================

        final_merged_records = (
            PriceCacheService.merge_datasets(
                live_records=live_fetched_records,
                master_records=master_records,
                fallback_records=fallback_records
            )
        )

        logger.info(
            f"[MERGE] Final merged dataset contains "
            f"{len(final_merged_records)} records"
        )

        # =========================================================
        # STEP 4: NO DATA
        # =========================================================

        if not final_merged_records:

            logger.error(
                "[ERROR] Live API, master data, "
                "cache and fallback are all unavailable."
            )

            return [], "No market data available right now."

        # =========================================================
        # STEP 5: SAVE CACHE & MASTER
        # =========================================================

        now_str = datetime.now().isoformat()

        active_source = (
            "live"
            if is_live_success
            else "cache"
        )

        try:

            PriceCacheService.save_cache(
                final_merged_records,
                source=active_source
            )

            logger.info(
                f"[CACHE] Saved "
                f"{len(final_merged_records)} records"
            )

        except Exception as error:

            logger.warning(
                f"[CACHE WARNING] "
                f"Failed to save cache: {error}"
            )

        try:

            PriceCacheService.save_master(
                final_merged_records
            )

            logger.info(
                "[MASTER] Master dataset updated."
            )

        except Exception as error:

            logger.warning(
                f"[MASTER WARNING] "
                f"Failed to update master: {error}"
            )

        # =========================================================
        # STEP 6: UPDATE IN-MEMORY CACHE
        # =========================================================

        APIService._cache["data"] = final_merged_records

        APIService._cache["timestamp"] = time.time()

        APIService._active_status = {

            "status": "ok",

            "message": (
                "Krishi Mitra backend is running"
            ),

            "source": active_source,

            "data_source": active_source,

            "record_count": len(
                final_merged_records
            ),

            "fetched_at": now_str,

            "is_live": is_live_success
        }

        # =========================================================
        # RETURN FINAL DATA
        # =========================================================

        return final_merged_records, None