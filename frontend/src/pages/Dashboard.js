import { useState, useRef } from "react";
import DashboardCards from "../components/DashboardCards";
import CategoryList from "../components/CategoryList";
import TopBestCrops from "../components/TopBestCrops";
import { speakBestMarket } from "../utils/speakPrice";
import { useLanguage } from "../context/LanguageContext";
import { useCropPrice } from "../context/CropPriceContext";

function Dashboard() {
  const { data, statusInfo, loading } = useCropPrice();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const hasSpoken = useRef(false);
  const { t } = useLanguage();

  // 🔊 MANUAL TRIGGER (IMPORTANT FOR BROWSER)
  const handleSpeakBestMarket = () => {
    if (!data || !data.length) return;

    // 🕒 Time-based greeting
    const hour = new Date().getHours();
    let greeting = "Good evening";
    if (hour < 12) greeting = "Good morning";
    else if (hour < 17) greeting = "Good afternoon";

    // ⭐ Find best market
    const best = data.reduce((max, cur) =>
      Number(cur.modal_price || cur.Modal_x0020_Price || 0) >
      Number(max.modal_price || max.Modal_x0020_Price || 0)
        ? cur
        : max,
      data[0]
    );

    const crop =
      best.crop ||
      best.Commodity ||
      best.commodity ||
      best.Crop ||
      best.crop_name;

    const market = best.market || best.Market || "APMC Market";
    const state = best.state || best.State || "Karnataka";
    const price = best.modal_price || best.Modal_x0020_Price || 0;

    speakBestMarket({
      crop,
      market,
      state,
      price,
      greeting
    });

    localStorage.setItem("spokenDate", new Date().toDateString());
    hasSpoken.current = true;
  };

  return (
    <div className="page-container">
      {/* 🔊 VOICE BUTTON & TITLE */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <h2 style={{ margin: 0 }}>{t.cropDashboard}</h2>
        <button
          onClick={handleSpeakBestMarket}
          className="btn-primary"
          disabled={loading || !data.length}
        >
          {t.hearBestPrice || "🔊 Hear Today’s Best Market"}
        </button>
      </div>

      {loading ? (
        <div className="agri-card text-center" style={{ padding: "40px" }}>
          <div className="loading-spinner" />
          <p style={{ color: "#64748b", marginTop: "12px" }}>Loading global crop price dataset...</p>
        </div>
      ) : (
        <>
          {/* DASHBOARD CARDS */}
          <DashboardCards
            data={data}
            statusInfo={statusInfo}
            onCategoryClick={setSelectedCategory}
          />

          {/* TOP CROPS */}
          <TopBestCrops data={data} />

          {/* CATEGORY DETAILS */}
          {selectedCategory && (
            <CategoryList
              data={data}
              category={selectedCategory}
            />
          )}
        </>
      )}
    </div>
  );
}

export default Dashboard;
