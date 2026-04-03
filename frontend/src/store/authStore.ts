import { create } from 'zustand';

interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  role: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string, role: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:            null,
  token:           localStorage.getItem('access_token'),
  role:            localStorage.getItem('role'),
  isAuthenticated: !!localStorage.getItem('access_token'),

  setAuth: (user, token, role) => {
    // ✅ Persister dans localStorage ET dans Zustand
    localStorage.setItem('access_token', token);
    localStorage.setItem('refresh_token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, role, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    set({ user: null, token: null, role: null, isAuthenticated: false });
  },
}));