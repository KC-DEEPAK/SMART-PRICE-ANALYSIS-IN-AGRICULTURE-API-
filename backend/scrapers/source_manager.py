import logging
from scrapers.farmer_scraper import PublicMandiScraper

logger = logging.getLogger(__name__)

class SourceManager:
    """
    Manager class for managing external public crop price data sources.
    Coordinates multiple scraper modules and merges normalized results.
    """

    def __init__(self):
        self.sources = [
            PublicMandiScraper()
        ]

    def collect_data(self, crop_name=None, state_filter=None):
        """
        Runs registered scrapers to fetch ALL available crop price data across all commodities.
        Returns tuple: (is_fresh: bool, combined_records: list, primary_source: str, status_msg: str)
        """
        all_records = []
        is_any_fresh = False
        primary_source = "farmer.in / Public Agri Market Data"
        status_msg = "Failed to collect live data from external sources."

        for scraper in self.sources:
            try:
                if hasattr(scraper, "fetch_all_crop_prices"):
                    success, records, msg = scraper.fetch_all_crop_prices(state_filter=state_filter)
                else:
                    success, records, msg = scraper.fetch_crop_prices(crop_name=crop_name, state_filter=state_filter)
                
                if success and records:
                    is_any_fresh = True
                    primary_source = getattr(scraper, "source_name", primary_source)
                    status_msg = msg
                    all_records.extend(records)
            except Exception as e:
                logger.warning(f"[SOURCE MANAGER] Error executing scraper {getattr(scraper, 'source_name', 'Scraper')}: {e}")

        # Deduplicate records by composite key: (state, district, market, crop, date)
        unique_records = []
        seen_keys = set()

        for rec in all_records:
            state = str(rec.get("state") or "").strip().lower()
            district = str(rec.get("district") or "").strip().lower()
            market = str(rec.get("market") or "").strip().lower()
            crop = str(rec.get("crop") or "").strip().lower()
            date_val = str(rec.get("date") or "").strip().lower()

            composite_key = (state, district, market, crop, date_val)
            if composite_key not in seen_keys:
                seen_keys.add(composite_key)
                unique_records.append(rec)

        return is_any_fresh, unique_records, primary_source, status_msg
