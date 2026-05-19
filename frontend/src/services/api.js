import axios from 'axios';
import { API_URL } from '../config';

const api = axios.create({
  baseURL: API_URL || '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ── Request interceptor — attach token ───────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('chatflow_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor — auto-refresh on 401 ──────────
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing    = true;

      try {
        const refreshToken =
          localStorage.getItem('chatflow_refresh') ||
          sessionStorage.getItem('chatflow_refresh');

        if (!refreshToken) throw new Error('No refresh token');

        const res      = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const newToken = res.data.token;
        const newRt    = res.data.refreshToken;

        localStorage.setItem('chatflow_token', newToken);
        if (localStorage.getItem('chatflow_refresh')) {
          localStorage.setItem('chatflow_refresh', newRt);
        } else {
          sessionStorage.setItem('chatflow_refresh', newRt);
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem('chatflow_token');
        localStorage.removeItem('chatflow_user');
        localStorage.removeItem('chatflow_refresh');
        sessionStorage.removeItem('chatflow_refresh');
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
