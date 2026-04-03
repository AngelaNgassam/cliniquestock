import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({ baseURL: API_URL });

// ✅ Intercepteur requête — lit toujours depuis localStorage (source de vérité)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ Intercepteur réponse — gère le token expiré (401) automatiquement
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si 401 et pas déjà en train de refresh et pas sur /auth/login/
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login/') &&
      !originalRequest.url?.includes('/auth/refresh/')
    ) {
      originalRequest._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh) throw new Error('Pas de refresh token');

        const res = await axios.post(`${API_URL}/auth/refresh/`, { refresh });
        const newToken = res.data.access;

        localStorage.setItem('access_token', newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        // Refresh échoué → déconnecter
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login/', { email, password });
    // ✅ Stocker access ET refresh séparément
    localStorage.setItem('access_token',  res.data.access);
    localStorage.setItem('refresh_token', res.data.refresh);
    localStorage.setItem('role', res.data.role);
    return res.data;
  },

  logout: async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) await api.post('/auth/logout/', { refresh });
    } catch { /* silencieux */ }
    localStorage.clear();
  },

  refreshToken: async () => {
    const refresh = localStorage.getItem('refresh_token');
    const res = await api.post('/auth/refresh/', { refresh });
    localStorage.setItem('access_token', res.data.access);
    return res.data;
  },

  getMe: async () => {
    const res = await api.get('/auth/me/');
    return res.data;
  },
};

export default api;