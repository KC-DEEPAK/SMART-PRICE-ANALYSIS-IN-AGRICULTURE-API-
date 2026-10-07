import "./DashboardCards.css";
import { getCategory } from "../utils/cropCategories";
import { useLanguage } from "../context/LanguageContext";

function DashboardCards({ data = [], statusInfo = {}, onCategoryClick }) {
  const { t } = useLanguage();

  const getCropName = d => (d.crop || d.Commodity || d.commodity || d.Crop || d.crop_name || "").trim();

  // Unique crops in dataset
  const allUniqueCrops = Array.from(new Set(data.map(getCropName).filter(Boolean)));

  const vegetables = allUniqueCrops.filter(c => getCategory(c) === "Vegetables").length;
  const fruits = allUniqueCrops.filter(c => getCategory(c) === "Fruits").length;
  const others = allUniqueCrops.length - vegetables - fruits;

  const uniqueMarkets = new Set(data.map(d => d.market || d.Market || "").filter(Boolean)).size;

  return (
    <div className="mb-4">
      {/* Metrics Summary Strip */}
      <div className="agri-card mb-4" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)", borderTop: "4px solid #16a34a" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
          <div style={{ display: "flex", gap: "25px", flexWrap: "wrap" }}>
            <div>
              <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#64748b", fontWeight: "700" }}>Total Crops</span>
              <h2 style={{ margin: "2px 0 0 0", color: "#0f172a" }}>{allUniqueCrops.length}</h2>
            </div>
            <div>
              <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#64748b", fontWeight: "700" }}>Markets Tracked</span>
              <h2 style={{ margin: "2px 0 0 0", color: "#0f172a" }}>{uniqueMarkets || statusInfo.total_markets || 0}</h2>
            </div>
            <div>
              <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#64748b", fontWeight: "700" }}>Price Records</span>
              <h2 style={{ margin: "2px 0 0 0", color: "#0f172a" }}>{data.length}</h2>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            {statusInfo.data_status === "live" ? (
              <span style={{ background: "rgba(34,197,94,0.15)", color: "#15803d", border: "1px solid #86efac", padding: "6px 14px", borderRadius: "20px", fontWeight: "700", fontSize: "13px" }}>
                🟢 LIVE DATA
              </span>
            ) : (
              <span style={{ background: "rgba(234,179,8,0.15)", color: "#a16207", border: "1px solid #fde047", padding: "6px 14px", borderRadius: "20px", fontWeight: "700", fontSize: "13px" }}>
                🟡 CACHED DATA
              </span>
            )}
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
              Last Updated: <strong>{statusInfo.last_updated || "Today"}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Category Grid Cards */}
      <div className="dashboard-grid">
        <div
          className="agri-card"
          style={{ borderLeft: "5px solid var(--primary-light)", cursor: "pointer" }}
          onClick={() => onCategoryClick("Vegetables")}
        >
          <h3 style={{ margin: "0 0 10px 0", color: "var(--text-gray)" }}>{t.vegetables}</h3>
          <h1 style={{ margin: "0", fontSize: "42px", color: "var(--primary-dark)" }}>{vegetables}</h1>
          <p style={{ margin: "5px 0 0 0", color: "var(--text-light)" }}>crops tracked</p>
        </div>

        <div
          className="agri-card"
          style={{ borderLeft: "5px solid var(--accent-orange)", cursor: "pointer" }}
          onClick={() => onCategoryClick("Fruits")}
        >
          <h3 style={{ margin: "0 0 10px 0", color: "var(--text-gray)" }}>{t.fruits}</h3>
          <h1 style={{ margin: "0", fontSize: "42px", color: "var(--primary-dark)" }}>{fruits}</h1>
          <p style={{ margin: "5px 0 0 0", color: "var(--text-light)" }}>crops tracked</p>
        </div>

        <div
          className="agri-card"
          style={{ borderLeft: "5px solid var(--accent-blue)", cursor: "pointer" }}
          onClick={() => onCategoryClick("Others")}
        >
          <h3 style={{ margin: "0 0 10px 0", color: "var(--text-gray)" }}>{t.others}</h3>
          <h1 style={{ margin: "0", fontSize: "42px", color: "var(--primary-dark)" }}>{others}</h1>
          <p style={{ margin: "5px 0 0 0", color: "var(--text-light)" }}>crops tracked</p>
        </div>
      </div>
    </div>
  );
}

export default DashboardCards;
