/*
  AI Tutor REST service
  Uses VITE_API_BASE_URL for HTTP calls.
*/

import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

function buildHttpUrl(path: string) {
  // Ensure we only have one /api/v1 in the final URL
  const hasApiPrefix = API_BASE.includes('/api/v1');
  const base = hasApiPrefix ? API_BASE : `${API_BASE}/api/v1`;
  return `${base}${path}`;
}

export interface CreateConversationPayload {
  exam_type?: string;
  exam_name?: string;
  subject?: string;
  topic?: string;
  tags?: string[];
  user_id?: number;
}

export interface ConversationSummary {
  conversation_id: string;
  subject?: string;
  created_at?: string;
  updated_at?: string;
}

export const aiTutorService = {
  async createConversation(payload: CreateConversationPayload) {
    const res = await axios.post(buildHttpUrl('/ai-tutor/conversation'), payload);
    return res.data as { success: boolean; data?: { conversation_id: string } };
  },

  async listUserConversations(userId: number) {
    const res = await axios.get(buildHttpUrl(`/ai-tutor/conversations/user/${userId}`));
    return res.data as { success: boolean; data?: ConversationSummary[] };
  },

  async endConversation(conversationId: string) {
    const res = await axios.put(buildHttpUrl(`/ai-tutor/conversation/${conversationId}/end`));
    return res.data as { success: boolean };
  },

  async explainConcept(conversationId: string, subject: string, topic: string) {
    const formData = new FormData();
    formData.append('conversation_id', conversationId);
    formData.append('subject', subject);
    formData.append('topic', topic);
    
    const res = await axios.post(buildHttpUrl('/ai-tutor/explain-concept'), formData, {
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
    
    const res = await axios.post(buildHttpUrl('/ai-tutor/practice-problem'), formData, {
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
    
    const res = await axios.post(buildHttpUrl('/ai-tutor/study-guide'), formData, {
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
    
    const res = await axios.post(buildHttpUrl('/ai-tutor/key-points'), formData, {
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

  async getExamConversations(userId: number, examType: string) {
    const res = await axios.get(buildHttpUrl(`/ai-tutor/conversations/exam/${userId}/${encodeURIComponent(examType)}`));
    return res.data as { [subject: string]: ConversationSummary[] };
  },

  async getConversation(conversationId: string) {
    const res = await axios.get(buildHttpUrl(`/ai-tutor/conversations/${conversationId}`));
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
};

export function buildTutorWsUrl(conversationId: string) {
  const WS_BASE = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:5000';
  return `${WS_BASE}/api/v1/ai-tutor/conversation/ws/${conversationId}`;
}


