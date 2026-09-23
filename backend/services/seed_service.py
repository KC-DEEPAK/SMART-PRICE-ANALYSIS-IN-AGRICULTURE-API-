import os
import csv
import re
import logging

logger = logging.getLogger(__name__)

class SeedService:
    _cached_data = None

    @classmethod
    def get_csv_path(cls):
        """Locate the seed varieties CSV file."""
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        primary_path = os.path.join(base_dir, "data", "seed_varieties.csv")
        fallback_path = os.path.join(base_dir, "data", "krishi_mitra_seed_varieties_clean.csv")

        if os.path.exists(primary_path):
            return primary_path
        elif os.path.exists(fallback_path):
            return fallback_path
        return None

    @classmethod
    def load_dataset(cls, force_reload=False):
        """Load and parse dataset into memory cache."""
        if cls._cached_data is not None and not force_reload:
            return cls._cached_data

        filepath = cls.get_csv_path()
        if not filepath or not os.path.exists(filepath):
            logger.error(f"Seed varieties CSV file not found at {filepath}")
            cls._cached_data = []
            return cls._cached_data

        records = []
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                reader = csv.reader(f)
                for row in reader:
                    # Skip non-data rows or invalid rows
                    if not row or len(row) < 7:
                        continue
                    
                    # Row 0 is S.NO. and should be numeric
                    s_no = row[0].strip()
                    if not s_no.isdigit():
                        continue

                    crop_name = row[1].strip()
                    variety_name = row[2].strip()
                    recommended_states = row[3].strip()
                    yield_range = row[4].strip()
                    disease_resistant = row[5].strip()
                    maturity_type = row[6].strip()

                    # Extract numerical max yield for normalization
                    max_yield = cls._extract_max_yield(yield_range)

                    records.append({
                        "id": int(s_no),
                        "crop_name": crop_name,
                        "variety_name": variety_name,
                        "recommended_states": recommended_states or "Information not available",
                        "recommended_states_list": [s.strip().upper() for s in recommended_states.split(",") if s.strip()] if recommended_states else [],
                        "yield_range": yield_range or "Information not available",
                        "max_yield": max_yield,
                        "disease_resistance": disease_resistant or "Information not available",
                        "maturity": maturity_type or "Information not available",
                    })

            cls._cached_data = records
            logger.info(f"Successfully loaded {len(records)} seed varieties from {filepath}")
        except Exception as e:
            logger.error(f"Error reading seed varieties CSV: {e}")
            cls._cached_data = []

        return cls._cached_data

    @classmethod
    def _extract_max_yield(cls, yield_str):
        """Extract max numeric yield value from string like '50 - 60 Qt/Ha' or '60 Qt/Ha'."""
        if not yield_str or yield_str.strip().lower() == "information not available":
            return 0.0
        
        # Extract all floating point or integer numbers
        numbers = re.findall(r"[-+]?\d*\.\d+|\d+", yield_str)
        if not numbers:
            return 0.0
        
        try:
            float_nums = [float(n) for n in numbers]
            # Ignore outlier indices or absurd numbers if needed, but max is usually standard
            return max(float_nums)
        except Exception:
            return 0.0

    @classmethod
    def get_metadata(cls):
        """Return list of unique available crops and states for frontend dropdowns."""
        data = cls.load_dataset()
        crops_map = {}
        states_set = set()

        for item in data:
            raw_crop = item["crop_name"]
            # Clean display crop name e.g. "PADDY (DHAN)" -> "Paddy (Dhan)"
            crops_map[raw_crop.upper()] = raw_crop
            for st in item["recommended_states_list"]:
                states_set.add(st)

        # Build clean list of crop objects
        crops_list = sorted(list(crops_map.values()))
        states_list = sorted([s.title() for s in states_set if s])

        return {
            "crops": crops_list,
            "states": states_list
        }

    @classmethod
    def get_recommendations(cls, crop_query, state_query=None, season_query=None):
        """
        Filter varieties for crop, rank by score, and generate reasons.
        """
        if not crop_query:
            return {
                "success": False,
                "error": "Crop selection is required.",
                "crop": "",
                "recommendations": []
            }

        data = cls.load_dataset()
        crop_clean = crop_query.strip().upper()
        state_clean = state_query.strip().upper() if state_query else None

        # Filter varieties matching crop (flexibly handling Paddy, Dhan, Wheat, Maize, Cotton, etc.)
        matched_varieties = []
        for item in data:
            item_crop_upper = item["crop_name"].upper()
            
            # Direct match or partial crop match (e.g. "PADDY" matching "PADDY (DHAN)")
            if crop_clean in item_crop_upper or item_crop_upper in crop_clean or cls._crop_alias_match(crop_clean, item_crop_upper):
                matched_varieties.append(item)

        if not matched_varieties:
            return {
                "success": True,
                "crop": crop_query,
                "state": state_query or "All States",
                "state_applied": bool(state_clean),
                "total_count": 0,
                "recommendations": [],
                "message": f"No seed varieties found for {crop_query}."
            }

        # Calculate max yield among matched varieties for yield score normalization
        max_crop_yield = max([v["max_yield"] for v in matched_varieties] + [1.0])
        if max_crop_yield <= 0:
            max_crop_yield = 1.0

        ranked_results = []
        for item in matched_varieties:
            score, reasons = cls._calculate_score(item, state_clean, max_crop_yield)

            # Categorize match quality based on score
            if score >= 90:
                match_category = "Best Match 🥇"
                badge_color = "#16a34a" # Green
            elif score >= 75:
                match_category = "Very Good Match 🥈"
                badge_color = "#2563eb" # Blue
            elif score >= 60:
                match_category = "Good Match 🥉"
                badge_color = "#d97706" # Amber
            else:
                match_category = "Suitable Variety"
                badge_color = "#4b5563" # Gray

            ranked_results.append({
                "variety_name": item["variety_name"],
                "crop": item["crop_name"],
                "recommended_states": item["recommended_states"],
                "yield_range": item["yield_range"],
                "disease_resistance": item["disease_resistance"],
                "maturity": item["maturity"],
                "score": round(score),
                "match_category": match_category,
                "badge_color": badge_color,
                "reason": reasons
            })

        # Sort by score descending, then by variety name
        ranked_results.sort(key=lambda x: (x["score"], x["variety_name"]), reverse=True)

        return {
            "success": True,
            "crop": crop_query,
            "state": state_query or "All States",
            "state_applied": bool(state_clean),
            "total_count": len(ranked_results),
            "recommendations": ranked_results
        }

    @classmethod
    def _crop_alias_match(cls, query, crop_name):
        """Helper to match common alias crop names."""
        aliases = {
            "PADDY": ["DHAN", "RICE", "PADDY"],
            "RICE": ["DHAN", "PADDY", "RICE"],
            "MAIZE": ["MAKKA", "MAIZE", "CORN"],
            "CORN": ["MAKKA", "MAIZE"],
            "COTTON": ["COTTON", "KAPAS"],
            "WHEAT": ["GEHUN", "WHEAT"],
            "CHICK PEA": ["BENGAL GRAM", "CHANA", "CHICK PEA"],
            "BENGAL GRAM": ["CHICK PEA", "CHANA", "BENGAL GRAM"],
            "GREEN GRAM": ["MOONG", "GREEN GRAM"],
            "BLACK GRAM": ["URAD", "BLACK GRAM"],
            "RED GRAM": ["ARHAR", "TUR", "PIGEON PEA", "RED GRAM"],
            "MUSTARD": ["SARSON", "MUSTARD"]
        }

        for key, words in aliases.items():
            if query in key or key in query:
                for w in words:
                    if w in crop_name:
                        return True
        return False

    @classmethod
    def _calculate_score(cls, item, state_clean, max_crop_yield):
        """
        Transparent suitability score calculation (0 to 100):
        - State Match: 40 pts max (40 if matches, 20 if no state specified by user, 0 if user state given but not matching)
        - Disease Resistance: 25 pts max (25 if 'Yes', 0 otherwise)
        - Yield Performance: 20 pts max (relative to crop's max reported yield)
        - Maturity Type: 15 pts max (15 for Early, 10 for Medium, 5 for Late/Perennial)
        """
        score = 0.0
        reasons = []

        # 1. Recommended State Match (Max 40 points)
        if state_clean:
            # Check if farmer's state matches recommended states list
            state_match = any(state_clean in st or st in state_clean for st in item["recommended_states_list"])
            if state_match:
                score += 40.0
                reasons.append(f"Recommended for {state_clean.title()}")
            else:
                reasons.append(f"Not specifically listed for {state_clean.title()} (Suitable for other states)")
        else:
            # Default state baseline when farmer didn't specify state
            score += 20.0

        # 2. Disease Resistance (Max 25 points)
        disease_res = item["disease_resistance"].strip()
        if disease_res.lower() in ["yes", "true", "1"]:
            score += 25.0
            reasons.append("Disease resistant variety")
        elif disease_res.lower() in ["no", "false", "0"]:
            reasons.append("Not disease resistant")
        else:
            reasons.append("Disease resistance status unknown")

        # 3. Yield Performance (Max 20 points)
        item_yield = item["max_yield"]
        if item_yield > 0 and max_crop_yield > 0:
            yield_score = (item_yield / max_crop_yield) * 20.0
            score += min(yield_score, 20.0)
            if item["yield_range"] != "Information not available":
                reasons.append(f"Reported yield: {item['yield_range']}")
        else:
            reasons.append("Yield range data not available")

        # 4. Maturity Type (Max 15 points)
        maturity = item["maturity"].strip().lower()
        if "early" in maturity:
            score += 15.0
            reasons.append("Early maturity (faster harvest cycle)")
        elif "medium" in maturity:
            score += 10.0
            reasons.append("Medium maturity duration")
        elif "late" in maturity:
            score += 5.0
            reasons.append("Late maturity duration")
        elif "perennial" in maturity:
            score += 5.0
            reasons.append("Perennial crop type")
        else:
            reasons.append("Maturity duration not specified")

        return score, reasons
