import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { cropPriceService } from "../services/cropPriceService";

const CropPriceContext = createContext();

export function CropPriceProvider({ children }) {
  const [data, setData] = useState([]);
  const [crops, setCrops] = useState([]);
  const [categories, setCategories] = useState({});
  const [statusInfo, setStatusInfo] = useState({
    data_status: "cached",
    last_updated: new Date().toISOString().split("T")[0],
    last_successful_update: null,
    total_crops: 0,
    total_markets: 0,
    total_records: 0,
    source: "farmer.in / Public Agri Market Data"
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCentralCropData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allPrices, cropsMeta, statusMeta] = await Promise.all([
        cropPriceService.getAllPrices(),
        cropPriceService.getAvailableCrops(),
        cropPriceService.getDataStatus()
      ]);

      setData(allPrices);
      
      if (cropsMeta && Array.isArray(cropsMeta.crops) && cropsMeta.crops.length > 0) {
        setCrops(cropsMeta.crops);
        setCategories(cropsMeta.categories || {});
      } else {
        // Derive unique crops dynamically from dataset if needed
        const unique = Array.from(
          new Set(
            allPrices.map(r => r.crop || r.Commodity || r.commodity || r.Crop).filter(Boolean)
          )
        ).sort();
        setCrops(unique);
      }

      if (statusMeta) {
        setStatusInfo({
          data_status: statusMeta.data_status || "cached",
          last_updated: statusMeta.last_updated || new Date().toISOString().split("T")[0],
          last_successful_update: statusMeta.last_successful_update,
          total_crops: statusMeta.total_crops || cropsMeta?.count || 0,
          total_markets: statusMeta.total_markets || 0,
          total_records: statusMeta.total_records || allPrices.length,
          source: statusMeta.source || "farmer.in"
        });
      }
    } catch (err) {
      console.error("[CropPriceContext] Failed to load global crop price data:", err);
      setError("Failed to load crop price data from central service.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCentralCropData();
  }, [loadCentralCropData]);

  const refreshData = async (cropName = "Tomato") => {
    setLoading(true);
    await cropPriceService.triggerRefresh(cropName);
    await loadCentralCropData();
  };

  return (
    <CropPriceContext.Provider
      value={{
        data,
        crops,
        categories,
        statusInfo,
        loading,
        error,
        refreshData,
        reload: loadCentralCropData
      }}
    >
      {children}
    </CropPriceContext.Provider>
  );
}

export function useCropPrice() {
  const context = useContext(CropPriceContext);
  if (!context) {
    throw new Error("useCropPrice must be used within a CropPriceProvider");
  }
  return context;
}
