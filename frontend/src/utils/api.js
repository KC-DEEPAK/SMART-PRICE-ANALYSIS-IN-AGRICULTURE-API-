// Base backend URL

const BASE_URL =
  process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:5000"
    : "https://smart-price-analysis-in-agriculture-api.onrender.com";

export const API_URL = `${BASE_URL}/api/data`;
export const CHAT_API_URL = `${BASE_URL}/api/chat`;

// Price Alert Endpoints
export const ALERTS_API_URL = `${BASE_URL}/api/alerts`;
export const CHECK_ALERTS_API_URL = `${BASE_URL}/api/check-alerts`;

// Push Notification Endpoint
export const REGISTER_DEVICE_API_URL = `${BASE_URL}/api/register-device`;

// Seed Recommendation Endpoints
export const SEED_RECOMMENDATIONS_API_URL = `${BASE_URL}/api/seed-recommendations`;
export const SEED_META_API_URL = `${BASE_URL}/api/seed-recommendations/meta`;

// User Sync Endpoint
export const USER_SYNC_API_URL = `${BASE_URL}/api/user/sync`;

// Admin Portal Endpoints
export const ADMIN_CHECK_API_URL = `${BASE_URL}/api/admin/check`;
export const ADMIN_STATS_API_URL = `${BASE_URL}/api/admin/stats`;
export const ADMIN_USERS_API_URL = `${BASE_URL}/api/admin/users`;
