import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useLanguage } from "../context/LanguageContext";
import { useCropPrice } from "../context/CropPriceContext";
import "leaflet/dist/leaflet.css";

// Icons
const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Component to recenter map when location is found
function LocationMarker({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);
  return null;
}

const MapPage = () => {
  const { data, loading: contextLoading } = useCropPrice();
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState([20.5937, 78.9629]); // Default India
  const [bestMarket, setBestMarket] = useState(null);
  const { lang, t } = useLanguage();

  useEffect(() => {
    // 1. Get user location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (err) => {
          console.warn("Location error:", err);
        }
      );
    }

    if (!data || data.length === 0) {
      if (!contextLoading) setLoading(false);
      return;
    }

    try {
      const stateCoords = {
        "Karnataka": [15.3173, 75.7139],
        "Maharashtra": [19.7515, 75.7139],
        "Gujarat": [22.2587, 71.1924],
        "Tamil Nadu": [11.1271, 78.6569],
        "Kerala": [10.8505, 76.2711],
        "Uttar Pradesh": [26.8467, 80.9462],
        "Punjab": [31.1471, 75.3412],
        "Haryana": [29.0588, 76.0856],
        "Andhra Pradesh": [15.9129, 79.7400],
        "Telangana": [18.1124, 79.0193],
        "Madhya Pradesh": [22.9734, 78.6569]
      };

      // Prioritize Karnataka markets
      const karnatakaMarkets = data.filter(item => (item.state || item.State || "").trim() === "Karnataka");
      const otherMarkets = data.filter(item => (item.state || item.State || "").trim() !== "Karnataka");
      
      const allFiltered = [...karnatakaMarkets, ...otherMarkets];

      // Group by Market
      const groupedMarkets = {};
      allFiltered.forEach(item => {
        const marketName = item.market || item.Market || "Unknown Market";
        if (!groupedMarkets[marketName]) {
          groupedMarkets[marketName] = [];
        }
        groupedMarkets[marketName].push({
          price: Number(item.modal_price || item.Modal_x0020_Price || 0),
          crop: item.crop || item.Commodity || item.commodity || item.Crop || "Unknown",
          state: item.state || item.State || "Unknown State"
        });
      });

      // Limit to 150 markets
      const marketNames = Object.keys(groupedMarkets).slice(0, 150);

      let processedMarkets = marketNames.map((marketName, index) => {
        const items = groupedMarkets[marketName].filter(m => m.price > 0);
        if (items.length === 0) return null;

        const highestPriceItem = items.reduce((prev, curr) => (prev.price > curr.price) ? prev : curr);
        const lowestPriceItem = items.reduce((prev, curr) => (prev.price < curr.price) ? prev : curr);
        
        const state = items[0].state;

        const baseCoords = stateCoords[state] || [20.5937, 78.9629];
        const lat = baseCoords[0] + (Math.random() - 0.5) * 1.5;
        const lng = baseCoords[1] + (Math.random() - 0.5) * 1.5;

        return {
          id: index,
          market: marketName,
          state: state,
          bestCrop: highestPriceItem.crop,
          bestPrice: highestPriceItem.price,
          worstCrop: lowestPriceItem.crop,
          worstPrice: lowestPriceItem.price,
          lat,
          lng,
          price: highestPriceItem.price
        };
      }).filter(Boolean);
      
      if (processedMarkets.length > 0) {
        const highestPriceMarket = processedMarkets.reduce((prev, curr) => (prev.price > curr.price) ? prev : curr);
        setBestMarket(highestPriceMarket);
        
        const avgPrice = processedMarkets.reduce((sum, m) => sum + m.price, 0) / processedMarkets.length;
        
        processedMarkets = processedMarkets.map(m => {
          let recommendation = "WAIT";
          if (m.id === highestPriceMarket.id) recommendation = "SELL NOW";
          else if (m.price >= avgPrice) recommendation = "HOLD";
          
          return { ...m, recommendation };
        });
      }

      setMarkets(processedMarkets);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [data, contextLoading]);

  const speakBestMarket = () => {
    if (bestMarket && "speechSynthesis" in window) {
      const text = `Best market near you is ${bestMarket.market} in ${bestMarket.state} with price ${bestMarket.bestPrice} rupees for ${bestMarket.bestCrop}`;
      const utterance = new SpeechSynthesisUtterance(text);
      
      const langMap = { en: "en-IN", kn: "kn-IN", hi: "hi-IN", ta: "ta-IN" };
      utterance.lang = langMap[lang] || "en-IN";
      
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <h2 style={{ margin: 0 }}>{t.nearbyMap}</h2>
      </div>
      
      {bestMarket && (
        <div className="agri-card mb-4 agri-card-left-border flex items-center justify-between flex-wrap gap-3">
          <div>
            <strong style={{ fontSize: "18px", color: "var(--primary-dark)" }}>{t.bestMarket}</strong> 
            <span style={{ fontSize: "16px", color: "var(--text-gray)", marginLeft: "8px" }}>
              {bestMarket.market} ({bestMarket.state}) - <b style={{ color: "var(--primary-green)" }}>₹{bestMarket.bestPrice}</b> for {bestMarket.bestCrop}
            </span>
          </div>
          <button 
            onClick={speakBestMarket}
            className="btn-primary"
          >
            {t.hearBestPrice}
          </button>
        </div>
      )}

      {loading && <p>{t.loadingMap}</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {!loading && !error && (
        <div className="agri-card" style={{ padding: "10px" }}>
          <div style={{ height: "60vh", width: "100%", borderRadius: "var(--radius-md)", overflow: "hidden", zIndex: 1 }}>
            <MapContainer center={userLocation} zoom={5} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <LocationMarker position={userLocation} />
              
              <Marker position={userLocation}>
                <Popup>{t.youAreHere}</Popup>
              </Marker>

              {markets.map(market => (
                <Marker 
                  key={market.id} 
                  position={[market.lat, market.lng]}
                  icon={market.recommendation === "SELL NOW" ? greenIcon : redIcon}
                >
                  <Popup>
                    <div style={{ textAlign: "center", minWidth: "150px" }}>
                      <h3 style={{ margin: "0 0 10px 0", borderBottom: "1px solid #ddd", paddingBottom: "5px" }}>{market.market}</h3>
                      <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#666" }}>{market.state}</p>
                      
                      <div style={{ background: "#e8f5e9", padding: "8px", borderRadius: "4px", marginBottom: "5px" }}>
                        <p style={{ margin: "0 0 3px 0", fontSize: "12px", color: "#2e7d32" }}><strong>{t.bestToSell}</strong></p>
                        <h4 style={{ margin: "0" }}>{market.bestCrop}</h4>
                        <p style={{ margin: "0", color: "#2e7d32", fontWeight: "bold" }}>₹{market.bestPrice}</p>
                      </div>

                      <div style={{ background: "#ffebee", padding: "8px", borderRadius: "4px" }}>
                        <p style={{ margin: "0 0 3px 0", fontSize: "12px", color: "#c62828" }}><strong>{t.worstPrice}</strong></p>
                        <h4 style={{ margin: "0" }}>{market.worstCrop}</h4>
                        <p style={{ margin: "0", color: "#c62828", fontWeight: "bold" }}>₹{market.worstPrice}</p>
                      </div>

                      <div style={{
                        padding: "5px",
                        background: market.recommendation === "SELL NOW" ? "#4caf50" : market.recommendation === "HOLD" ? "#ff9800" : "#f44336",
                        color: "white",
                        fontWeight: "bold",
                        borderRadius: "4px",
                        marginTop: "10px"
                      }}>
                        {market.recommendation === "SELL NOW" ? t.sellNow : market.recommendation === "HOLD" ? t.hold : t.wait}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPage;
