// Base backend URL switches between local dev and Render production
const BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5000'
  : 'https://smart-price-analysis-2.onrender.com';

export const API_URL        = `${BASE_URL}/api/data`;
export const CHAT_API_URL   = `${BASE_URL}/api/chat`;

// -- Price Alert Endpoints --
export const ALERTS_API_URL       = `${BASE_URL}/api/alerts`;
export const CHECK_ALERTS_API_URL = `${BASE_URL}/api/check-alerts`;