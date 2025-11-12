import api from './api';

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: string;
  metadata?: any;
}

export const chatService = {
  // Create a new chat
  createChat: async (data: {
    document_id: string | null;
    title: string;
    status: string; // Changed from is_active boolean to status string
  }) => {
    try {
      const response = await api.post('/chat/', data);
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('Error creating chat:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Failed to create chat'
      };
    }
  },

  // Get chat with messages
  getChatWithMessages: async (chatId: string, page: number = 1, limit: number = 50) => {
    try {
      const response = await api.get(`/chat/${chatId}/full?page=${page}&limit=${limit}`);
      console.log('getChatWithMessages response:', response);
      console.log('response.data:', response.data);
      
      // Backend returns ChatWithMessages: { chat, messages, total_messages }
      if (response.data) {
        return {
          success: true,
          data: response.data // { chat, messages, total_messages }
        };
      }
      
      return {
        success: false,
        message: 'No data received'
      };
    } catch (error: any) {
      console.error('Error getting chat with messages:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Failed to get chat messages'
      };
    }
  },

  // Get user chats
  getUserChats: async (userId: number, page: number = 1, limit: number = 20) => {
    try {
      const response = await api.get(`/chat/user/${userId}?page=${page}&limit=${limit}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Error getting user chats:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Failed to get user chats'
      };
    }
  },

  // Update chat
  updateChat: async (chatId: string, data: any) => {
    try {
      const response = await api.put(`/chat/${chatId}`, data);
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('Error updating chat:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Failed to update chat'
      };
    }
  },

  // Delete chat
  deleteChat: async (chatId: string) => {
    try {
      const response = await api.delete(`/chat/${chatId}`);
      return {
        success: response.data.success,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('Error deleting chat:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Failed to delete chat'
      };
    }
  }
};

