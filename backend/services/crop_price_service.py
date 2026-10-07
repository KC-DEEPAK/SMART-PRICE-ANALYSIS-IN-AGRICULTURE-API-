import os
import json
import logging
from datetime import datetime
from scrapers.source_manager import SourceManager
from services.price_cache_service import PriceCacheService

logger = logging.getLogger(__name__)

class CropPriceCollectorService:
    """
    Core backend service for collecting, validating, normalizing, storing,
    and serving multi-crop market price analysis data.
    Supports 30+ real agricultural crops without hardcoding fake prices.
    """

    _last_successful_update = datetime.now().isoformat()
    _last_attempt_time = None
    _collector_status = "healthy"

    @staticmethod
    def normalize_crop_name(raw_crop: str) -> str:
        """
        Normalizes crop names so that tomato, Tomato, TOMATO, Paddy(Dhan)(Common), etc.
        map cleanly to standard crop display names.
        """
        if not raw_crop or not str(raw_crop).strip():
            return "Tomato"
        
        cleaned = str(raw_crop).strip().lower()

        crop_aliases = {
            "tomato": "Tomato",
            "tomatoes": "Tomato",
            "potato": "Potato",
            "potatoes": "Potato",
            "onion": "Onion",
            "onions": "Onion",
            "brinjal": "Brinjal",
            "eggplant": "Brinjal",
            "cabbage": "Cabbage",
            "cauliflower": "Cauliflower",
            "carrot": "Carrot",
            "beans": "Beans",
            "french beans": "Beans",
            "green chilli": "Green Chilli",
            "chilli": "Green Chilli",
            "chili red": "Green Chilli",
            "capsicum": "Capsicum",
            "chilly capsicum": "Capsicum",
            "okra": "Okra",
            "bhindi": "Okra",
            "ladies finger": "Okra",
            "lady finger": "Okra",
            "cucumber": "Cucumber",
            "kheera": "Cucumber",
            "bitter gourd": "Bitter Gourd",
            "bottle gourd": "Bottle Gourd",
            "pumpkin": "Pumpkin",
            "ridge gourd": "Ridge Gourd",
            "snake gourd": "Snake Gourd",
            "drumstick": "Drumstick",
            "coriander": "Coriander",
            "corriander": "Coriander",
            "garlic": "Garlic",
            "ginger": "Ginger",
            "turmeric": "Turmeric",
            "maize": "Maize",
            "corn": "Maize",
            "paddy": "Paddy",
            "rice": "Paddy",
            "wheat": "Wheat",
            "ragi": "Ragi",
            "groundnut": "Groundnut",
            "cotton": "Cotton",
            "banana": "Banana",
            "mango": "Mango",
            "apple": "Apple",
            "orange": "Orange",
            "black pepper": "Black Pepper",
            "arecanut": "Arecanut",
            "mustard": "Mustard",
            "sugarcane": "Sugarcane",
            "coconut": "Coconut",
            "gram": "Gram (Chana)",
            "chana": "Gram (Chana)",
            "soyabean": "Soyabean"
        }

        for key, display_name in crop_aliases.items():
            if key in cleaned:
                return display_name

        return str(raw_crop).strip().title()

    @staticmethod
    def categorize_crop(crop_name: str) -> str:
        """Categorizes crops based on standard agricultural taxonomy."""
        name = crop_name.lower()
        if any(v in name for v in ["tomato", "onion", "potato", "brinjal", "cabbage", "cauliflower", "carrot", "beans", "chilli", "capsicum", "okra", "cucumber", "gourd", "pumpkin", "drumstick"]):
            return "Vegetables"
        elif any(f in name for f in ["banana", "mango", "apple", "orange"]):
            return "Fruits"
        elif any(g in name for g in ["paddy", "rice", "wheat", "maize", "ragi"]):
            return "Grains"
        elif any(p in name for p in ["gram", "dal", "chana"]):
            return "Pulses"
        elif any(s in name for s in ["turmeric", "garlic", "ginger", "coriander", "pepper"]):
            return "Spices"
        elif any(c in name for c in ["cotton", "groundnut", "sugarcane", "arecanut", "coconut", "mustard", "soyabean"]):
            return "Cash Crops"
        return "Others"

    @staticmethod
    def _convert_record_format(rec):
        """Converts raw or DB record into standardized internal format."""
        m_price = float(rec.get("modal_price") or rec.get("Modal_x0020_Price") or 0)
        min_p = float(rec.get("min_price") or rec.get("Min_x0020_Price") or 0)
        max_p = float(rec.get("max_price") or rec.get("Max_x0020_Price") or 0)

        if not m_price and (min_p or max_p):
            m_price = (min_p + max_p) / 2.0 if (min_p and max_p) else max(min_p, max_p)

        crop_name = rec.get("crop") or rec.get("Commodity") or rec.get("commodity") or "Tomato"
        norm_crop = CropPriceCollectorService.normalize_crop_name(crop_name)

        return {
            "crop": norm_crop,
            "market": str(rec.get("market") or rec.get("Market") or "Unknown Market").strip(),
            "district": str(rec.get("district") or rec.get("District") or "Karnataka").strip(),
            "state": str(rec.get("state") or rec.get("State") or "Karnataka").strip(),
            "min_price": round(min_p, 2),
            "max_price": round(max_p, 2),
            "modal_price": round(m_price, 2),
            "unit": str(rec.get("unit") or "quintal").strip(),
            "date": str(rec.get("date") or rec.get("Arrival_Date") or datetime.now().strftime("%Y-%m-%d")).strip(),
            "source": str(rec.get("source") or rec.get("_source") or "farmer.in").strip()
        }

    @staticmethod
    def run_data_collection(force_refresh=False):
        """
        Executes data collection across all crops, normalizes, validates,
        deduplicates, stores to DB/cache, and prints required backend console metrics.
        Returns: (data_status: str, dataset: list, source_name: str)
        """
        now_time = datetime.now()
        now_iso = now_time.isoformat()
        CropPriceCollectorService._last_attempt_time = now_iso

        manager = SourceManager()
        is_fresh = False
        collected_records = []
        source_name = "farmer.in / Public Agri Market Data"

        if force_refresh:
            is_fresh, raw_scraped, source_name, scrape_msg = manager.collect_data()
            if is_fresh and raw_scraped:
                collected_records = [CropPriceCollectorService._convert_record_format(r) for r in raw_scraped]

        # Load stored records from database/cache
        stored_raw = (
            PriceCacheService.get_master()
            or PriceCacheService.get_cache()
            or PriceCacheService.get_fallback()
            or []
        )
        stored_records = [CropPriceCollectorService._convert_record_format(r) for r in stored_raw]

        new_count = len(collected_records)
        updated_count = 0
        duplicate_removed = 0
        invalid_removed = 0

        if is_fresh and collected_records:
            all_dataset = collected_records + stored_records
            data_status = "live"
            CropPriceCollectorService._last_successful_update = now_iso
        else:
            all_dataset = stored_records
            data_status = "cached"

        # Normalize and validate all records
        valid_records = []
        seen_keys = set()
        
        for r in all_dataset:
            # Price validation
            if r["modal_price"] <= 0 or not r["market"] or not r["crop"]:
                invalid_removed += 1
                continue
            
            key = (r["state"].lower(), r["district"].lower(), r["market"].lower(), r["crop"].lower(), r["date"].lower())
            if key in seen_keys:
                duplicate_removed += 1
            else:
                seen_keys.add(key)
                valid_records.append(r)

        # Update cache files if fresh data collected
        if is_fresh and valid_records:
            cache_payload = [
                {
                    "Arrival_Date": r["date"],
                    "Commodity": r["crop"],
                    "District": r["district"],
                    "Grade": "FAQ",
                    "Market": r["market"],
                    "Max_x0020_Price": r["max_price"],
                    "Min_x0020_Price": r["min_price"],
                    "Modal_x0020_Price": r["modal_price"],
                    "State": r["state"],
                    "Variety": "Standard",
                    "_source": r["source"]
                }
                for r in valid_records
            ]
            PriceCacheService.save_master(cache_payload)
            PriceCacheService.save_cache(cache_payload, source=source_name)

        # Unique metrics calculation
        unique_crops = sorted(list(set(r["crop"] for r in valid_records)))
        unique_markets = sorted(list(set(r["market"] for r in valid_records)))
        unique_states = sorted(list(set(r["state"] for r in valid_records)))

        # Count markets per crop
        crop_market_counts = {}
        for c in unique_crops:
            mkts = set(r["market"] for r in valid_records if r["crop"] == c)
            crop_market_counts[c] = len(mkts)

        # =========================================================================
        # REQUIRED BACKEND CONSOLE LOG FORMAT
        # =========================================================================
        print("\n" + "="*50)
        print("KRISHI MITRA - DATA COLLECTION")
        print("="*50)
        print(f"\nSource: {source_name}")
        print(f"Status: {'SUCCESS' if (is_fresh or valid_records) else 'FAILED'}")
        print(f"\nTotal records collected: {len(valid_records)}")
        print(f"Unique crops found: {len(unique_crops)}")
        print(f"Markets found: {len(unique_markets)}")
        print(f"States found: {len(unique_states)}")

        print("\nCROPS FOUND")
        print("-" * 50)
        for idx, c in enumerate(unique_crops, 1):
            print(f"{idx}. {c}")

        print("\nDATABASE")
        print("-" * 50)
        print(f"New records: {new_count if is_fresh else 0}")
        print(f"Updated records: {len(valid_records)}")
        print(f"Duplicate records removed: {duplicate_removed}")
        print(f"Invalid records removed: {invalid_removed}")

        print("\n" + "="*50)
        print("DATA COLLECTION COMPLETED")
        print("="*50 + "\n")

        # Print per-crop summary
        for c in unique_crops:
            print(f"{c:<15} →  {crop_market_counts[c]} markets")
        print("\n")

        return data_status, valid_records, source_name

    @staticmethod
    def get_available_crops():
        """
        Returns all available crops present in the database/cache,
        along with crop counts and category groupings.
        """
        stored_raw = (
            PriceCacheService.get_master()
            or PriceCacheService.get_cache()
            or PriceCacheService.get_fallback()
            or []
        )
        stored_records = [CropPriceCollectorService._convert_record_format(r) for r in stored_raw]
        
        crops_set = set()
        categories = {}

        for r in stored_records:
            crop_name = r["crop"]
            if crop_name and r["modal_price"] > 0:
                crops_set.add(crop_name)
                cat = CropPriceCollectorService.categorize_crop(crop_name)
                if cat not in categories:
                    categories[cat] = set()
                categories[cat].add(crop_name)

        sorted_crops = sorted(list(crops_set))
        formatted_categories = {k: sorted(list(v)) for k, v in categories.items()}

        return {
            "count": len(sorted_crops),
            "crops": sorted_crops,
            "categories": formatted_categories
        }

    @staticmethod
    def get_prices(crop_query="Tomato", state_query=None, force_refresh=False):
        """
        Retrieves crop price data for a requested crop across Karnataka and India.
        """
        data_status, valid_records, source_name = CropPriceCollectorService.run_data_collection(force_refresh=force_refresh)
        
        norm_crop = CropPriceCollectorService.normalize_crop_name(crop_query)

        # Filter for requested crop
        crop_records = [
            r for r in valid_records
            if r["crop"].lower() == norm_crop.lower()
        ]

        # Sort descending by price
        crop_records.sort(key=lambda x: x["modal_price"], reverse=True)

        karnataka_records = [r for r in crop_records if r["state"].lower() == "karnataka"]
        karnataka_records.sort(key=lambda x: x["modal_price"], reverse=True)

        best_karnataka = karnataka_records[0] if karnataka_records else None
        best_india = crop_records[0] if crop_records else None

        if state_query and state_query.strip().lower() == "karnataka":
            final_data_list = karnataka_records
        else:
            final_data_list = crop_records

        return {
            "crop": norm_crop,
            "state": state_query or "All",
            "source": source_name,
            "last_updated": datetime.now().strftime("%Y-%m-%d"),
            "data_source_status": data_status,
            "message": "Fresh data collected successfully." if data_status == "live" else "Showing stored database data.",
            "last_successful_update": CropPriceCollectorService._last_successful_update,
            "data": final_data_list,
            "karnataka_summary": {
                "best_market": best_karnataka,
                "markets_count": len(karnataka_records),
                "markets": karnataka_records
            },
            "india_summary": {
                "best_market": best_india,
                "best_markets": crop_records[:10],
                "total_markets_count": len(crop_records)
            }
        }

    @staticmethod
    def get_collector_status():
        """Returns administrative health status of crop data collector."""
        master = PriceCacheService.get_master() or []
        return {
            "last_successful_update": CropPriceCollectorService._last_successful_update,
            "last_attempt": CropPriceCollectorService._last_attempt_time or datetime.now().isoformat(),
            "records_stored": len(master),
            "sources": ["farmer.in", "data.gov.in", "Agri Market Public Scraper"],
            "status": CropPriceCollectorService._collector_status
        }
