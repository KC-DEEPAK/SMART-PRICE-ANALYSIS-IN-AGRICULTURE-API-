import { useEffect, useState, useMemo } from "react";
import PriceListGraph from "../components/PriceListGraph";
import { speakDecision } from "../utils/speakDecision";
import { getCropSeason } from "../utils/cropSeasons";
import { useLanguage } from "../context/LanguageContext";
import { API_URL } from "../utils/api";

function PriceListPage() {
  const [data, setData] = useState([]);
  const [dataStatus, setDataStatus] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("All");
  const [selectedState, setSelectedState] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("modal_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const { t } = useLanguage();

  const user = JSON.parse(localStorage.getItem("user")) || {};

  useEffect(() => {
    // Fetch main crop data
    fetch(API_URL)
      .then(res => res.json())
      .then(json => {
        const rawArray = Array.isArray(json) ? json : (json?.records || json?.data || []);
        setData(rawArray);
      })
      .catch(err => console.error("Error fetching price data:", err));

    // Fetch status metadata
    fetch(`${API_URL}/status`)
      .then(res => res.json())
      .then(json => {
        if (json && json.success) {
          setDataStatus(json);
        }
      })
      .catch(err => console.warn("Could not fetch data status metadata:", err));
  }, []);

  const getCropName = (d) =>
    (d?.Commodity || d?.commodity || d?.Crop || d?.crop_name || "").trim();

  // Dynamic extraction of unique sorted crop list
  const allUniqueCrops = useMemo(() => {
    return Array.from(
      new Set(data.map(getCropName).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [data]);

  // Dynamic extraction of unique state list
  const allUniqueStates = useMemo(() => {
    return Array.from(
      new Set(data.map(d => (d.State || d.state || "").trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [data]);

  // Season filter
  const seasonCrops = useMemo(() => {
    return allUniqueCrops.filter(
      (c) => selectedSeason === "All" || getCropSeason(c) === selectedSeason
    );
  }, [allUniqueCrops, selectedSeason]);

  // Comprehensive search + state + crop + season filtering
  const filteredRecords = useMemo(() => {
    return data.filter(d => {
      const crop = getCropName(d);
      const state = (d.State || d.state || "").trim();
      const district = (d.District || d.district || "").trim();
      const market = (d.Market || d.market || "").trim();
      const variety = (d.Variety || d.variety || "").trim();
      const grade = (d.Grade || d.grade || "").trim();

      // Season filter
      if (selectedSeason !== "All" && getCropSeason(crop) !== selectedSeason) {
        return false;
      }

      // Crop filter
      if (selectedCrop && crop.toLowerCase() !== selectedCrop.toLowerCase()) {
        return false;
      }

      // State filter
      if (selectedState !== "All" && state.toLowerCase() !== selectedState.toLowerCase()) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          crop.toLowerCase().includes(q) ||
          state.toLowerCase().includes(q) ||
          district.toLowerCase().includes(q) ||
          market.toLowerCase().includes(q) ||
          variety.toLowerCase().includes(q) ||
          grade.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [data, selectedSeason, selectedCrop, selectedState, searchQuery]);

  // Sorting logic
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      const modalA = Number(a.Modal_x0020_Price || a.modal_price || 0);
      const modalB = Number(b.Modal_x0020_Price || b.modal_price || 0);
      const minA = Number(a.Min_x0020_Price || a.min_price || 0);
      const minB = Number(b.Min_x0020_Price || b.min_price || 0);
      const maxA = Number(a.Max_x0020_Price || a.max_price || 0);
      const maxB = Number(b.Max_x0020_Price || b.max_price || 0);
      const marketA = (a.Market || a.market || "").toLowerCase();
      const marketB = (b.Market || b.market || "").toLowerCase();

      switch (sortBy) {
        case "modal_desc":
          return modalB - modalA;
        case "modal_asc":
          return modalA - modalB;
        case "min_asc":
          return minA - minB;
        case "max_desc":
          return maxB - maxA;
        case "market_asc":
          return marketA.localeCompare(marketB);
        default:
          return modalB - modalA;
      }
    });
  }, [filteredRecords, sortBy]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCrop, selectedSeason, selectedState, searchQuery, sortBy]);

  // Pagination calculation
  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedRecords.slice(start, start + itemsPerPage);
  }, [sortedRecords, currentPage, itemsPerPage]);

  const formatPrice = (val) => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString("en-IN")}`;
  };

  const allPricesForCrop = useMemo(() => {
    return sortedRecords.map(d => Number(d.Modal_x0020_Price || d.modal_price || 0));
  }, [sortedRecords]);

  // Render Data Source Badge
  const renderSourceBadge = () => {
    const source = dataStatus?.source || "live";
    if (source === "live" || dataStatus?.is_live) {
      return (
        <span
          style={{
            background: "rgba(34, 197, 94, 0.15)",
            color: "#15803d",
            border: "1px solid #86efac",
            padding: "4px 12px",
            borderRadius: "20px",
            fontSize: "13px",
            fontWeight: "600",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          🟢 Live Government Data ({data.length} records)
        </span>
      );
    } else if (source === "cache") {
      return (
        <span
          style={{
            background: "rgba(234, 179, 8, 0.15)",
            color: "#a16207",
            border: "1px solid #fde047",
            padding: "4px 12px",
            borderRadius: "20px",
            fontSize: "13px",
            fontWeight: "600",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px"
          }}
          title={dataStatus?.fetched_at ? `Cached from government API at ${dataStatus.fetched_at}` : "Latest saved API cache"}
        >
          🟡 Latest Cached Data ({data.length} records)
        </span>
      );
    } else {
      return (
        <span
          style={{
            background: "rgba(249, 115, 22, 0.15)",
            color: "#c2410c",
            border: "1px solid #fdba74",
            padding: "4px 12px",
            borderRadius: "20px",
            fontSize: "13px",
            fontWeight: "600",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          🟠 Fallback Data ({data.length} records)
        </span>
      );
    }
  };

  return (
    <div className="page-container">
      {/* Header & Controls Card */}
      <div className="agri-card mb-4 agri-card-left-border">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "15px" }}>
          <div>
            <h2 style={{ margin: 0 }}>📋 {t.priceList}</h2>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>
              Explore market prices for all crops across Indian mandis
            </p>
          </div>
          <div>{renderSourceBadge()}</div>
        </div>

        {/* Filter Controls Row 1: Dropdowns */}
        <div className="flex gap-3 mb-3 flex-wrap">
          {/* Season Filter */}
          <select
            className="modern-select"
            value={selectedSeason}
            onChange={e => {
              setSelectedSeason(e.target.value);
              setSelectedCrop("");
            }}
            style={{ maxWidth: "180px" }}
          >
            <option value="All">🌍 {t.seasonGuide || "All Seasons"}</option>
            <option value="Kharif">🌧️ Kharif</option>
            <option value="Rabi">❄️ Rabi</option>
            <option value="Zaid">☀️ Zaid</option>
          </select>

          {/* Crop Filter */}
          <select
            className="modern-select"
            value={selectedCrop}
            onChange={e => setSelectedCrop(e.target.value)}
            style={{ maxWidth: "240px" }}
          >
            <option value="">🌾 All Crops ({seasonCrops.length})</option>
            {seasonCrops.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* State Filter */}
          <select
            className="modern-select"
            value={selectedState}
            onChange={e => setSelectedState(e.target.value)}
            style={{ maxWidth: "200px" }}
          >
            <option value="All">🏛️ All States ({allUniqueStates.length})</option>
            {allUniqueStates.map(st => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Sort Filter */}
          <select
            className="modern-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ maxWidth: "200px" }}
          >
            <option value="modal_desc">⬇️ Modal Price (High to Low)</option>
            <option value="modal_asc">⬆️ Modal Price (Low to High)</option>
            <option value="min_asc">🏷️ Min Price (Low to High)</option>
            <option value="max_desc">📈 Max Price (Highest)</option>
            <option value="market_asc">🔤 Market Name (A-Z)</option>
          </select>
        </div>

        {/* Filter Controls Row 2: Search Input */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input
            type="text"
            className="modern-input"
            placeholder="🔍 Search by Crop, State, District, Market, Variety or Grade..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                background: "#f1f5f9",
                border: "none",
                padding: "10px 14px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
                color: "#64748b"
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Selected Crop Graph Component if a crop is selected */}
      {selectedCrop && (
        <div className="agri-card mb-4">
          <PriceListGraph data={sortedRecords} />
        </div>
      )}

      {/* Main Market Prices Table */}
      <div className="agri-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <h3 style={{ margin: 0 }}>
            {selectedCrop ? `📊 Market Records for "${selectedCrop}"` : "🌾 Market Price Listings"}
          </h3>
          <span style={{ fontSize: "14px", color: "#64748b" }}>
            Showing <strong>{sortedRecords.length}</strong> available records
          </span>
        </div>

        {paginatedRecords.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
            <p style={{ fontSize: "18px" }}>🔍 No market records match your filter criteria.</p>
            <button
              className="btn-secondary"
              onClick={() => {
                setSelectedCrop("");
                setSelectedSeason("All");
                setSelectedState("All");
                setSearchQuery("");
              }}
              style={{ marginTop: "10px" }}
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Crop</th>
                    <th>Market & District</th>
                    <th>State</th>
                    <th>Variety / Grade</th>
                    <th>Date</th>
                    <th style={{ textAlign: "right" }}>Min Price</th>
                    <th style={{ textAlign: "right" }}>Max Price</th>
                    <th style={{ textAlign: "right" }}>Modal Price</th>
                    <th style={{ textAlign: "center" }}>Voice</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedRecords.map((d, i) => {
                    const cropName = getCropName(d);
                    const modalPrice = Number(d.Modal_x0020_Price || d.modal_price || 0);
                    const minPrice = Number(d.Min_x0020_Price || d.min_price || 0);
                    const maxPrice = Number(d.Max_x0020_Price || d.max_price || 0);
                    const isTopMarket = i === 0 && currentPage === 1 && sortBy === "modal_desc";

                    return (
                      <tr
                        key={i}
                        style={{
                          background: isTopMarket ? "rgba(255, 249, 196, 0.4)" : "transparent"
                        }}
                      >
                        <td style={{ fontWeight: "600", color: "var(--primary-dark)" }}>
                          {cropName}
                        </td>
                        <td>
                          {isTopMarket && "⭐ "} <strong>{d.Market}</strong>
                          {d.District && <span style={{ color: "#64748b", fontSize: "13px" }}> ({d.District})</span>}
                        </td>
                        <td>{d.State}</td>
                        <td style={{ fontSize: "13px", color: "#475569" }}>
                          {d.Variety || "Standard"} {d.Grade ? `• ${d.Grade}` : ""}
                        </td>
                        <td style={{ fontSize: "13px", color: "#64748b" }}>
                          {d.Arrival_Date || "Today"}
                        </td>
                        <td style={{ textAlign: "right", color: "#64748b" }}>
                          {formatPrice(minPrice)}
                        </td>
                        <td style={{ textAlign: "right", color: "#64748b" }}>
                          {formatPrice(maxPrice)}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: "bold",
                            fontSize: "15px",
                            color: isTopMarket ? "var(--primary-green)" : "#1e293b"
                          }}
                        >
                          {formatPrice(modalPrice)}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            onClick={() =>
                              speakDecision({
                                userName: user.name || "Farmer",
                                crop: cropName,
                                market: d.Market,
                                state: d.State,
                                price: modalPrice,
                                allPrices: allPricesForCrop
                              })
                            }
                            style={{
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                              fontSize: "18px",
                              transition: "transform 0.2s"
                            }}
                            onMouseOver={(e) => (e.target.style.transform = "scale(1.2)")}
                            onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
                            title="Hear market audio decision"
                          >
                            🔊
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justify: "space-between",
                  alignItems: "center",
                  marginTop: "20px",
                  paddingTop: "15px",
                  borderTop: "1px solid #e2e8f0",
                  flexWrap: "wrap",
                  gap: "10px"
                }}
              >
                <div style={{ color: "#64748b", fontSize: "14px" }}>
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({sortedRecords.length} records)
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      background: currentPage === 1 ? "#f1f5f9" : "#ffffff",
                      color: currentPage === 1 ? "#94a3b8" : "#1e293b",
                      cursor: currentPage === 1 ? "not-allowed" : "pointer",
                      fontWeight: "500"
                    }}
                  >
                    ◀ Previous
                  </button>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      background: currentPage === totalPages ? "#f1f5f9" : "#ffffff",
                      color: currentPage === totalPages ? "#94a3b8" : "#1e293b",
                      cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                      fontWeight: "500"
                    }}
                  >
                    Next ▶
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default PriceListPage;
