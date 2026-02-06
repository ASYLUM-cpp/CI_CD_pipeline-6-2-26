// ============================================================
// Axios API Client
// Configured with base URL from environment and JWT interceptor.
// All services communicate through this single client.
// ============================================================
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost';

// Service-specific base URLs
export const userAPI = axios.create({ baseURL: `${API_BASE}:3001/api` });
export const productAPI = axios.create({ baseURL: `${API_BASE}:3002/api` });
export const orderAPI = axios.create({ baseURL: `${API_BASE}:8001/api` });
export const paymentAPI = axios.create({ baseURL: `${API_BASE}:8002/api` });

// Attach JWT token to every request if available
const attachToken = (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

[userAPI, productAPI, orderAPI, paymentAPI].forEach((client) => {
  client.interceptors.request.use(attachToken);
});
