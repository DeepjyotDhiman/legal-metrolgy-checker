import axios from 'axios';

/**
 * Central Axios instance for all TriNetra API calls.
 *
 * - Base URL is read from VITE_API_BASE_URL (defaults to http://localhost:8000)
 * - withCredentials=true so session cookies are sent on every request
 * - All services should import this instance, never create their own
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
  withCredentials: true,          // required for cookie-based auth
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor ────────────────────────────────────────────────────────
// No token header needed (cookie-based auth), but we can add request logging here.
apiClient.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error),
);

// ── Response interceptor ───────────────────────────────────────────────────────
// Redirect to /login on 401. Let 403 propagate so pages can handle them.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Avoid redirect loop when already on /login
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
