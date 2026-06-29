export const API_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5000/api/data'
  : 'https://smart-price-analysis-2.onrender.com/api/data';

export const CHAT_API_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5000/api/chat'
  : 'https://smart-price-analysis-2.onrender.com/api/chat';