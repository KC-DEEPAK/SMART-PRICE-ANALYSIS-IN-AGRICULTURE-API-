import React, { useState, useMemo } from "react";
import { useCropPrice } from "../context/CropPriceContext";
import { useLanguage } from "../context/LanguageContext";

export default function SmartSellPage() {
  const { data, crops, statusInfo, loading } = useCropPrice();
  const [selectedCrop, setSelectedCrop] = useState("Tomato");
  const [transportCostPerKm, setTransportCostPerKm] = useState(15);
  const [distanceKm, setDistanceKm] = useState(25);
  const { t } = useLanguage();

  const getCropName = (r) => (r.crop || r.Commodity || r.commodity || r.Crop || "").trim();

  // Filter records for selected crop
  const cropRecords = useMemo(() => {
    if (!selectedCrop) return [];
    return data.filter(r => getCropName(r).toLowerCase() === selectedCrop.toLowerCase());
  }, [data, selectedCrop]);

  // Calculations
  const metrics = useMemo(() => {
    if (!cropRecords.length) return null;

    const prices = cropRecords.map(r => Number(r.modal_price || r.Modal_x0020_Price || 0)).filter(p => p > 0);
    if (!prices.length) return null;

    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const priceDiff = maxPrice - minPrice;

    // Find best market record
    const sorted = [...cropRecords].sort(
      (a, b) => Number(b.modal_price || b.Modal_x0020_Price || 0) - Number(a.modal_price || a.Modal_x0020_Price || 0)
    );
    const bestRecord = sorted[0];
    const estTransportCost = distanceKm * transportCostPerKm;
    const estNetReturn = (bestRecord ? Number(bestRecord.modal_price || bestRecord.Modal_x0020_Price || 0) : maxPrice) * 10 - estTransportCost; // per 10 quintals

    return {
      maxPrice,
      minPrice,
      avgPrice,
      priceDiff,
      bestRecord,
      estTransportCost,
      estNetReturn,
      totalMarkets: cropRecords.length
    };
  }, [cropRecords, distanceKm, transportCostPerKm]);

  const isLive = statusInfo.data_status === "live";

  return (
    <div className="page-container">
      {/* Header Card */}
      <div className="agri-card mb-4 agri-card-left-border">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h2 style={{ margin: 0 }}>💡 Smart Selling Decision Engine</h2>
            <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" }}>
              Maximize profits by comparing market prices against transport distance and net returns.
            </p>
          </div>
          <div>
            {isLive ? (
              <span style={{ background: "rgba(34,197,94,0.15)", color: "#15803d", padding: "4px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: "600" }}>
                🟢 LIVE DATA
              </span>
            ) : (
              <span style={{ background: "rgba(234,179,8,0.15)", color: "#a16207", padding: "4px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: "600" }}>
                🟡 CACHED DATA
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Selector & Parameter Controls */}
      <div className="agri-card mb-4">
        <h3 style={{ margin: "0 0 15px 0" }}>🌾 Select Crop & Transport Parameters</h3>
        <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>Select Crop:</label>
            <select
              className="modern-select"
              value={selectedCrop}
              onChange={e => setSelectedCrop(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            >
              {crops.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: "1 1 180px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>Dist. to Mandi (km):</label>
            <input
              type="number"
              className="modern-input"
              value={distanceKm}
              onChange={e => setDistanceKm(Number(e.target.value))}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            />
          </div>

          <div style={{ flex: "1 1 180px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>Transport Rate (₹/km):</label>
            <input
              type="number"
              className="modern-input"
              value={transportCostPerKm}
              onChange={e => setTransportCostPerKm(Number(e.target.value))}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            />
          </div>
        </div>
      </div>

      {/* Decision Summary Grid */}
      {metrics ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "15px", marginBottom: "20px" }}>
            <div className="agri-card" style={{ borderLeft: "4px solid #16a34a" }}>
              <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#16a34a", fontWeight: "700" }}>⭐ Best Mandi Price</span>
              <h2 style={{ margin: "6px 0", color: "#0f172a" }}>₹{metrics.maxPrice.toLocaleString("en-IN")} / qtl</h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>Market: <strong>{metrics.bestRecord?.market || metrics.bestRecord?.Market}</strong></p>
            </div>

            <div className="agri-card" style={{ borderLeft: "4px solid #2563eb" }}>
              <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#2563eb", fontWeight: "700" }}>📊 Average Modal Price</span>
              <h2 style={{ margin: "6px 0", color: "#0f172a" }}>₹{metrics.avgPrice.toLocaleString("en-IN")} / qtl</h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>Across {metrics.totalMarkets} active markets</p>
            </div>

            <div className="agri-card" style={{ borderLeft: "4px solid #dc2626" }}>
              <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#dc2626", fontWeight: "700" }}>📉 Lowest Mandi Price</span>
              <h2 style={{ margin: "6px 0", color: "#0f172a" }}>₹{metrics.minPrice.toLocaleString("en-IN")} / qtl</h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>Price Spread: <strong>+₹{metrics.priceDiff}</strong></p>
            </div>

            <div className="agri-card" style={{ borderLeft: "4px solid #9333ea" }}>
              <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#9333ea", fontWeight: "700" }}>💰 Est. Net Return (10 qtl)</span>
              <h2 style={{ margin: "6px 0", color: "#0f172a" }}>₹{metrics.estNetReturn.toLocaleString("en-IN")}</h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>After transport cost (-₹{metrics.estTransportCost})</p>
            </div>
          </div>

          {/* Detailed Market Comparison Table */}
          <div className="agri-card">
            <h3 style={{ margin: "0 0 15px 0" }}>📋 Available Mandis for "{selectedCrop}" ({cropRecords.length})</h3>
            <div className="table-container">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Market Name</th>
                    <th>District & State</th>
                    <th style={{ textAlign: "right" }}>Modal Price</th>
                    <th style={{ textAlign: "right" }}>Est. Transport</th>
                    <th>Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {cropRecords.map((r, i) => {
                    const price = Number(r.modal_price || r.Modal_x0020_Price || 0);
                    const isTop = i === 0;
                    return (
                      <tr key={i} style={{ background: isTop ? "#f0fdf4" : "transparent" }}>
                        <td>{isTop && "⭐ "}<strong>{r.market || r.Market}</strong></td>
                        <td>{r.district || r.District}, {r.state || r.State}</td>
                        <td style={{ textAlign: "right", fontWeight: "700", color: "#16a34a" }}>₹{price.toLocaleString("en-IN")} / qtl</td>
                        <td style={{ textAlign: "right", color: "#64748b" }}>₹{metrics.estTransportCost}</td>
                        <td>
                          {isTop ? (
                            <span style={{ background: "#16a34a", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "700" }}>
                              SELL HERE
                            </span>
                          ) : price >= metrics.avgPrice ? (
                            <span style={{ background: "#eab308", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "700" }}>
                              HOLD / OPTIONAL
                            </span>
                          ) : (
                            <span style={{ background: "#ef4444", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "700" }}>
                              AVOID
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="agri-card text-center" style={{ padding: "40px" }}>
          <p>No market price records found for "{selectedCrop}".</p>
        </div>
      )}
    </div>
  );
}
