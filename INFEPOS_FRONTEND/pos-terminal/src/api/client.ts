import axios from 'axios';

/**
 * POS Terminal API client.
 * baseURL already includes /api/v1 — do NOT double-prefix paths.
 * Use:   client.get('/products')
 * NOT:   client.get('/api/v1/products')
 */
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Attach access token on every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('pos_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — clear auth and redirect to login
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isLoginEndpoint = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginEndpoint) {
      localStorage.removeItem('pos_access_token');
      localStorage.removeItem('pos_refresh_token');
      // Use a storage event so the Zustand store can react
      window.dispatchEvent(new Event('pos:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default client;
