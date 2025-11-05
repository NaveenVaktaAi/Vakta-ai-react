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
  subject?: string;
  topic?: string;  // ✅ Add topic field
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
};

export function buildTutorWsUrl(conversationId: string) {
  const WS_BASE = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:5000';
  return `${WS_BASE}/api/v1/ai-tutor/conversation/ws/${conversationId}`;
}


