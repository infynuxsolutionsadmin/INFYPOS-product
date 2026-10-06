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

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Handle 401 globally — attempt token refresh, do NOT log cashier out if it fails
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isLoginEndpoint = originalRequest?.url?.includes('/auth/login');
    const isRefreshEndpoint = originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !isLoginEndpoint && !isRefreshEndpoint && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return client(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('pos_refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        // Use a clean axios instance to prevent interceptor loops
        const refreshClient = axios.create({ baseURL: client.defaults.baseURL });
        const { data } = await refreshClient.post('/auth/refresh', { refreshToken });
        
        // The interceptor wrapper logic on backend might nest the data
        const newAccessToken = data.data?.accessToken || data.accessToken;
        const newRefreshToken = data.data?.refreshToken || data.refreshToken;
        
        if (!newAccessToken) throw new Error('No new access token received');

        localStorage.setItem('pos_access_token', newAccessToken);
        if (newRefreshToken) localStorage.setItem('pos_refresh_token', newRefreshToken);
        
        isRefreshing = false;
        processQueue(null, newAccessToken);
        
        originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
        return client(originalRequest);
      } catch (err) {
        isRefreshing = false;
        processQueue(err, null);
        
        // Emitting this instead of pos:unauthorized so cashiers are NOT logged out.
        // It simply stops cloud sync until a manager re-pairs the device.
        window.dispatchEvent(new Event('pos:sync_auth_failed'));
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

export default client;
