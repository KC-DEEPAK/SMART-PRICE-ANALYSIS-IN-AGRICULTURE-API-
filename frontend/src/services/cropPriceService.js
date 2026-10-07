import { API_URL } from "../utils/api";

const BASE_API = API_URL.replace(/\/data$/, "");

/**
 * Central Frontend Crop Price Service
 * Single point of truth for fetching crop prices, available crops, market data, and data status metadata.
 */
export const cropPriceService = {
  /**
   * Fetch all normalized crop price records from central backend.
   */
  async getAllPrices() {
    try {
      const res = await fetch(`${BASE_API}/data`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("[cropPriceService] Error fetching all prices:", err);
      return [];
    }
  },

  /**
   * Fetch list of available crops and categories.
   */
  async getAvailableCrops() {
    try {
      const res = await fetch(`${BASE_API}/crops`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error("[cropPriceService] Error fetching available crops:", err);
      return { count: 0, crops: [], categories: {} };
    }
  },

  /**
   * Fetch data collection & cache status metadata.
   */
  async getDataStatus() {
    try {
      const res = await fetch(`${BASE_API}/data-status`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error("[cropPriceService] Error fetching data status:", err);
      return {
        data_status: "cached",
        last_updated: new Date().toISOString().split("T")[0],
        last_successful_update: null,
        total_crops: 0,
        total_markets: 0,
        total_records: 0
      };
    }
  },

  /**
   * Fetch market analysis data for a specific crop.
   */
  async getCropPriceAnalysis(cropName, state = null) {
    try {
      let url = `${BASE_API}/prices?crop=${encodeURIComponent(cropName)}`;
      if (state && state !== "All") {
        url += `&state=${encodeURIComponent(state)}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(`[cropPriceService] Error fetching price analysis for ${cropName}:`, err);
      return null;
    }
  },

  /**
   * Trigger backend scraper data refresh.
   */
  async triggerRefresh(cropName = "Tomato") {
    try {
      const res = await fetch(`${BASE_API}/prices/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crop: cropName })
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error("[cropPriceService] Error refreshing crop prices:", err);
      return null;
    }
  },

  /**
   * Debug / Audit endpoint data flow.
   */
  async getDebugDataFlow() {
    try {
      const res = await fetch(`${BASE_API}/debug/data-flow`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error("[cropPriceService] Error fetching debug data flow:", err);
      return null;
    }
  }
};
