import api from './api';

export interface DocumentChat {
  chat_id: string; // Backend returns chat_id, not _id
  _id?: string; // Keep for backward compatibility
  user_id: string;
  document_id?: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message?: string;
  message_count?: number;
}

export interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

export interface DocumentTextResponse {
  summary?: string;
  type: string;
  document_url?: string;
  document_name?: string;
  ai_notes?: {
    title: string;
    notes: string[];
    generated_at?: string;
  };
  transcript_segments?: TranscriptSegment[]; // ✅ Timestamped transcript for YouTube videos
}

export interface DocumentSummary {
  summary: string;
  key_points: string[];
  word_count?: number;
  reading_time?: string;
  title?: string;
}

export interface DocumentNotes {
  notes: string[];
  title?: string;
}

export interface DocumentQuiz {
  quiz_id?: string;
  quiz_name?: string;
  level?: 'easy' | 'medium' | 'hard';
  total_questions?: number;
  estimated_time?: string;
  title?: string;
}

export const documentService = {
  // Get document chats
  getDocumentChats: async (documentId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; data?: DocumentChat[]; message?: string }> => {
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.offset) params.append('offset', options.offset.toString());
      
      const queryString = params.toString();
      const endpoint = `/docSathi/documents/${documentId}/chats${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(endpoint);
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('Error getting document chats:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get document chats'
      };
    }
  },

  // Get document text content
  getDocumentText: async (documentId: string): Promise<{ success: boolean; data?: DocumentTextResponse; message?: string }> => {
    try {
      const response = await api.get(`/docSathi/documents/${documentId}/text`);
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('Error getting document text:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get document text'
      };
    }
  },

  // Generate document summary
  generateSummary: async (documentId: string): Promise<{ success: boolean; data?: DocumentSummary; message?: string }> => {
    try {
      const response = await api.post(`/docSathi/documents/${documentId}/summary`);
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('Error generating summary:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to generate summary'
      };
    }
  },

  // Generate document notes
  generateNotes: async (documentId: string): Promise<{ success: boolean; data?: DocumentNotes; message?: string }> => {
    try {
      const response = await api.post(`/docSathi/documents/${documentId}/notes`);
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('Error generating notes:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to generate notes'
      };
    }
  },

  // Generate quiz from document
  generateQuiz: async (request: {
    quiz_name: string;
    document_id: string;
    user_id: string;
    level: 'easy' | 'medium' | 'hard';
    number_of_questions: number;
  }): Promise<{ success: boolean; data?: DocumentQuiz; message?: string }> => {
    try {
      const response = await api.post('/docSathi/generate-quiz', request);
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('Error generating quiz:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to generate quiz'
      };
    }
  },

  // Get document quizzes
  getDocumentQuizzes: async (documentId: string): Promise<{ success: boolean; data?: any[]; message?: string }> => {
    try {
      const response = await api.get(`/docSathi/documents/${documentId}/quizzes`);
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('Error getting document quizzes:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get document quizzes'
      };
    }
  },

  // Submit quiz answers
  submitQuiz: async (quizId: string, answers: any[]): Promise<{ success: boolean; data?: any; message?: string }> => {
    try {
      const response = await api.post(`/docSathi/quizzes/${quizId}/submit`, { answers });
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('Error submitting quiz:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to submit quiz'
      };
    }
  }
};

