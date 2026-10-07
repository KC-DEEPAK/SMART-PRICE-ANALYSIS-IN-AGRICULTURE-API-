import { useState } from "react";
import ComparisonChart from "../components/ComparisonChart";
import { useLanguage } from "../context/LanguageContext";
import { useCropPrice } from "../context/CropPriceContext";
import "./ComparisonPage.css";

function ComparisonPage() {
  const { data, crops: globalCrops, loading } = useCropPrice();
  const [crop1, setCrop1] = useState("");
  const [crop2, setCrop2] = useState("");
  const { t } = useLanguage();

  // Helper to extract crop name from a record
  const getCropName = d =>
    d.crop || d.Commodity || d.commodity || d.Crop || d.crop_name || "";

  // Unique sorted crop list from central context or dataset
  const crops = (globalCrops && globalCrops.length > 0)
    ? globalCrops
    : [...new Set(data.map(getCropName).filter(Boolean))].sort();

  // Filter data for a given crop name
  const getDataForCrop = cropName =>
    data.filter(d => getCropName(d).toLowerCase() === cropName.toLowerCase());

  // Get price value from record
  const getPrice = d => Number(d.modal_price || d.Modal_x0020_Price || 0);

  // Get best/worst market entry for a crop
  const getBestWorst = cropData => {
    if (!cropData || cropData.length === 0) return { best: null, worst: null };
    const sorted = [...cropData].sort((a, b) => getPrice(b) - getPrice(a));
    return { best: sorted[0], worst: sorted[sorted.length - 1] };
  };

  const crop1Data = getDataForCrop(crop1);
  const crop2Data = getDataForCrop(crop2);
  const { best: best1, worst: worst1 } = getBestWorst(crop1Data);
  const { best: best2, worst: worst2 } = getBestWorst(crop2Data);

  const avgPrice = cropData => {
    if (!cropData || cropData.length === 0) return "—";
    const total = cropData.reduce((sum, d) => sum + getPrice(d), 0);
    return Math.round(total / cropData.length).toLocaleString("en-IN");
  };

  const getMinPrice = cropData => {
    if (!cropData || cropData.length === 0) return "—";
    const min = Math.min(...cropData.map(getPrice).filter(p => p > 0));
    return isFinite(min) ? min.toLocaleString("en-IN") : "—";
  };

  const getMaxPrice = cropData => {
    if (!cropData || cropData.length === 0) return "—";
    const max = Math.max(...cropData.map(getPrice));
    return isFinite(max) ? max.toLocaleString("en-IN") : "—";
  };

  const bothSelected = crop1 && crop2;

  return (
    <div className="page-container">
      {/* Header + Selectors */}
      <div className="agri-card mb-4 agri-card-left-border comparison-header-card">
        <h2 style={{ marginBottom: "8px" }}>⚖️ {t.priceComparison}</h2>
        <p style={{ color: "var(--text-gray)", marginBottom: "20px", fontSize: "14px" }}>
          Select two crops to compare their prices across markets
        </p>

        <div className="comparison-selectors">
          {/* Crop 1 */}
          <div className="crop-selector-group">
            <label className="crop-selector-label">🌿 Crop 1</label>
            <select
              id="crop1-select"
              className="modern-select comparison-select"
              value={crop1}
              onChange={e => setCrop1(e.target.value)}
            >
              <option value="">🌾 {t.selectCrop}</option>
              {crops.map(c => (
                <option key={c} value={c} disabled={c === crop2}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="vs-badge">VS</div>

          {/* Crop 2 */}
          <div className="crop-selector-group">
            <label className="crop-selector-label">🌱 Crop 2</label>
            <select
              id="crop2-select"
              className="modern-select comparison-select"
              value={crop2}
              onChange={e => setCrop2(e.target.value)}
            >
              <option value="">🌾 {t.selectCrop}</option>
              {crops.map(c => (
                <option key={c} value={c} disabled={c === crop1}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="agri-card text-center" style={{ padding: "40px" }}>
          <div className="loading-spinner" />
          <p style={{ color: "var(--text-gray)", marginTop: "12px" }}>
            Loading crop data…
          </p>
        </div>
      )}

      {/* Prompt when not both selected */}
      {!loading && !bothSelected && (
        <div className="agri-card text-center" style={{ padding: "50px 24px" }}>
          <div style={{ fontSize: "56px", marginBottom: "16px" }}>⚖️</div>
          <h3 style={{ color: "var(--text-gray)", fontWeight: 500, marginBottom: "8px" }}>
            Select two crops above to begin comparison
          </h3>
          <p style={{ color: "var(--text-light)", fontSize: "14px" }}>
            You'll see a side-by-side view and a price comparison chart.
          </p>
        </div>
      )}

      {/* Side-by-side crop info */}
      {!loading && bothSelected && (
        <>
          {/* Crop Info Cards */}
          <div className="comparison-info-grid mb-4">
            {/* Crop 1 Info */}
            <CropInfoCard
              cropName={crop1}
              best={best1}
              worst={worst1}
              avgPrice={avgPrice(crop1Data)}
              totalRecords={crop1Data.length}
              accentColor="var(--primary-green)"
              accentBg="rgba(46,125,50,0.08)"
              label="Crop 1"
              emoji="🌿"
            />

            {/* VS divider (desktop) */}
            <div className="vs-divider">
              <span className="vs-circle">VS</span>
            </div>

            {/* Crop 2 Info */}
            <CropInfoCard
              cropName={crop2}
              best={best2}
              worst={worst2}
              avgPrice={avgPrice(crop2Data)}
              totalRecords={crop2Data.length}
              accentColor="#c62828"
              accentBg="rgba(198,40,40,0.08)"
              label="Crop 2"
              emoji="🌱"
            />
          </div>

          {/* Comparison Chart */}
          <div className="agri-card">
            <h3 style={{ marginTop: 0, marginBottom: "4px" }}>
              📊 Price Comparison Chart
            </h3>
            <p style={{ color: "var(--text-gray)", fontSize: "13px", marginBottom: "20px" }}>
              Modal price trend for <strong>{crop1}</strong> vs{" "}
              <strong>{crop2}</strong> across markets
            </p>
            <ComparisonChart
              cropA={crop1}
              cropB={crop2}
              data={data}
            />
          </div>

          {/* Summary Table */}
          <div className="agri-card mt-4" style={{ marginTop: "24px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>
              📋 Quick Summary
            </h3>
            <div className="table-container">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th style={{ color: "#a5d6a7" }}>🌿 {crop1}</th>
                    <th style={{ color: "#ef9a9a" }}>🌱 {crop2}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Markets tracked</td>
                    <td>{crop1Data.length}</td>
                    <td>{crop2Data.length}</td>
                  </tr>
                  <tr>
                    <td>Average modal price (₹)</td>
                    <td>₹{avgPrice(crop1Data)}</td>
                    <td>₹{avgPrice(crop2Data)}</td>
                  </tr>
                  <tr>
                    <td>Lowest market price (₹)</td>
                    <td>₹{getMinPrice(crop1Data)}</td>
                    <td>₹{getMinPrice(crop2Data)}</td>
                  </tr>
                  <tr>
                    <td>Highest market price (₹)</td>
                    <td>₹{getMaxPrice(crop1Data)}</td>
                    <td>₹{getMaxPrice(crop2Data)}</td>
                  </tr>
                  <tr>
                    <td>Best market</td>
                    <td>{best1 ? (best1.market || best1.Market) : "—"}</td>
                    <td>{best2 ? (best2.market || best2.Market) : "—"}</td>
                  </tr>
                  <tr>
                    <td>Best price (₹)</td>
                    <td>{best1 ? `₹${getPrice(best1).toLocaleString("en-IN")}` : "—"}</td>
                    <td>{best2 ? `₹${getPrice(best2).toLocaleString("en-IN")}` : "—"}</td>
                  </tr>
                  <tr>
                    <td>Worst market</td>
                    <td>{worst1 ? (worst1.market || worst1.Market) : "—"}</td>
                    <td>{worst2 ? (worst2.market || worst2.Market) : "—"}</td>
                  </tr>
                  <tr>
                    <td>Worst price (₹)</td>
                    <td>{worst1 ? `₹${getPrice(worst1).toLocaleString("en-IN")}` : "—"}</td>
                    <td>{worst2 ? `₹${getPrice(worst2).toLocaleString("en-IN")}` : "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-component: individual crop info card ──────────────────────────────────
function CropInfoCard({
  cropName,
  best,
  worst,
  avgPrice,
  totalRecords,
  accentColor,
  accentBg,
  label,
  emoji,
}) {
  return (
    <div
      className="crop-info-card"
      style={{ borderTop: `4px solid ${accentColor}` }}
    >
      <div
        className="crop-info-header"
        style={{ background: accentBg }}
      >
        <span className="crop-label-badge" style={{ color: accentColor }}>
          {emoji} {label}
        </span>
        <h3 className="crop-info-name">{cropName}</h3>
        <p className="crop-records-count" style={{ color: accentColor }}>
          {totalRecords} market records
        </p>
      </div>

      <div className="crop-info-body">
        {/* Average */}
        <div className="crop-stat-row">
          <span className="crop-stat-label">Avg. Modal Price</span>
          <span className="crop-stat-value" style={{ color: accentColor }}>
            ₹{avgPrice}
          </span>
        </div>

        {/* Best */}
        <div className="crop-stat-section">
          <div className="crop-stat-section-title">
            🏆 Best Market
          </div>
          {best ? (
            <>
              <div className="crop-stat-market">{best.Market}</div>
              <div className="crop-stat-price" style={{ color: "#2e7d32" }}>
                ₹{Number(best.Modal_x0020_Price).toLocaleString("en-IN")}
              </div>
              {best.State && (
                <div className="crop-stat-state">{best.State}</div>
              )}
            </>
          ) : (
            <div className="crop-no-data">No data available</div>
          )}
        </div>

        {/* Worst */}
        <div className="crop-stat-section">
          <div className="crop-stat-section-title">
            📉 Worst Market
          </div>
          {worst ? (
            <>
              <div className="crop-stat-market">{worst.Market}</div>
              <div className="crop-stat-price" style={{ color: "#c62828" }}>
                ₹{Number(worst.Modal_x0020_Price).toLocaleString("en-IN")}
              </div>
              {worst.State && (
                <div className="crop-stat-state">{worst.State}</div>
              )}
            </>
          ) : (
            <div className="crop-no-data">No data available</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ComparisonPage;
