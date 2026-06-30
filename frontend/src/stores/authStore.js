import { create } from 'zustand';
import api from '../services/api';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('wc_user') || 'null'),
  token: localStorage.getItem('wc_token') || null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('wc_token', data.token);
      localStorage.setItem('wc_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isLoading: false });
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed';
      set({ error: msg, isLoading: false });
      return { success: false, message: msg };
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/auth/register', { name, email, password });
      localStorage.setItem('wc_token', data.token);
      localStorage.setItem('wc_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isLoading: false });
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || 'Registration failed';
      set({ error: msg, isLoading: false });
      return { success: false, message: msg };
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (_) {}
    localStorage.removeItem('wc_token');
    localStorage.removeItem('wc_user');
    disconnectSocket();
    set({ user: null, token: null });
  },

  updateUser: (userData) => {
    const updated = { ...get().user, ...userData };
    localStorage.setItem('wc_user', JSON.stringify(updated));
    set({ user: updated });
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me');
      const updated = data.user;
      localStorage.setItem('wc_user', JSON.stringify(updated));
      set({ user: updated });
    } catch (_) {}
  },
}));

export default useAuthStore;
