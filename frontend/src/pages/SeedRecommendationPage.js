import React, { useState, useEffect } from "react";
import { SEED_RECOMMENDATIONS_API_URL, SEED_META_API_URL } from "../utils/api";
import { useLanguage } from "../context/LanguageContext";
import "./SeedRecommendationPage.css";

// Popular quick selection crop items for farmers
const POPULAR_CROPS = [
  { name: "Paddy (Dhan)", query: "PADDY", icon: "🌾" },
  { name: "Wheat", query: "WHEAT", icon: "🌾" },
  { name: "Tomato", query: "TOMATO", icon: "🍅" },
  { name: "Maize (Makka)", query: "MAIZE", icon: "🌽" },
  { name: "Cotton", query: "COTTON", icon: "🪵" },
  { name: "Bengal Gram", query: "BENGAL GRAM", icon: "🌱" },
  { name: "Mustard", query: "MUSTARD", icon: "🌻" },
  { name: "Potato", query: "POTATO", icon: "🥔" },
];

function SeedRecommendationPage() {
  const { t } = useLanguage();

  // State
  const [availableCrops, setAvailableCrops] = useState([]);
  const [availableStates, setAvailableStates] = useState([]);
  
  const [selectedCrop, setSelectedCrop] = useState("PADDY");
  const [selectedState, setSelectedState] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("");

  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [stateApplied, setStateApplied] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // 1. Fetch metadata (crops and states list) on component mount
  useEffect(() => {
    fetch(SEED_META_API_URL)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAvailableCrops(data.crops || []);
          setAvailableStates(data.states || []);
        }
      })
      .catch((err) => console.error("Error fetching seed metadata:", err));

    // Initial search for Paddy
    fetchSeedRecommendations("PADDY", "");
  }, []);

  // 2. Fetch seed recommendations
  const fetchSeedRecommendations = (crop, state, season = "") => {
    if (!crop) return;

    setLoading(true);
    setErrorMsg(null);
    setHasSearched(true);

    let url = `${SEED_RECOMMENDATIONS_API_URL}?crop=${encodeURIComponent(crop)}`;
    if (state) {
      url += `&state=${encodeURIComponent(state)}`;
    }
    if (season) {
      url += `&season=${encodeURIComponent(season)}`;
    }

    fetch(url)
      .then((res) => {
        if (!res.ok) {
          throw new Error("API request failed");
        }
        return res.json();
      })
      .then((data) => {
        setLoading(false);
        if (data.success) {
          setRecommendations(data.recommendations || []);
          setStateApplied(data.state_applied || false);
        } else {
          setErrorMsg(data.error || "Unable to load seed recommendations.");
          setRecommendations([]);
        }
      })
      .catch((err) => {
        setLoading(false);
        console.error("Seed recommendations error:", err);
        setErrorMsg("Unable to load seed recommendations. Please check your internet connection and try again.");
        setRecommendations([]);
      });
  };

  const handleQuickCropSelect = (query) => {
    setSelectedCrop(query);
    fetchSeedRecommendations(query, selectedState, selectedSeason);
  };

  const handleSubmitSearch = (e) => {
    e.preventDefault();
    fetchSeedRecommendations(selectedCrop, selectedState, selectedSeason);
  };

  const topSeed = recommendations.length > 0 ? recommendations[0] : null;
  const otherSeeds = recommendations.length > 1 ? recommendations.slice(1) : [];

  return (
    <div className="seed-page-container">
      {/* HEADER */}
      <div className="seed-header">
        <h1 className="seed-title">
          <span>🌱</span> Seed Variety Recommendation System
        </h1>
        <p className="seed-subtitle">
          Select your crop and state to discover the top recommended seed varieties based on yield performance, state suitability, disease resistance, and maturity.
        </p>
      </div>

      {/* FILTER FORM CARD */}
      <div className="seed-filter-card">
        <label className="filter-label" style={{ marginBottom: "10px", display: "block" }}>
          ⚡ Popular Crops Quick Select
        </label>
        
        <div className="popular-crops-grid">
          {POPULAR_CROPS.map((item) => (
            <button
              key={item.query}
              type="button"
              className={`crop-chip-btn ${selectedCrop === item.query ? "active" : ""}`}
              onClick={() => handleQuickCropSelect(item.query)}
            >
              <span className="crop-chip-icon">{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmitSearch}>
          <div className="filter-controls-grid">
            {/* All Crops Dropdown */}
            <div className="filter-group">
              <label className="filter-label">🌾 Select Crop (Full List)</label>
              <select
                className="filter-select"
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                required
              >
                <option value="">-- Choose Crop --</option>
                {availableCrops.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* State Selection */}
            <div className="filter-group">
              <label className="filter-label">📍 State / Location (Optional)</label>
              <select
                className="filter-select"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
              >
                <option value="">All India / Any State</option>
                {availableStates.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Season Filter */}
            <div className="filter-group">
              <label className="filter-label">☀️ Season (Optional)</label>
              <select
                className="filter-select"
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
              >
                <option value="">All Seasons</option>
                <option value="Kharif">Kharif (Monsoon)</option>
                <option value="Rabi">Rabi (Winter)</option>
                <option value="Zaid">Zaid (Summer)</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="filter-group">
              <button type="submit" className="search-submit-btn" disabled={loading}>
                {loading ? "Searching..." : "🌱 Get Recommendations"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ERROR MESSAGE */}
      {errorMsg && (
        <div className="state-message-box" style={{ borderColor: "#fca5a5", background: "#fef2f2" }}>
          <div className="state-message-icon">⚠️</div>
          <div className="state-message-title" style={{ color: "#991b1b" }}>
            Connection Error
          </div>
          <div className="state-message-desc" style={{ color: "#b91c1c" }}>
            {errorMsg}
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && (
        <div className="state-message-box">
          <div className="state-message-icon">⏳</div>
          <div className="state-message-title">Finding Suitable Seeds...</div>
          <div className="state-message-desc">Analyzing yield range, disease resistance, and state match.</div>
        </div>
      )}

      {/* NO RESULTS STATE */}
      {!loading && !errorMsg && hasSearched && recommendations.length === 0 && (
        <div className="state-message-box">
          <div className="state-message-icon">🌾</div>
          <div className="state-message-title">No Seed Varieties Found</div>
          <div className="state-message-desc">
            No specific seed varieties were found matching <strong>{selectedCrop}</strong>. Please try selecting another crop.
          </div>
        </div>
      )}

      {/* RESULTS DISPLAY */}
      {!loading && !errorMsg && recommendations.length > 0 && (
        <>
          {/* STATE FILTER NOTIFICATION BADGE */}
          {selectedState && !stateApplied && (
            <div
              style={{
                background: "#fef3c7",
                border: "1px solid #f59e0b",
                borderRadius: "10px",
                padding: "10px 16px",
                marginBottom: "20px",
                fontSize: "0.9rem",
                color: "#92400e",
              }}
            >
              ℹ️ State specific filtering was not applied because state parameter was omitted or default was used. Showing general crop recommendations.
            </div>
          )}

          {/* 🏆 HERO CARD FOR THE #1 BEST MATCH */}
          {topSeed && (
            <div className="hero-seed-card">
              <div className="hero-badge-header">
                <span className="hero-title-tag">
                  🌱 Best Seed Variety for You
                </span>
                <span className="score-pill">
                  Score: {topSeed.score} / 100 ({topSeed.match_category})
                </span>
              </div>

              <h2 className="hero-variety-name">{topSeed.variety_name}</h2>
              <span className="crop-pill" style={{ background: "#d1fae5", color: "#065f46" }}>
                Crop: {topSeed.crop}
              </span>

              {/* Seed Attributes Grid */}
              <div className="seed-attributes-grid">
                <div className="attr-item">
                  <span className="attr-label">Yield Range</span>
                  <span className="attr-val">
                    {topSeed.yield_range !== "Information not available" ? topSeed.yield_range : "Information not available"}
                  </span>
                </div>

                <div className="attr-item">
                  <span className="attr-label">Disease Resistance</span>
                  <span className="attr-val">
                    {topSeed.disease_resistance !== "Information not available" ? topSeed.disease_resistance : "Information not available"}
                  </span>
                </div>

                <div className="attr-item">
                  <span className="attr-label">Maturity Type</span>
                  <span className="attr-val">
                    {topSeed.maturity !== "Information not available" ? topSeed.maturity : "Information not available"}
                  </span>
                </div>

                <div className="attr-item">
                  <span className="attr-label">Recommended States</span>
                  <span className="attr-val" style={{ fontSize: "0.85rem" }}>
                    {topSeed.recommended_states !== "Information not available" ? topSeed.recommended_states : "Information not available"}
                  </span>
                </div>
              </div>

              {/* Why Recommended Explanation */}
              <div className="hero-reasons-box">
                <div className="reasons-title">⭐ Why this is recommended for you:</div>
                <ul className="reasons-list">
                  {topSeed.reason && topSeed.reason.map((r, idx) => (
                    <li key={idx} className="reason-item">
                      <span className="reason-check">✓</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* OTHER SUITABLE VARIETIES SECTION */}
          {otherSeeds.length > 0 && (
            <div>
              <h3 className="section-title">
                <span>🥈</span> Other Recommended Varieties ({otherSeeds.length})
              </h3>

              <div className="varieties-grid">
                {otherSeeds.map((seed, index) => (
                  <div key={index} className="variety-card">
                    <div>
                      <div className="card-top-header">
                        <div>
                          <h4 className="variety-card-name">{seed.variety_name}</h4>
                          <span className="crop-pill">{seed.crop}</span>
                        </div>
                        <span
                          className="card-score-badge"
                          style={{ backgroundColor: seed.badge_color || "#2563eb" }}
                        >
                          Score: {seed.score}
                        </span>
                      </div>

                      <div className="card-details-list">
                        <div className="detail-row">
                          <span className="detail-label">Yield:</span>
                          <span className="detail-value">{seed.yield_range}</span>
                        </div>

                        <div className="detail-row">
                          <span className="detail-label">Disease Resistance:</span>
                          <span className="detail-value">{seed.disease_resistance}</span>
                        </div>

                        <div className="detail-row">
                          <span className="detail-label">Maturity:</span>
                          <span className="detail-value">{seed.maturity}</span>
                        </div>

                        <div className="detail-row">
                          <span className="detail-label">Recommended States:</span>
                          <span className="detail-value" style={{ fontSize: "0.8rem" }}>
                            {seed.recommended_states}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Reasons */}
                    <div className="card-reasons-box">
                      {seed.reason && seed.reason.map((r, rIdx) => (
                        <div key={rIdx} className="card-reason-text">
                          <span style={{ color: "#10b981", fontWeight: "bold" }}>✓</span>
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SeedRecommendationPage;
