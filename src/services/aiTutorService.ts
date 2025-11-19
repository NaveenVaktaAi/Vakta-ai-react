/*
  AI Tutor REST service
  Uses configured api instance with authentication interceptors.
*/

import api from './api';

function buildHttpUrl(path: string) {
  // api instance already has baseURL configured, just return the path
  return path;
}

export interface CreateConversationPayload {
  exam_type?: string;
  exam_name?: string;
  subject?: string;
  topic?: string;
  tags?: string[];
  // user_id removed - backend gets it from authentication middleware
}

export interface StudentExamInfo {
  exam_type: string;
  exam_target: string | null;
  board: string | null;
  current_class: string | null;
}

export interface ConversationSummary {
  conversation_id: string;
  subject?: string;
  created_at?: string;
  updated_at?: string;
}

export const aiTutorService = {
  async createConversation(payload: CreateConversationPayload) {
    const res = await api.post(buildHttpUrl('/ai-tutor/conversation'), payload);
    return res.data as { success: boolean; data?: { conversation_id: string } };
  },

  async listUserConversations() {
    // userId removed - backend gets it from authentication middleware
    const res = await api.get(buildHttpUrl('/ai-tutor/conversations/user'));
    return res.data as { success: boolean; data?: ConversationSummary[] };
  },

  async endConversation(conversationId: string) {
    const res = await api.put(buildHttpUrl(`/ai-tutor/conversation/${conversationId}/end`));
    return res.data as { success: boolean };
  },

  async explainConcept(conversationId: string, subject: string, topic: string) {
    const formData = new FormData();
    formData.append('conversation_id', conversationId);
    formData.append('subject', subject);
    formData.append('topic', topic);
    
    const res = await api.post(buildHttpUrl('/ai-tutor/explain-concept'), formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data as { 
      success: boolean; 
      data?: { 
        explanation: string; 
        subject: string; 
        topic: string; 
        conversation_id: string;
        web_results_used: boolean;
      } 
    };
  },

  async practiceProblem(conversationId: string, subject: string, topic: string) {
    const formData = new FormData();
    formData.append('conversation_id', conversationId);
    formData.append('subject', subject);
    formData.append('topic', topic);
    
    const res = await api.post(buildHttpUrl('/ai-tutor/practice-problem'), formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data as { 
      success: boolean; 
      data?: { 
        problem: string; 
        subject: string; 
        topic: string; 
        conversation_id: string;
        web_results_used: boolean;
      } 
    };
  },

  async studyGuide(conversationId: string, subject: string, topic: string) {
    const formData = new FormData();
    formData.append('conversation_id', conversationId);
    formData.append('subject', subject);
    formData.append('topic', topic);
    
    const res = await api.post(buildHttpUrl('/ai-tutor/study-guide'), formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data as { 
      success: boolean; 
      data?: { 
        guide: string; 
        subject: string; 
        topic: string; 
        conversation_id: string;
        web_results_used: boolean;
      } 
    };
  },

  async keyPoints(conversationId: string, subject: string, topic: string) {
    const formData = new FormData();
    formData.append('conversation_id', conversationId);
    formData.append('subject', subject);
    formData.append('topic', topic);
    
    const res = await api.post(buildHttpUrl('/ai-tutor/key-points'), formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data as { 
      success: boolean; 
      data?: { 
        key_points: string; 
        subject: string; 
        topic: string; 
        conversation_id: string;
        web_results_used: boolean;
      } 
    };
  },

  async getExamConversations(examType: string) {
    // userId removed - backend gets it from authentication middleware
    const res = await api.get(buildHttpUrl(`/ai-tutor/conversations/exam/${encodeURIComponent(examType)}`));
    return res.data as { [subject: string]: ConversationSummary[] };
  },

  async getConversation(conversationId: string) {
    const res = await api.get(buildHttpUrl(`/ai-tutor/conversations/${conversationId}`));
    return res.data as {
      _id: string;
      exam_type?: string;
      exam_name?: string;
      subject?: string;
      topic?: string;
      messages?: any[];
      explain_concept?: any;
      practice_problem?: any;
      study_guide?: any;
      key_points?: any;
    };
  },

  async getStudentExamInfo() {
    const res = await api.get(buildHttpUrl('/ai-tutor/student-exam-info'));
    return res.data as { success: boolean; data?: StudentExamInfo };
  },
};

export function buildTutorWsUrl(conversationId: string) {
  const WS_BASE = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:5000';
  // Get token from localStorage for WebSocket authentication (if needed)
  const token = localStorage.getItem('access_token');
  // Note: WebSocket doesn't support headers, but we validate conversation ownership on message processing
  return `${WS_BASE}/api/v1/ai-tutor/conversation/ws/${conversationId}`;
}


