import { create } from 'zustand';
import api from '../services/api';

const useWebsiteStore = create((set, get) => ({
  websites: [],
  activeWebsite: null,
  isLoading: false,

  fetchWebsites: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/websites');
      set({ websites: data.websites || [], isLoading: false });
      if (data.websites?.length && !get().activeWebsite) {
        set({ activeWebsite: data.websites[0] });
      }
    } catch (error) {
      set({ isLoading: false });
    }
  },

  createWebsite: async (websiteData) => {
    try {
      const { data } = await api.post('/websites', websiteData);
      set((state) => ({ websites: [...state.websites, data.website] }));
      return { success: true, website: data.website };
    } catch (error) {
      return { success: false, message: error.response?.data?.message };
    }
  },

  updateWebsite: async (id, websiteData) => {
    try {
      const { data } = await api.put(`/websites/${id}`, websiteData);
      set((state) => ({
        websites: state.websites.map((w) => w._id === id ? data.website : w),
        activeWebsite: state.activeWebsite?._id === id ? data.website : state.activeWebsite,
      }));
      return { success: true, website: data.website };
    } catch (error) {
      return { success: false, message: error.response?.data?.message };
    }
  },

  deleteWebsite: async (id) => {
    try {
      await api.delete(`/websites/${id}`);
      set((state) => ({
        websites: state.websites.filter((w) => w._id !== id),
        activeWebsite: state.activeWebsite?._id === id ? null : state.activeWebsite,
      }));
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  setActiveWebsite: (website) => set({ activeWebsite: website }),

  getWidgetCode: async (id) => {
    try {
      const { data } = await api.get(`/websites/${id}/widget-code`);
      return { success: true, embedCode: data.embedCode };
    } catch (error) {
      return { success: false };
    }
  },
}));

export default useWebsiteStore;
