import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({ baseURL: API_URL });

// Injecter le token dans chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authService = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login/', { email, password });
    localStorage.setItem('access_token', res.data.access);
    localStorage.setItem('refresh_token', res.data.refresh);
    localStorage.setItem('role', res.data.role);
    return res.data;
  },

  logout: async () => {
    const refresh = localStorage.getItem('refresh_token');
    await api.post('/auth/logout/', { refresh });
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