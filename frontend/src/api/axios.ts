import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// DRF's paginated list endpoints wrap results as
// { count, next, previous, results: [...] }. Every page in this app still
// expects a bare array from a list call, so unwrap it in one place rather
// than touching every page that lists something. Anything that isn't a
// paginated envelope (custom actions, single objects, errors) passes
// through unchanged.
export function unwrapPaginatedResponse<T = any>(data: T): T {
  if (
    data &&
    typeof data === 'object' &&
    Array.isArray((data as any).results) &&
    'count' in (data as any)
  ) {
    return (data as any).results;
  }
  return data;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    const data = response.data;
    if (data && typeof data === 'object' && Array.isArray(data.results) && 'count' in data) {
      (response as any).pagination = {
        count: data.count,
        next: data.next,
        previous: data.previous,
      };
    }
    response.data = unwrapPaginatedResponse(data);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
            refresh: refreshToken
          });

          const { access, refresh } = response.data;
          localStorage.setItem('access_token', access);
          if (refresh) {
            // ROTATE_REFRESH_TOKENS is enabled on the backend, so a fresh
            // refresh token comes back with every refresh and the old one
            // is blacklisted server-side.
            localStorage.setItem('refresh_token', refresh);
          }

          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        } catch (refreshError) {
          // If refresh fails, logout
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
