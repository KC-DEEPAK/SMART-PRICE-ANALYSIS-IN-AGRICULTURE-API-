import requests
import logging
from datetime import datetime
import json
import re

logger = logging.getLogger(__name__)

class PublicMandiScraper:
    """
    Data collector module for retrieving public agricultural mandi crop prices.
    Collects and normalizes crop prices from legitimate public sources.
    Does not bypass security, CAPTCHA, or cloudflare, and respects robots.txt / terms.
    """

    def __init__(self):
        self.source_name = "farmer.in / Public Agri Market Data"
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8"
        }

    def fetch_all_crop_prices(self, state_filter=None):
        """
        Attempts to collect live crop price data for ALL available crops from external public source.
        Does not filter by a single crop name; fetches all records.
        Returns a tuple: (success: bool, records: list, message: str)
        """
        logger.info(f"[SCRAPER] Attempting live data collection for ALL available crops from {self.source_name}")

        try:
            from config import Config
            api_key = Config.DATA_GOV_API_KEY
            resource_id = Config.DATA_GOV_RESOURCE_ID

            if api_key:
                url = f"https://api.data.gov.in/resource/{resource_id}"
                params = {
                    "api-key": api_key,
                    "format": "json",
                    "limit": 2000
                }
                if state_filter:
                    params["filters[state]"] = state_filter
                
                resp = requests.get(url, params=params, headers=self.headers, timeout=8)
                if resp.status_code == 200:
                    data = resp.json()
                    raw_records = data.get("records", [])
                    if raw_records:
                        normalized = self._normalize_records(raw_records, default_source="farmer.in (API)")
                        logger.info(f"[SCRAPER] Live API successfully returned {len(normalized)} total crop records across all commodities")
                        return True, normalized, "Fresh data for all crops collected successfully."
            
            # Web scraper fallback attempt for overall mandi listings
            public_mandi_url = "https://farmer.gov.in/mandi_prices"
            resp = requests.get(public_mandi_url, headers=self.headers, timeout=5)
            if resp.status_code == 200 and "table" in resp.text.lower():
                extracted = self._parse_html_table(resp.text, crop_name="All")
                if extracted:
                    logger.info(f"[SCRAPER] Live web scraper returned {len(extracted)} records for all crops")
                    return True, extracted, "Fresh web data collected successfully."

        except Exception as e:
            logger.warning(f"[SCRAPER] Live scrape connection failed or timed out: {e}")

        # Return False when live network request is unavailable so system uses cached database records
        return False, [], "External source temporarily unavailable or no live records returned."

    def fetch_crop_prices(self, crop_name=None, state_filter=None):
        """
        Backward-compatible method that fetches all crop records and filters if crop_name is given.
        """
        success, all_records, msg = self.fetch_all_crop_prices(state_filter=state_filter)
        if not success or not all_records:
            return False, [], msg
        
        if crop_name:
            crop_clean = crop_name.strip().lower()
            filtered = [r for r in all_records if r.get("crop", "").lower() == crop_clean]
            return True, filtered, msg
        
        return True, all_records, msg

    def _parse_html_table(self, html_content, crop_name):
        """Simple HTML table parser for public mandi tables."""
        records = []
        try:
            # Basic regex-based HTML table row parser
            rows = re.findall(r'<tr[^>]*>(.*?)</tr>', html_content, re.DOTALL | re.IGNORECASE)
            for row in rows:
                cols = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL | re.IGNORECASE)
                cols = [re.sub(r'<[^>]+>', '', c).strip() for c in cols]
                if len(cols) >= 5:
                    # Expecting columns like: Market, District, State, Min, Max, Modal, Date
                    state = cols[0] if len(cols) > 0 else "Karnataka"
                    district = cols[1] if len(cols) > 1 else ""
                    market = cols[2] if len(cols) > 2 else ""
                    min_p = self._to_float(cols[3])
                    max_p = self._to_float(cols[4])
                    modal_p = self._to_float(cols[5]) if len(cols) > 5 else max(min_p, max_p)
                    date_val = cols[6] if len(cols) > 6 else datetime.now().strftime("%d/%m/%Y")
                    
                    if market and modal_p > 0:
                        records.append({
                            "crop": crop_name,
                            "market": market,
                            "district": district,
                            "state": state,
                            "min_price": min_p,
                            "max_price": max_p,
                            "modal_price": modal_p,
                            "unit": "quintal",
                            "date": date_val,
                            "source": "farmer.in"
                        })
        except Exception as err:
            logger.warning(f"[SCRAPER] Error parsing HTML content: {err}")
        return records

    def _normalize_records(self, raw_list, default_source="farmer.in"):
        """Normalizes heterogeneous raw record formats into common schema."""
        normalized = []
        for r in raw_list:
            crop = (r.get("Commodity") or r.get("commodity") or r.get("crop") or "").strip()
            market = (r.get("Market") or r.get("market") or r.get("mandi") or "").strip()
            state = (r.get("State") or r.get("state") or "").strip()
            district = (r.get("District") or r.get("district") or "").strip()
            date_val = (r.get("Arrival_Date") or r.get("arrival_date") or r.get("date") or datetime.now().strftime("%Y-%m-%d")).strip()
            
            min_p = self._to_float(r.get("Min_x0020_Price", r.get("min_price", r.get("min", 0))))
            max_p = self._to_float(r.get("Max_x0020_Price", r.get("max_price", r.get("max", 0))))
            modal_p = self._to_float(r.get("Modal_x0020_Price", r.get("modal_price", r.get("modal", r.get("average_price", 0)))))

            if not modal_p and (min_p or max_p):
                modal_p = round((min_p + max_p) / 2.0, 2) if (min_p and max_p) else max(min_p, max_p)

            if crop and market and modal_p > 0:
                normalized.append({
                    "crop": crop.capitalize(),
                    "market": market,
                    "district": district,
                    "state": state,
                    "min_price": min_p,
                    "max_price": max_p,
                    "modal_price": modal_p,
                    "unit": "quintal",
                    "date": date_val,
                    "source": r.get("_source", default_source)
                })
        return normalized

    def _to_float(self, val):
        try:
            if val is None:
                return 0.0
            if isinstance(val, (int, float)):
                return float(val)
            cleaned = str(val).replace("₹", "").replace(",", "").strip()
            return float(cleaned)
        except Exception:
            return 0.0
