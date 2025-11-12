import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, MessageSquare, Clock, BookOpen, Loader2, Plus } from 'lucide-react';
import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

function buildHttpUrl(path: string) {
  const hasApiPrefix = API_BASE.includes('/api/v1');
  const base = hasApiPrefix ? API_BASE : `${API_BASE}/api/v1`;
  return `${base}${path}`;
}

interface Conversation {
  _id: string;
  title: string;
  subject?: string;
  topic?: string;
  status: string;
  created_at: string;
  updated_at: string;
  messages?: any[];
}

interface GroupedConversations {
  [subject: string]: Conversation[];
}

const examConfig: Record<string, { color: string; gradient: string; emoji: string; subjects: string[] }> = {
  'IIT JEE': {
    color: 'blue',
    gradient: 'from-blue-500 to-indigo-600',
    emoji: '🎓',
    subjects: ['Mathematics', 'Physics', 'Chemistry']
  },
  'NEET': {
    color: 'green',
    gradient: 'from-green-500 to-emerald-600',
    emoji: '🔬',
    subjects: ['Physics', 'Chemistry', 'Biology']
  },
  'General Conversation': {
    color: 'purple',
    gradient: 'from-purple-500 to-pink-600',
    emoji: '💬',
    subjects: []
  }
};

const subjectEmojis: Record<string, string> = {
  'Mathematics': '📐',
  'Physics': '⚛️',
  'Chemistry': '🧪',
  'Biology': '🧬',
  'Other': '📚'
};

const subjectColors: Record<string, string> = {
  'Mathematics': 'from-blue-500 to-cyan-500',
  'Physics': 'from-purple-500 to-pink-500',
  'Chemistry': 'from-green-500 to-teal-500',
  'Biology': 'from-emerald-500 to-lime-500',
  'Other': 'from-gray-500 to-gray-600'
};

export default function ExamConversations() {
  const { examType } = useParams<{ examType: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [groupedConversations, setGroupedConversations] = useState<GroupedConversations>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const decodedExamType = examType ? decodeURIComponent(examType) : '';
  const config = decodedExamType ? examConfig[decodedExamType] || examConfig['General Conversation'] : examConfig['General Conversation'];

  useEffect(() => {
    // Wait for user to be available
    if (!user) {
      console.log('[ExamConversations] Waiting for user...', { user });
      return;
    }

    if (!examType) {
      console.log('[ExamConversations] Missing examType in URL');
      setError('Exam type not specified');
      setLoading(false);
      return;
    }

    // TODO: Get actual numeric user_id from user object or JWT
    // For now, using hardcoded value like other pages (AiTutor uses userId = 1)
    // Backend expects integer user_id, but MongoDB _id is ObjectId string
    const userId = 1; // Temporary: should be extracted from user._id or JWT token

    const fetchConversations = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Decode exam type from URL
        const decodedExamType = decodeURIComponent(examType);
        console.log('[ExamConversations] Fetching conversations for:', { 
          decodedExamType, 
          userId: userId,
          user: user,
          user_id: user._id
        });
        
        const apiUrl = buildHttpUrl(`/ai-tutor/conversations/exam/${userId}/${encodeURIComponent(decodedExamType)}`);
        console.log('[ExamConversations] API URL:', apiUrl);
        console.log('[ExamConversations] API Base:', API_BASE);
        
        const response = await axios.get(apiUrl);
        console.log('[ExamConversations] API Response:', response.data);
        
        setGroupedConversations(response.data || {});
      } catch (err: any) {
        console.error('[ExamConversations] Error fetching conversations:', err);
        console.error('[ExamConversations] Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          statusText: err.response?.statusText,
          url: err.config?.url,
          headers: err.config?.headers
        });
        setError(err.response?.data?.detail || err.message || 'Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [examType, user]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    
    try {
      // Parse the date string - handle ISO format and other formats
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('[ExamConversations] Invalid date string:', dateString);
        return 'Unknown';
      }
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      
      // Handle negative differences (future dates)
      if (diffMs < 0) {
        return 'Just now';
      }
      
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      const diffWeeks = Math.floor(diffDays / 7);
      const diffMonths = Math.floor(diffDays / 30);

      // Format relative time
      if (diffSeconds < 60) return 'Just now';
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
      if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
      
      // For older dates, show formatted date
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch (error) {
      console.error('[ExamConversations] Error formatting date:', error, dateString);
      return 'Unknown';
    }
  };

  const handleConversationClick = (conversationId: string) => {
    navigate(`/ai-tutor?conversation=${conversationId}`);
  };

  const handleNewConversation = () => {
    const decodedExamType = examType ? decodeURIComponent(examType) : '';
    // Navigate with exam type in URL, so subject dialog will skip exam step
    navigate(`/ai-tutor?exam=${encodeURIComponent(decodedExamType)}`);
  };

  const subjects = Object.keys(groupedConversations).sort((a, b) => {
    const order = config.subjects;
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className={`bg-gradient-to-r ${config.gradient} text-white shadow-lg`}>
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <span className="text-3xl sm:text-4xl">{config.emoji}</span>
                {decodedExamType || 'Conversations'}
              </h1>
              <p className="text-white/90 mt-1">Your learning conversations organized by subject</p>
            </div>
          </div>
          <button
            onClick={handleNewConversation}
            className={`bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 shadow-lg hover:shadow-xl`}
          >
            <Plus className="w-5 h-5" />
            Start New Conversation
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {subjects.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">{config.emoji}</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No conversations yet</h2>
            <p className="text-gray-600 mb-6">Start your first conversation to begin learning!</p>
            <button
              onClick={handleNewConversation}
              className={`bg-gradient-to-r ${config.gradient} text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all inline-flex items-center gap-2`}
            >
              <Plus className="w-5 h-5" />
              Start Learning
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {subjects.map((subject) => {
              const conversations = groupedConversations[subject];
              const emoji = subjectEmojis[subject] || '📚';
              const colorGradient = subjectColors[subject] || 'from-gray-500 to-gray-600';

              return (
                <div key={subject} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  {/* Subject Header */}
                  <div className={`bg-gradient-to-r ${colorGradient} text-white p-4 sm:p-6`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{emoji}</span>
                        <div>
                          <h2 className="text-xl sm:text-2xl font-bold">{subject}</h2>
                          <p className="text-white/90 text-sm">
                            {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Conversations List */}
                  <div className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {conversations.map((conversation) => (
                        <div
                          key={conversation._id}
                          onClick={() => handleConversationClick(conversation._id)}
                          className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                {conversation.topic || conversation.title || 'Untitled Conversation'}
                              </h3>
                              {conversation.topic && conversation.title && conversation.title !== conversation.topic && (
                                <p className="text-sm text-gray-500 truncate mt-1">{conversation.title}</p>
                              )}
                            </div>
                            <MessageSquare className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                          </div>

                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{formatDate(conversation.updated_at)}</span>
                            </div>
                            {conversation.messages && conversation.messages.length > 0 && (
                              <div className="flex items-center gap-1">
                                <BookOpen className="w-4 h-4" />
                                <span>{conversation.messages.length}</span>
                              </div>
                            )}
                          </div>

                          {conversation.status === 'active' && (
                            <div className="mt-2">
                              <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                Active
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

