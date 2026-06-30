import { create } from 'zustand';
import api from '../services/api';

const useConversationStore = create((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  isLoading: false,
  filter: 'all', // all, open, resolved, pending, bot
  selectedWebsiteId: '',
  unreadTotal: 0,
  typingUsers: {}, // { conversationId: { sender, senderName } }

  setFilter: (filter) => set({ filter }),
  setSelectedWebsiteId: (id) => set({ selectedWebsiteId: id }),

  fetchConversations: async () => {
    set({ isLoading: true });
    try {
      const { filter, selectedWebsiteId } = get();
      const params = {};
      if (filter !== 'all') params.status = filter;
      if (selectedWebsiteId) params.websiteId = selectedWebsiteId;
      const { data } = await api.get('/conversations', { params });
      const convs = data.conversations || [];
      const unreadTotal = convs.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      set({ conversations: convs, unreadTotal, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  fetchConversation: async (id) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/conversations/${id}`);
      set({
        activeConversation: data.conversation,
        messages: data.messages || [],
        isLoading: false,
      });
      // Mark as read locally
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c._id === id ? { ...c, unreadCount: 0 } : c
        ),
      }));
    } catch (error) {
      set({ isLoading: false });
    }
  },

  sendMessage: async (conversationId, content, type = 'text') => {
    try {
      const { data } = await api.post(`/conversations/${conversationId}/messages`, {
        content, type,
      });
      set((state) => ({
        messages: [...state.messages, data.message],
        conversations: state.conversations.map((c) =>
          c._id === conversationId
            ? { ...c, lastMessage: content, lastMessageAt: new Date() }
            : c
        ),
      }));
      return data.message;
    } catch (error) {
      throw error;
    }
  },

  addIncomingMessage: (message, conversationId) => {
    set((state) => {
      const isActive = state.activeConversation?._id === conversationId;
      const updatedMessages = isActive
        ? [...state.messages, message]
        : state.messages;

      const updatedConvs = state.conversations.map((c) => {
        if (c._id === conversationId) {
          return {
            ...c,
            lastMessage: message.content,
            lastMessageAt: new Date(),
            unreadCount: isActive ? 0 : (c.unreadCount || 0) + 1,
          };
        }
        return c;
      });

      // Sort by lastMessageAt
      updatedConvs.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

      const unreadTotal = updatedConvs.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

      return { messages: updatedMessages, conversations: updatedConvs, unreadTotal };
    });
  },

  resolveConversation: async (id) => {
    try {
      await api.put(`/conversations/${id}/resolve`);
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c._id === id ? { ...c, status: 'resolved' } : c
        ),
        activeConversation: state.activeConversation?._id === id
          ? { ...state.activeConversation, status: 'resolved' }
          : state.activeConversation,
      }));
    } catch (error) {
      throw error;
    }
  },

  assignConversation: async (id, agentId) => {
    try {
      const { data } = await api.put(`/conversations/${id}/assign`, { agentId });
      set((state) => ({
        activeConversation: state.activeConversation?._id === id
          ? { ...state.activeConversation, assignedAgent: data.conversation.assignedAgent }
          : state.activeConversation,
      }));
    } catch (error) {
      throw error;
    }
  },

  setTyping: (conversationId, sender, senderName, isTyping) => {
    set((state) => {
      const typing = { ...state.typingUsers };
      if (isTyping) {
        typing[conversationId] = { sender, senderName };
      } else {
        delete typing[conversationId];
      }
      return { typingUsers: typing };
    });
  },

  clearActiveConversation: () => set({ activeConversation: null, messages: [] }),

  updateConversationFromSocket: (data) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c._id === data.conversationId
          ? { ...c, lastMessage: data.lastMessage, lastMessageAt: data.lastMessageAt, unreadCount: (c.unreadCount || 0) + 1 }
          : c
      ).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)),
    }));
  },
}));

export default useConversationStore;
