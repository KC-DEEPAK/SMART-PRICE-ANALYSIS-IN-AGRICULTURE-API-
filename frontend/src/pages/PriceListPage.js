import { useEffect, useState } from "react";
import PriceListGraph from "../components/PriceListGraph";
import { speakDecision } from "../utils/speakDecision";
import { getCropSeason } from "../utils/cropSeasons";
import { useLanguage } from "../context/LanguageContext";
import { API_URL } from "../utils/api";

function PriceListPage() {
  const [data, setData] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("All");
  const { t } = useLanguage();

  const user =
    JSON.parse(localStorage.getItem("user")) || {};

  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(json => setData(json));
  }, []);

  const getCropName = (d) =>
    (d?.Commodity || d?.commodity || d?.Crop || d?.crop_name || "").trim();

  // Dynamic extraction of unique, sorted crop list from actual backend API response
  const rawDataArray = Array.isArray(data) ? data : (data?.records || data?.data || []);
  const allUniqueCrops = Array.from(
    new Set(rawDataArray.map(getCropName).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const crops = allUniqueCrops.filter(
    (c) => selectedSeason === "All" || getCropSeason(c) === selectedSeason
  );

  const cropData = rawDataArray.filter((d) => {
    return getCropName(d) === selectedCrop;
  });

  const sortedData = [...cropData].sort(
    (a, b) =>
      Number(b.Modal_x0020_Price) -
      Number(a.Modal_x0020_Price)
  );

  const allPrices = sortedData.map(d =>
    Number(d.Modal_x0020_Price)
  );

  return (
    <div className="page-container">
      <div className="agri-card mb-4 agri-card-left-border">
        <h2>📋 {t.priceList}</h2>

        <div className="flex gap-3 mb-2 flex-wrap">
          <select
            className="modern-select"
            value={selectedSeason}
            onChange={e => {
                setSelectedSeason(e.target.value);
                setSelectedCrop("");
            }}
            style={{ maxWidth: "200px" }}
          >
            <option value="All">🌍 {t.seasonGuide || "All Seasons"}</option>
            <option value="Kharif">🌧️ Kharif</option>
            <option value="Rabi">❄️ Rabi</option>
            <option value="Zaid">☀️ Zaid</option>
          </select>

          <select
            className="modern-select"
            value={selectedCrop}
            onChange={e => setSelectedCrop(e.target.value)}
            style={{ maxWidth: "300px" }}
          >
            <option value="">🌾 {t.selectCrop}</option>
            {crops.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedCrop && (
        <div className="agri-card">
          <PriceListGraph data={sortedData} />

          <div className="table-container" style={{ marginTop: "30px" }}>
            <table className="modern-table">
              <thead>
                <tr>
                  <th>{t.market}</th>
                  <th>{t.state}</th>
                  <th>{t.price}</th>
                  <th>{t.speak}</th>
                </tr>
              </thead>

              <tbody>
                {sortedData.map((d, i) => (
                  <tr
                    key={i}
                    style={{
                      background: i === 0 ? "rgba(255, 249, 196, 0.4)" : "transparent"
                    }}
                  >
                    <td>
                      {i === 0 && "⭐ "} {d.Market}
                    </td>
                    <td>{d.State}</td>
                    <td style={{ fontWeight: i === 0 ? "bold" : "normal", color: i === 0 ? "var(--primary-green)" : "inherit" }}>
                      ₹{d.Modal_x0020_Price}
                    </td>
                    <td>
                      <button
                        onClick={() =>
                          speakDecision({
                            userName: user.name || "Farmer",
                            crop: selectedCrop,
                            market: d.Market,
                            state: d.State,
                            price: Number(
                              d.Modal_x0020_Price
                            ),
                            allPrices
                          })
                        }
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: "18px",
                          transition: "transform 0.2s"
                        }}
                        onMouseOver={(e) => e.target.style.transform = "scale(1.2)"}
                        onMouseOut={(e) => e.target.style.transform = "scale(1)"}
                      >
                        🔊
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default PriceListPage;
