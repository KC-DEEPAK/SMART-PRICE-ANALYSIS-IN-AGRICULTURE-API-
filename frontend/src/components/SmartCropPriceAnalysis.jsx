import React, { useState, useEffect } from "react";
import { API_URL } from "../utils/api";
import { speakDecision } from "../utils/speakDecision";

export default function SmartCropPriceAnalysis({ initialCrop = "Tomato" }) {
  const [availableCrops, setAvailableCrops] = useState([]);
  const [availableCategories, setAvailableCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState(initialCrop);
  const [selectedCrop, setSelectedCrop] = useState(initialCrop);
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const user = JSON.parse(localStorage.getItem("user")) || {};

  // Fetch dynamic list of available crops from backend API /api/crops
  useEffect(() => {
    const baseApi = API_URL.replace(/\/data$/, "");
    fetch(`${baseApi}/crops`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.crops) {
          setAvailableCrops(data.crops);
          if (data.categories) {
            setAvailableCategories(data.categories);
          }
        }
      })
      .catch((err) => console.error("Error loading crops list:", err));
  }, []);

  const fetchCropAnalysis = (cropName) => {
    if (!cropName || !cropName.trim()) return;
    setLoading(true);
    setErrorMsg("");

    const baseApi = API_URL.replace(/\/data$/, "");
    const targetUrl = `${baseApi}/prices?crop=${encodeURIComponent(cropName.trim())}`;

    fetch(targetUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch crop price analysis from server");
        return res.json();
      })
      .then((json) => {
        setAnalysisData(json);
        setSelectedCrop(json.crop || cropName);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching price analysis:", err);
        setErrorMsg("Price data is currently unavailable.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCropAnalysis(initialCrop);
  }, [initialCrop]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      fetchCropAnalysis(searchTerm.trim());
    }
  };

  const handleManualRefresh = () => {
    if (!selectedCrop) return;
    setLoading(true);
    const baseApi = API_URL.replace(/\/data$/, "");
    fetch(`${baseApi}/prices/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crop: selectedCrop }),
    })
      .then((res) => res.json())
      .then((resData) => {
        if (resData.result) {
          setAnalysisData(resData.result);
        } else {
          fetchCropAnalysis(selectedCrop);
        }
        setLoading(false);
      })
      .catch(() => {
        fetchCropAnalysis(selectedCrop);
      });
  };

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString("en-IN")}`;
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "Today";
    try {
      const dateObj = new Date(dateStr);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    } catch (e) {
      // Ignore fallback format
    }
    return dateStr;
  };

  const karnatakaBest = analysisData?.karnataka_summary?.best_market;
  const karnatakaMarkets = analysisData?.karnataka_summary?.markets || [];
  const indiaTopMarkets = analysisData?.india_summary?.best_markets || [];
  const isFresh = analysisData?.data_source_status === "live";

  return (
    <div className="smart-crop-analysis-container mb-6">
      {/* Search Input Box & Dynamic Crop Selector */}
      <div className="agri-card mb-4 agri-card-left-border" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)" }}>
        <h3 style={{ margin: "0 0 10px 0", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
          🔍 Smart Crop Price Search & Market Analysis
        </h3>
        <p style={{ margin: "0 0 15px 0", color: "#64748b", fontSize: "14px" }}>
          Select or search any crop from our multi-crop database ({availableCrops.length} crops supported) to view public mandi market prices.
        </p>

        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Dynamic Crop Selector Dropdown */}
          <select
            className="modern-select"
            value={selectedCrop}
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                setSelectedCrop(val);
                setSearchTerm(val);
                fetchCropAnalysis(val);
              }
            }}
            style={{ flex: "1 1 200px", padding: "12px 16px", borderRadius: "8px", fontSize: "15px", border: "1px solid #cbd5e1", background: "#ffffff", fontWeight: "600", color: "#1e293b" }}
          >
            <option value="">🌾 Select Crop ({availableCrops.length} available)...</option>
            {availableCrops.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Search Input Text Box */}
          <input
            type="text"
            className="modern-input"
            placeholder="Type crop name (e.g. Onion, Potato, Brinjal)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: "1 1 220px", padding: "12px 16px", borderRadius: "8px", fontSize: "15px", border: "1px solid #cbd5e1" }}
          />

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ padding: "12px 24px", fontSize: "15px", fontWeight: "600" }}
          >
            {loading ? "Searching..." : "🔍 Search Price"}
          </button>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={loading}
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              border: "1px solid #94a3b8",
              background: "#ffffff",
              color: "#334155",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
            }}
            title="Manually trigger backend scraper refresh"
          >
            🔄 Trigger Live Scraper
          </button>
        </form>

        {/* Quick Crop Selection Pills */}
        {availableCrops.length > 0 && (
          <div style={{ marginTop: "15px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#475569", display: "block", marginBottom: "8px" }}>
              Available Crops ({availableCrops.length}):
            </span>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", maxHeight: "120px", overflowY: "auto", paddingRight: "4px" }}>
              {availableCrops.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setSelectedCrop(c);
                    setSearchTerm(c);
                    fetchCropAnalysis(c);
                  }}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "14px",
                    fontSize: "12px",
                    fontWeight: selectedCrop.toLowerCase() === c.toLowerCase() ? "700" : "500",
                    border: selectedCrop.toLowerCase() === c.toLowerCase() ? "2px solid #16a34a" : "1px solid #cbd5e1",
                    background: selectedCrop.toLowerCase() === c.toLowerCase() ? "#dcfce7" : "#ffffff",
                    color: selectedCrop.toLowerCase() === c.toLowerCase() ? "#15803d" : "#334155",
                    cursor: "pointer",
                    transition: "all 0.15s ease-in-out"
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="agri-card" style={{ textAlign: "center", padding: "30px" }}>
          <p style={{ fontSize: "16px", color: "#2563eb", fontWeight: "600" }}>
            ⏳ Running backend data collector & normalizer for "{searchTerm}"...
          </p>
        </div>
      )}

      {errorMsg && !loading && (
        <div className="agri-card" style={{ borderLeft: "4px solid #ef4444", background: "#fef2f2", color: "#991b1b" }}>
          <p style={{ margin: 0, fontWeight: "600" }}>⚠️ {errorMsg}</p>
        </div>
      )}

      {!loading && analysisData && (
        <>
          {/* Main Title & Status Badge Header */}
          <div className="agri-card mb-4" style={{ borderTop: "4px solid #16a34a" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "15px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "24px", color: "#0f172a", textTransform: "uppercase" }}>
                  🍅 {analysisData.crop || selectedCrop} PRICE ANALYSIS
                </h2>
                <div style={{ display: "flex", gap: "15px", marginTop: "8px", color: "#64748b", fontSize: "13px", flexWrap: "wrap" }}>
                  <span>📅 Date: <strong>{analysisData.last_updated}</strong></span>
                  <span>🕒 Last Updated: <strong>{formatDateDisplay(analysisData.last_successful_update)}</strong></span>
                </div>
              </div>

              <div>
                {isFresh ? (
                  <div
                    style={{
                      background: "rgba(34, 197, 94, 0.15)",
                      color: "#15803d",
                      border: "1px solid #86efac",
                      padding: "6px 14px",
                      borderRadius: "20px",
                      fontWeight: "700",
                      fontSize: "14px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    🟢 Live Fresh Data
                  </div>
                ) : (
                  <div
                    style={{
                      background: "rgba(234, 179, 8, 0.15)",
                      color: "#a16207",
                      border: "1px solid #fde047",
                      padding: "6px 14px",
                      borderRadius: "20px",
                      fontWeight: "700",
                      fontSize: "14px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    🟡 Cached Data
                  </div>
                )}
              </div>
            </div>

            {/* Scraper / Cache Status Banner */}
            {!isFresh && (
              <div
                style={{
                  marginTop: "15px",
                  padding: "10px 14px",
                  background: "#fffbeb",
                  border: "1px solid #fef3c7",
                  borderRadius: "6px",
                  color: "#92400e",
                  fontSize: "13px",
                  fontWeight: "500",
                }}
              >
                ℹ️ Live source temporarily unavailable. Showing last successfully collected stored data.
              </div>
            )}
          </div>

          {/* Karnataka Highlights Card */}
          <div className="agri-card mb-4" style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", border: "1px solid #bbf7d0" }}>
            <h3 style={{ margin: "0 0 12px 0", color: "#166534" }}>🏛️ KARNATAKA MARKET SUMMARY</h3>

            {karnatakaBest ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px", background: "#ffffff", padding: "16px", borderRadius: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                <div>
                  <span style={{ fontSize: "12px", textTransform: "uppercase", fontWeight: "700", color: "#15803d", letterSpacing: "0.5px" }}>
                    ⭐ Best Karnataka Market
                  </span>
                  <h4 style={{ margin: "4px 0", fontSize: "20px", color: "#0f172a" }}>
                    {karnatakaBest.market}
                  </h4>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                    District: <strong>{karnatakaBest.district}</strong> | Min: {formatCurrency(karnatakaBest.min_price)} | Max: {formatCurrency(karnatakaBest.max_price)}
                  </p>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "26px", fontWeight: "800", color: "#16a34a" }}>
                    {formatCurrency(karnatakaBest.modal_price)}
                  </div>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>per quintal (Modal Price)</span>
                  
                  <div style={{ marginTop: "6px" }}>
                    <button
                      onClick={() =>
                        speakDecision({
                          userName: user.name || "Farmer",
                          crop: analysisData.crop,
                          market: karnatakaBest.market,
                          state: "Karnataka",
                          price: karnatakaBest.modal_price,
                          allPrices: karnatakaMarkets.map((m) => m.modal_price),
                        })
                      }
                      style={{
                        border: "none",
                        background: "#22c55e",
                        color: "#fff",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "600",
                        fontSize: "12px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      🔊 Hear Voice Decision
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ color: "#64748b" }}>No Karnataka mandi records currently available for this crop.</p>
            )}

            {/* Karnataka Mandis Table */}
            {karnatakaMarkets.length > 0 && (
              <div style={{ marginTop: "20px" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#166534" }}>
                  All Available Karnataka Mandis ({karnatakaMarkets.length})
                </h4>
                <div className="table-container" style={{ background: "#ffffff", borderRadius: "8px" }}>
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Market Name</th>
                        <th>District</th>
                        <th>Min Price</th>
                        <th>Max Price</th>
                        <th>Modal Price</th>
                        <th>Date</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {karnatakaMarkets.map((m, idx) => (
                        <tr key={idx} style={{ background: idx === 0 ? "#f0fdf4" : "transparent" }}>
                          <td>
                            {idx === 0 && "⭐ "} <strong>{m.market}</strong>
                          </td>
                          <td>{m.district}</td>
                          <td>{formatCurrency(m.min_price)}</td>
                          <td>{formatCurrency(m.max_price)}</td>
                          <td style={{ fontWeight: "700", color: "#15803d" }}>{formatCurrency(m.modal_price)}</td>
                          <td style={{ fontSize: "12px", color: "#64748b" }}>{m.date}</td>
                          <td style={{ fontSize: "12px", color: "#64748b" }}>{m.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* India Top Markets Section */}
          <div className="agri-card mb-4">
            <h3 style={{ margin: "0 0 15px 0", color: "#1e293b" }}>🇮🇳 BEST MARKETS ACROSS INDIA</h3>
            {indiaTopMarkets.length > 0 ? (
              <div className="table-container">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th style={{ width: "60px", textAlign: "center" }}>Rank</th>
                      <th>Market Name</th>
                      <th>District</th>
                      <th>State</th>
                      <th style={{ textAlign: "right" }}>Modal Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {indiaTopMarkets.map((m, idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: "center", fontWeight: "700", color: idx === 0 ? "#d97706" : "#64748b" }}>
                          #{idx + 1}
                        </td>
                        <td style={{ fontWeight: "600" }}>{m.market}</td>
                        <td>{m.district}</td>
                        <td>{m.state}</td>
                        <td style={{ textAlign: "right", fontWeight: "700", color: "#16a34a", fontSize: "15px" }}>
                          {formatCurrency(m.modal_price)} / qtl
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: "#64748b" }}>No nationwide market records found.</p>
            )}
          </div>

          {/* Data Source & Provenance Section */}
          <div className="agri-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#334155" }}>ℹ️ Data Source & Provenance Information</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", fontSize: "13px", color: "#475569" }}>
              <div>
                <strong>Data Source:</strong> {analysisData.source || "External Agricultural Public Source (farmer.in)"}
              </div>
              <div>
                <strong>Collection Method:</strong> Automated Backend Data Collector / Scraper
              </div>
              <div>
                <strong>Last Successful Update:</strong> {formatDateDisplay(analysisData.last_successful_update)}
              </div>
              <div>
                <strong>Data Status:</strong> {isFresh ? "🟢 Fresh Live Data" : "🟡 Stored/Cached Data"}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
