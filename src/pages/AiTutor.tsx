import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAiTutorWebSocket, TutorMessage, TokenLimitData } from '../hooks/useAiTutorWebSocket';
import { SubjectSelectionDialog } from '../components/SubjectSelectionDialog';
import FormattedMessage from '../components/FormattedMessage';
import { ExplainConceptModal } from '../components/ExplainConceptModal';
import { aiTutorService } from '../services/aiTutorService';
import TokenLimitModal from '../components/TokenLimitModal';

// File upload interface (images + PDFs)
interface UploadedFile {
  file: File;
  preview: string;
  id: string;
  type: 'image' | 'pdf';
}

// Speech Recognition types
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: {
    transcript: string;
  };
}

export default function AiTutor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const conversationIdFromUrl = searchParams.get('conversation');
  const examTypeFromUrl = searchParams.get('exam');
  
  // Helper function to encode conversation ID (simple base64 encoding)
  const encodeConversationId = useCallback((id: string): string => {
    try {
      return btoa(id).replace(/[+/=]/g, (match) => {
        if (match === '+') return '-';
        if (match === '/') return '_';
        return '';
      });
    } catch {
      return encodeURIComponent(id);
    }
  }, []);
  
  // Helper function to decode conversation ID
  const decodeConversationId = useCallback((encoded: string): string => {
    try {
      const base64 = encoded.replace(/[-_]/g, (match) => {
        if (match === '-') return '+';
        if (match === '_') return '/';
        return match;
      });
      return atob(base64);
    } catch {
      return decodeURIComponent(encoded);
    }
  }, []);
  
  // Update URL when conversation ID changes
  const updateConversationUrl = useCallback((conversationId: string | null) => {
    if (conversationId) {
      const encodedId = encodeConversationId(conversationId);
      const newParams = new URLSearchParams(searchParams);
      newParams.set('conversation', encodedId);
      
      // Keep exam type if exists
      if (examTypeFromUrl) {
        newParams.set('exam', examTypeFromUrl);
      }
      
      // Update URL without reload
      navigate(`/ai-tutor?${newParams.toString()}`, { replace: true });
    }
  }, [navigate, searchParams, examTypeFromUrl, encodeConversationId]);
  
  const [examType, setExamType] = useState<string>('');
  const [examTarget, setExamTarget] = useState<string | null>(null); // exam_target from student profile
  const [subject, setSubject] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [showSubjectDialog, setShowSubjectDialog] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [isLoadingExistingConversation, setIsLoadingExistingConversation] = useState(false); // Track if loading existing conversation
  const [loadingStudentInfo, setLoadingStudentInfo] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [avatarExpanded, setAvatarExpanded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadedFilesRef = useRef<UploadedFile[]>([]); // Ref to track files during recording
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const messageSentRef = useRef<boolean>(false);
  const userId = 1;
  
  // Token limit modal state
  const [tokenLimitData, setTokenLimitData] = useState<TokenLimitData | null>(null);
  const [showTokenLimitModal, setShowTokenLimitModal] = useState(false);
  
  // Token limit handler - only show modal if upgrade is required (not for premium daily quota)
  const handleTokenLimitExceeded = useCallback((data: TokenLimitData) => {
    setTokenLimitData(data);
    // ✅ Only show modal if upgrade is required and not daily limit exceeded
    // Show modal only if: upgradeRequired is true AND dailyLimitExceeded is not true
    // Don't show modal for premium users (upgradeRequired=false) or daily quota exceeded
    if (data.upgradeRequired === true && data.dailyLimitExceeded !== true) {
      setShowTokenLimitModal(true);
    }
  }, []);
  
  const closeTokenLimitModal = useCallback(() => {
    setShowTokenLimitModal(false);
    setTokenLimitData(null);
  }, []);

  const {
    messages,
    setMessages,
    isTyping,
    thinkingMessage,
    thinkingStatus,
    isStreaming,
    isConnected,
    connectionStatus,
    currentConversationId,
    setCurrentConversationId,
    createNewConversation,
    endConversation,
    sendMessage,
    connect,
  } = useAiTutorWebSocket(userId, handleTokenLimitExceeded);

  // Memoize filtered messages to prevent unnecessary re-renders and flickering
  // ✅ IMPORTANT: Don't filter out messages that are currently streaming (even if empty)
  // This ensures streaming messages are visible during streaming
  const filteredMessages = useMemo(() => {
    return messages.filter((m, idx) => {
      // Keep message if it has content
      if (m.content && m.content.trim().length > 0) return true;
      // Keep message if it's the last assistant message and streaming is active
      // (stream_start creates empty assistant messages that will be filled during streaming)
      const isLastAssistant = idx === messages.length - 1 && m.role === 'assistant';
      if (isLastAssistant && isStreaming) return true;
      // Filter out empty user messages and other empty messages
      return false;
    });
  }, [messages, isStreaming]);

  // Get the last message for streaming check
  const lastMessageIndex = useMemo(() => {
    return filteredMessages.length - 1;
  }, [filteredMessages.length]);

  // ✅ Fetch student exam info on mount (before showing dialog)
  useEffect(() => {
    const fetchStudentExamInfo = async () => {
      try {
        setLoadingStudentInfo(true);
        const response = await aiTutorService.getStudentExamInfo();
        if (response.success && response.data) {
          setExamType(response.data.exam_type);
          setExamTarget(response.data.exam_target);
          console.log('[AiTutor] Student exam info loaded:', response.data);
        }
      } catch (error) {
        console.error('[AiTutor] Failed to load student exam info:', error);
        // Default to General Conversation if fetch fails
        setExamType('General Conversation');
      } finally {
        setLoadingStudentInfo(false);
      }
    };
    
    fetchStudentExamInfo();
  }, []);

  // ✅ Show dialog after student info is loaded (if no conversation exists)
  useEffect(() => {
    if (!loadingStudentInfo && !conversationIdFromUrl && !currentConversationId && !subject && !topic) {
      // Student info loaded, no conversation, no subject/topic - show dialog
      setShowSubjectDialog(true);
    }
  }, [loadingStudentInfo, conversationIdFromUrl, currentConversationId, subject, topic]);

  // Load existing conversation from URL
  useEffect(() => {
    if (conversationIdFromUrl && conversationIdFromUrl !== currentConversationId) {
      const loadExistingConversation = async () => {
        try {
          setLoadingConversation(true);
          setIsLoadingExistingConversation(true); // Mark that we're loading existing conversation
          
          // Decode conversation ID from URL
          const decodedId = decodeConversationId(conversationIdFromUrl);
          console.log('[AiTutor] Loading existing conversation:', decodedId);
          
          // Get conversation details
          const conversation = await aiTutorService.getConversation(decodedId);
          
          // Set exam type, subject, topic from conversation
          if (conversation.exam_type) setExamType(conversation.exam_type);
          if (conversation.subject) setSubject(conversation.subject);
          if (conversation.topic) setTopic(conversation.topic);
          
          // Load existing messages from conversation
          if (conversation.messages && Array.isArray(conversation.messages) && conversation.messages.length > 0) {
            console.log('[AiTutor] Loading existing messages:', conversation.messages.length);
            console.log('[AiTutor] Sample message:', conversation.messages[0]);
            
            // Filter out quick action messages (they should only appear in modals, not in chat)
            const quickActionTypes = ['explain_concept', 'practice_problem', 'study_guide', 'key_points'];
            
            const loadedMessages: TutorMessage[] = conversation.messages
              .filter((msg: any) => {
                // Filter out empty messages and quick action messages
                if (!msg || !msg.message) return false;
                if (msg.type && quickActionTypes.includes(msg.type)) {
                  console.log('[AiTutor] Filtering out quick action message:', msg.type);
                  return false;
                }
                return true;
              })
              .map((msg: any) => {
                const role = msg.is_bot ? 'assistant' : 'user';
                const content = msg.message || '';
                console.log('[AiTutor] Loading message:', { role, content: content.substring(0, 50) + '...' });
                
                return {
                  role: role as 'user' | 'assistant',
                  content: content,
                  id: msg.token || msg._id || Math.random().toString(),
                  createdAt: msg.created_ts || msg.created_at || new Date().toISOString(),
                  files: msg.files || undefined
                };
              });
            
            console.log('[AiTutor] ✅ Messages loaded:', loadedMessages.length, '(after filtering quick actions)');
            console.log('[AiTutor] First message:', loadedMessages[0]);
            console.log('[AiTutor] Last message:', loadedMessages[loadedMessages.length - 1]);
            
            setMessages(loadedMessages);
          } else {
            console.log('[AiTutor] No messages found in conversation. Messages:', conversation.messages);
            setMessages([]);
          }
          
          // Load existing quick action data if available
          if (conversation.explain_concept && conversation.explain_concept.explanation) {
            console.log('[AiTutor] Loading existing explain_concept data');
            setExplanation(conversation.explain_concept.explanation);
          }
          if (conversation.practice_problem && conversation.practice_problem.problem) {
            console.log('[AiTutor] Loading existing practice_problem data');
            setPracticeProblem(conversation.practice_problem.problem);
          }
          if (conversation.study_guide && conversation.study_guide.guide) {
            console.log('[AiTutor] Loading existing study_guide data');
            setStudyGuide(conversation.study_guide.guide);
          }
          if (conversation.key_points && conversation.key_points.key_points) {
            console.log('[AiTutor] Loading existing key_points data');
            setKeyPoints(conversation.key_points.key_points);
          }
          
          // Set conversation ID and connect
          setCurrentConversationId(decodedId);
          connect(decodedId);
          
          // Ensure subject dialog is closed when conversation is loaded
          setShowSubjectDialog(false);
          
          console.log('[AiTutor] ✅ Existing conversation loaded:', conversation);
        } catch (error) {
          console.error('[AiTutor] ❌ Failed to load conversation:', error);
          // If conversation not found, show subject dialog
          if (examTypeFromUrl) {
            setExamType(examTypeFromUrl);
            setShowSubjectDialog(true);
          } else {
            setShowSubjectDialog(true);
          }
        } finally {
          setLoadingConversation(false);
          setIsLoadingExistingConversation(false); // Mark that loading is complete
        }
      };
      
      loadExistingConversation();
    } else if (!conversationIdFromUrl && !currentConversationId) {
      // ✅ Wait for student info to load before showing dialog
      if (loadingStudentInfo) {
        return; // Don't show dialog while loading
      }
      
      // No conversation ID in URL - check if exam type is provided
      if (examTypeFromUrl) {
        setExamType(examTypeFromUrl);
        setShowSubjectDialog(true);
      } else if (!subject && !topic) {
        // No params at all - show dialog only after student info is loaded
        // examType might be set from student profile, but we still need subject/topic
        setShowSubjectDialog(true);
      }
    } else if (conversationIdFromUrl && currentConversationId) {
      // If we have both URL conversation ID and current conversation ID, ensure dialog is closed
      setShowSubjectDialog(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationIdFromUrl, examTypeFromUrl, currentConversationId, setCurrentConversationId, connect, setMessages, decodeConversationId, loadingStudentInfo]);

  useEffect(() => {
    if (examType && subject && topic && !currentConversationId && !conversationIdFromUrl) {
      createNewConversation(examType, subject, topic)
        .then((conversationId) => {
          if (conversationId) {
            // Update URL with new conversation ID
            updateConversationUrl(conversationId);
          }
        })
        .catch(() => undefined);
    }
  }, [examType, subject, topic, currentConversationId, conversationIdFromUrl, createNewConversation, updateConversationUrl]);
  
  // Update URL when currentConversationId changes (from other sources)
  useEffect(() => {
    if (currentConversationId && currentConversationId !== conversationIdFromUrl) {
      // Decode current URL ID to compare
      let decodedUrlId = null;
      if (conversationIdFromUrl) {
        try {
          decodedUrlId = decodeConversationId(conversationIdFromUrl);
        } catch {
          decodedUrlId = conversationIdFromUrl;
        }
      }
      
      // Only update URL if IDs don't match
      if (decodedUrlId !== currentConversationId) {
        updateConversationUrl(currentConversationId);
      }
    }
  }, [currentConversationId, conversationIdFromUrl, decodeConversationId, updateConversationUrl]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Debug: Log messages changes
  useEffect(() => {
    console.log('[AiTutor] Messages updated:', messages.length, 'messages');
    if (messages.length > 0) {
      console.log('[AiTutor] First message:', messages[0]);
      console.log('[AiTutor] Last message:', messages[messages.length - 1]);
    }
  }, [messages]);

  const handleSend = async () => {
    const text = inputValue.trim();
    console.log('[Send Button] 🚀 handleSend called. Files count:', uploadedFiles.length);
    
    if ((!text && uploadedFiles.length === 0) || isTyping || !isConnected) return;

    // Separate images and PDFs
    const images = uploadedFiles.filter(f => f.type === 'image');
    const pdfs = uploadedFiles.filter(f => f.type === 'pdf');

    // Store file previews for chat display before clearing
    const filePreviews = uploadedFiles.map(file => ({
      preview: file.preview,
      id: file.id,
      type: file.type,
      name: file.file.name
    }));
    
    console.log('[Send Button] 📁 Files before send:', uploadedFiles.length);
    console.log('[Send Button] 🖼️ Images:', images.length);
    console.log('[Send Button] 📄 PDFs:', pdfs.length);

    // Default message based on uploads
    let defaultMessage = 'Please analyze this content';
    if (images.length > 0 && pdfs.length > 0) {
      defaultMessage = 'Please analyze these images and documents';
    } else if (images.length > 0) {
      defaultMessage = 'Please analyze these images';
    } else if (pdfs.length > 0) {
      defaultMessage = 'Please analyze this document';
    }

    // Audio behavior:
    // - In expanded view: Always generate audio (isAudio: true) - both text and voice input
    // - In normal view: Only generate audio for voice input (isAudio: false for text)
    const shouldGenerateAudio = avatarExpanded; // If expanded, always generate audio
    
    await sendMessage(text || defaultMessage, { 
      isAudio: shouldGenerateAudio, // Generate audio in expanded view, no audio in normal view for text
      images: images.length > 0 ? images : undefined,
      pdfs: pdfs.length > 0 ? pdfs : undefined,
      filePreviews: filePreviews  // Pass previews for chat display
    });
    
    setInputValue('');
    console.log('[Send Button] 🗑️ About to clear files...');
    // Clear files after sending (but keep previews in memory for chat)
    setUploadedFiles([]);
    uploadedFilesRef.current = []; // Also clear ref
    console.log('[Send Button] ✅ Files cleared from state and ref');
  };

  // Handle file upload (images + PDFs)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    console.log('[File Upload] 📁 Selected files:', files.length);
    console.log('[File Upload] 📊 Current state before upload:', uploadedFiles.length);
    
    // Limit to 3 files total
    const remainingSlots = 3 - uploadedFiles.length;
    const filesToAdd = files.slice(0, remainingSlots);
    
    const newFiles: UploadedFile[] = filesToAdd.map(file => {
      const isPDF = file.type === 'application/pdf';
      console.log('[File Upload] 📄 Processing file:', file.name, 'Type:', file.type);
      return {
        file,
        preview: isPDF ? '' : URL.createObjectURL(file), // No preview URL for PDFs
        id: Math.random().toString(36).substr(2, 9),
        type: isPDF ? 'pdf' : 'image'
      };
    });
    
    setUploadedFiles(prev => {
      const updated = [...prev, ...newFiles];
      uploadedFilesRef.current = updated; // Also update ref
      console.log('[File Upload] ✅ Updated uploaded files. Total:', updated.length);
      console.log('[File Upload] 📋 Files:', updated.map(f => f.file.name));
      console.log('[File Upload] 🔒 Files are now stored in state AND ref');
      return updated;
    });
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove file from preview
  const removeFile = (id: string) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove && fileToRemove.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      const updated = prev.filter(f => f.id !== id);
      uploadedFilesRef.current = updated; // Keep ref in sync
      return updated;
    });
  };

  // Cleanup file previews on unmount
  useEffect(() => {
    return () => {
      uploadedFiles.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExpandAvatar = () => setAvatarExpanded(true);
  const handleCloseAvatar = () => setAvatarExpanded(false);

  const quickActions = [
    { label: 'Explain Concept', action: 'explain' },
    { label: 'Practice Problem', action: 'practice' },
    { label: 'Study Guide', action: 'study' },
    { label: 'Key Points', action: 'keypoints' },
  ];

  // Explain Concept State
  const [showExplainModal, setShowExplainModal] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explanation, setExplanation] = useState<string>('');
  const [explanationError, setExplanationError] = useState<string>('');
  const explainConceptRequestRef = useRef<Promise<void> | null>(null);

  // Practice Problem State
  const [showPracticeModal, setShowPracticeModal] = useState(false);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceProblem, setPracticeProblem] = useState<string>('');
  const [practiceError, setPracticeError] = useState<string>('');
  const practiceProblemRequestRef = useRef<Promise<void> | null>(null);

  // Study Guide State
  const [showStudyModal, setShowStudyModal] = useState(false);
  const [studyLoading, setStudyLoading] = useState(false);
  const [studyGuide, setStudyGuide] = useState<string>('');
  const [studyError, setStudyError] = useState<string>('');
  const studyGuideRequestRef = useRef<Promise<void> | null>(null);

  // Key Points State
  const [showKeyPointsModal, setShowKeyPointsModal] = useState(false);
  const [keyPointsLoading, setKeyPointsLoading] = useState(false);
  const [keyPoints, setKeyPoints] = useState<string>('');
  const [keyPointsError, setKeyPointsError] = useState<string>('');
  const keyPointsRequestRef = useRef<Promise<void> | null>(null);

  // 🚀 Background API calls when topic is submitted and conversation is created
  // Explain Concept - First check GET API, then POST if data doesn't exist
  useEffect(() => {
    // Skip if loading existing conversation or if conversationIdFromUrl exists (existing conversation)
    if (isLoadingExistingConversation || conversationIdFromUrl) {
      console.log('[Explain Concept] ⏭️ Skipping API call - loading existing conversation');
      return;
    }
    
    if (subject && topic && currentConversationId && !explainConceptRequestRef.current && !explanation) {
      console.log('[Explain Concept] 🔍 Checking GET API first...', { subject, topic, conversationId: currentConversationId });
      
      explainConceptRequestRef.current = (async () => {
        try {
          // First, GET conversation to check if explain_concept data already exists
          const conversation = await aiTutorService.getConversation(currentConversationId);
          
          if (conversation.explain_concept && conversation.explain_concept.explanation) {
            console.log('[Explain Concept] ✅ Data found in GET API - using existing data');
            setExplanation(conversation.explain_concept.explanation);
            setExplanationError('');
          } else {
            // Data doesn't exist, call POST API to generate
            console.log('[Explain Concept] 📝 No data found, calling POST API to generate...');
            const response = await aiTutorService.explainConcept(currentConversationId, subject, topic);
            if (response.success && response.data) {
              console.log('[Explain Concept] ✅ POST API call completed!');
              setExplanation(response.data.explanation);
              setExplanationError('');
            } else {
              throw new Error('Failed to generate explanation');
            }
          }
        } catch (error: any) {
          console.error('[Explain Concept] ❌ API call failed:', error);
          
          // ✅ Check if it's a token limit error (403 with specific structure)
          if (error.response?.status === 403 && error.response?.data?.detail) {
            const detail = error.response.data.detail;
            if (typeof detail === 'string' || (detail.upgradeRequired && detail.service === 'aiTutor')) {
              // Show popup modal instead of error message
              setTokenLimitData({
                message: typeof detail === 'string' ? detail : (detail.message || 'Your free trial credits are running low.'),
                tokensRemaining: detail.tokensRemaining,
                service: 'aiTutor',
                upgradeRequired: true
              });
              setShowTokenLimitModal(true);
              return; // Don't set error message
            }
          }
          
          setExplanationError('Sorry, I encountered an error while generating the explanation. Please try again.');
        } finally {
          explainConceptRequestRef.current = null;
        }
      })();
    }
  }, [subject, topic, currentConversationId, conversationIdFromUrl, explanation, isLoadingExistingConversation]);

  // Practice Problem - First check GET API, then POST if data doesn't exist
  useEffect(() => {
    // Skip if loading existing conversation or if conversationIdFromUrl exists (existing conversation)
    if (isLoadingExistingConversation || conversationIdFromUrl) {
      console.log('[Practice Problem] ⏭️ Skipping API call - loading existing conversation');
      return;
    }
    
    if (subject && topic && currentConversationId && !practiceProblemRequestRef.current && !practiceProblem) {
      console.log('[Practice Problem] 🔍 Checking GET API first...', { subject, topic, conversationId: currentConversationId });
      
      practiceProblemRequestRef.current = (async () => {
        try {
          // First, GET conversation to check if practice_problem data already exists
          const conversation = await aiTutorService.getConversation(currentConversationId);
          
          if (conversation.practice_problem && conversation.practice_problem.problem) {
            console.log('[Practice Problem] ✅ Data found in GET API - using existing data');
            setPracticeProblem(conversation.practice_problem.problem);
            setPracticeError('');
          } else {
            // Data doesn't exist, call POST API to generate
            console.log('[Practice Problem] 📝 No data found, calling POST API to generate...');
            const response = await aiTutorService.practiceProblem(currentConversationId, subject, topic);
            if (response.success && response.data) {
              console.log('[Practice Problem] ✅ POST API call completed!');
              setPracticeProblem(response.data.problem);
              setPracticeError('');
            } else {
              throw new Error('Failed to generate practice problem');
            }
          }
        } catch (error: any) {
          console.error('[Practice Problem] ❌ API call failed:', error);
          
          // ✅ Check if it's a token limit error (403 with specific structure)
          if (error.response?.status === 403 && error.response?.data?.detail) {
            const detail = error.response.data.detail;
            if (typeof detail === 'string' || (detail.upgradeRequired && detail.service === 'aiTutor')) {
              // Show popup modal instead of error message
              setTokenLimitData({
                message: typeof detail === 'string' ? detail : (detail.message || 'Your free trial credits are running low.'),
                tokensRemaining: detail.tokensRemaining,
                service: 'aiTutor',
                upgradeRequired: true
              });
              setShowTokenLimitModal(true);
              return; // Don't set error message
            }
          }
          
          setPracticeError('Sorry, I encountered an error while generating the practice problem. Please try again.');
        } finally {
          practiceProblemRequestRef.current = null;
        }
      })();
    }
  }, [subject, topic, currentConversationId, conversationIdFromUrl, practiceProblem, isLoadingExistingConversation]);

  // Study Guide - First check GET API, then POST if data doesn't exist
  useEffect(() => {
    // Skip if loading existing conversation or if conversationIdFromUrl exists (existing conversation)
    if (isLoadingExistingConversation || conversationIdFromUrl) {
      console.log('[Study Guide] ⏭️ Skipping API call - loading existing conversation');
      return;
    }
    
    if (subject && topic && currentConversationId && !studyGuideRequestRef.current && !studyGuide) {
      console.log('[Study Guide] 🔍 Checking GET API first...', { subject, topic, conversationId: currentConversationId });
      
      studyGuideRequestRef.current = (async () => {
        try {
          // First, GET conversation to check if study_guide data already exists
          const conversation = await aiTutorService.getConversation(currentConversationId);
          
          if (conversation.study_guide && conversation.study_guide.guide) {
            console.log('[Study Guide] ✅ Data found in GET API - using existing data');
            setStudyGuide(conversation.study_guide.guide);
            setStudyError('');
          } else {
            // Data doesn't exist, call POST API to generate
            console.log('[Study Guide] 📝 No data found, calling POST API to generate...');
            const response = await aiTutorService.studyGuide(currentConversationId, subject, topic);
            if (response.success && response.data) {
              console.log('[Study Guide] ✅ POST API call completed!');
              setStudyGuide(response.data.guide);
              setStudyError('');
            } else {
              throw new Error('Failed to generate study guide');
            }
          }
        } catch (error: any) {
          console.error('[Study Guide] ❌ API call failed:', error);
          
          // ✅ Check if it's a token limit error (403 with specific structure)
          if (error.response?.status === 403 && error.response?.data?.detail) {
            const detail = error.response.data.detail;
            if (typeof detail === 'string' || (detail.upgradeRequired && detail.service === 'aiTutor')) {
              // Show popup modal instead of error message
              setTokenLimitData({
                message: typeof detail === 'string' ? detail : (detail.message || 'Your free trial credits are running low.'),
                tokensRemaining: detail.tokensRemaining,
                service: 'aiTutor',
                upgradeRequired: true
              });
              setShowTokenLimitModal(true);
              return; // Don't set error message
            }
          }
          
          setStudyError('Sorry, I encountered an error while generating the study guide. Please try again.');
        } finally {
          studyGuideRequestRef.current = null;
        }
      })();
    }
  }, [subject, topic, currentConversationId, conversationIdFromUrl, studyGuide, isLoadingExistingConversation]);

  // Key Points - First check GET API, then POST if data doesn't exist
  useEffect(() => {
    // Skip if loading existing conversation or if conversationIdFromUrl exists (existing conversation)
    if (isLoadingExistingConversation || conversationIdFromUrl) {
      console.log('[Key Points] ⏭️ Skipping API call - loading existing conversation');
      return;
    }
    
    if (subject && topic && currentConversationId && !keyPointsRequestRef.current && !keyPoints) {
      console.log('[Key Points] 🔍 Checking GET API first...', { subject, topic, conversationId: currentConversationId });
      
      keyPointsRequestRef.current = (async () => {
        try {
          // First, GET conversation to check if key_points data already exists
          const conversation = await aiTutorService.getConversation(currentConversationId);
          
          if (conversation.key_points && conversation.key_points.key_points) {
            console.log('[Key Points] ✅ Data found in GET API - using existing data');
            setKeyPoints(conversation.key_points.key_points);
            setKeyPointsError('');
          } else {
            // Data doesn't exist, call POST API to generate
            console.log('[Key Points] 📝 No data found, calling POST API to generate...');
            const response = await aiTutorService.keyPoints(currentConversationId, subject, topic);
            if (response.success && response.data) {
              console.log('[Key Points] ✅ POST API call completed!');
              setKeyPoints(response.data.key_points);
              setKeyPointsError('');
            } else {
              throw new Error('Failed to generate key points');
            }
          }
        } catch (error: any) {
          console.error('[Key Points] ❌ API call failed:', error);
          
          // ✅ Check if it's a token limit error (403 with specific structure)
          if (error.response?.status === 403 && error.response?.data?.detail) {
            const detail = error.response.data.detail;
            if (typeof detail === 'string' || (detail.upgradeRequired && detail.service === 'aiTutor')) {
              // Show popup modal instead of error message
              setTokenLimitData({
                message: typeof detail === 'string' ? detail : (detail.message || 'Your free trial credits are running low.'),
                tokensRemaining: detail.tokensRemaining,
                service: 'aiTutor',
                upgradeRequired: true
              });
              setShowTokenLimitModal(true);
              return; // Don't set error message
            }
          }
          
          setKeyPointsError('Sorry, I encountered an error while generating the key points. Please try again.');
        } finally {
          keyPointsRequestRef.current = null;
        }
      })();
    }
  }, [subject, topic, currentConversationId, conversationIdFromUrl, keyPoints, isLoadingExistingConversation]);

  // Reset all states when exam/subject/topic changes
  useEffect(() => {
    if (!examType && !subject && !topic) {
      setExplanation('');
      setExplanationError('');
      explainConceptRequestRef.current = null;
      setPracticeProblem('');
      setPracticeError('');
      practiceProblemRequestRef.current = null;
      setStudyGuide('');
      setStudyError('');
      studyGuideRequestRef.current = null;
      setKeyPoints('');
      setKeyPointsError('');
      keyPointsRequestRef.current = null;
    }
  }, [examType, subject, topic]);

  const handleExplainConcept = async () => {
    if (!isConnected || !currentConversationId || !subject || !topic) {
      alert('Please select subject and topic first');
      return;
    }

    setShowExplainModal(true);

    // ✅ If explanation is already ready, show it immediately (no loading)
    if (explanation) {
      setExplainLoading(false);
      return;
    }

    // ✅ If there's an error, show it
    if (explanationError) {
      setExplainLoading(false);
      setExplanation(explanationError);
      return;
    }

    // ✅ If data is not ready yet, show loading and wait for background request
    if (explainConceptRequestRef.current) {
      console.log('[Explain Concept] ⏳ Waiting for background request to complete...');
      setExplainLoading(true);
      
      try {
        await explainConceptRequestRef.current;
        // Explanation will be set by the useEffect above
        setExplainLoading(false);
      } catch (error: any) {
        console.error('[Explain Concept] ❌ Error waiting for explanation:', error);
        setExplanation('Sorry, I encountered an error while generating the explanation. Please try again.');
        setExplainLoading(false);
      }
    } else {
      // ✅ Fallback: If no background request exists, trigger it now
      console.log('[Explain Concept] 🚀 No background request found, triggering now...');
      setExplainLoading(true);
      setExplanation('');
      setExplanationError('');

      try {
        const response = await aiTutorService.explainConcept(currentConversationId, subject, topic);
        
        if (response.success && response.data) {
          setExplanation(response.data.explanation);
        } else {
          throw new Error('Failed to generate explanation');
        }
      } catch (error: any) {
        console.error('Error explaining concept:', error);
        
        // ✅ Check if it's a token limit error (403 with specific structure)
        if (error.response?.status === 403 && error.response?.data?.detail) {
          const detail = error.response.data.detail;
          if (typeof detail === 'string' || (detail.upgradeRequired && detail.service === 'aiTutor')) {
            // Show popup modal instead of error message
            setTokenLimitData({
              message: typeof detail === 'string' ? detail : (detail.message || 'Your free trial credits are running low.'),
              tokensRemaining: detail.tokensRemaining,
              service: 'aiTutor',
              upgradeRequired: true
            });
            setShowTokenLimitModal(true);
            setExplainLoading(false);
            return; // Don't set error message
          }
        }
        
        setExplanation('Sorry, I encountered an error while generating the explanation. Please try again.');
      } finally {
        setExplainLoading(false);
      }
    }
  };

  const handlePracticeProblem = async () => {
    if (!isConnected || !currentConversationId || !subject || !topic) {
      alert('Please select subject and topic first');
      return;
    }

    setShowPracticeModal(true);

    if (practiceProblem) {
      setPracticeLoading(false);
      return;
    }

    if (practiceError) {
      setPracticeLoading(false);
      setPracticeProblem(practiceError);
      return;
    }

    if (practiceProblemRequestRef.current) {
      console.log('[Practice Problem] ⏳ Waiting for background request to complete...');
      setPracticeLoading(true);
      
      try {
        await practiceProblemRequestRef.current;
        setPracticeLoading(false);
      } catch (error: any) {
        console.error('[Practice Problem] ❌ Error waiting for problem:', error);
        setPracticeProblem('Sorry, I encountered an error while generating the practice problem. Please try again.');
        setPracticeLoading(false);
      }
    } else {
      console.log('[Practice Problem] 🚀 No background request found, triggering now...');
      setPracticeLoading(true);
      setPracticeProblem('');
      setPracticeError('');

      try {
        const response = await aiTutorService.practiceProblem(currentConversationId, subject, topic);
        if (response.success && response.data) {
          setPracticeProblem(response.data.problem);
        } else {
          throw new Error('Failed to generate practice problem');
        }
      } catch (error: any) {
        console.error('Error generating practice problem:', error);
        
        // ✅ Check if it's a token limit error (403 with specific structure)
        if (error.response?.status === 403 && error.response?.data?.detail) {
          const detail = error.response.data.detail;
          if (typeof detail === 'string' || (detail.upgradeRequired && detail.service === 'aiTutor')) {
            // Show popup modal instead of error message
            setTokenLimitData({
              message: typeof detail === 'string' ? detail : (detail.message || 'Your free trial credits are running low.'),
              tokensRemaining: detail.tokensRemaining,
              service: 'aiTutor',
              upgradeRequired: true
            });
            setShowTokenLimitModal(true);
            setPracticeLoading(false);
            return; // Don't set error message
          }
        }
        
        setPracticeProblem('Sorry, I encountered an error while generating the practice problem. Please try again.');
      } finally {
        setPracticeLoading(false);
      }
    }
  };

  const handleStudyGuide = async () => {
    if (!isConnected || !currentConversationId || !subject || !topic) {
      alert('Please select subject and topic first');
      return;
    }

    setShowStudyModal(true);

    if (studyGuide) {
      setStudyLoading(false);
      return;
    }

    if (studyError) {
      setStudyLoading(false);
      setStudyGuide(studyError);
      return;
    }

    if (studyGuideRequestRef.current) {
      console.log('[Study Guide] ⏳ Waiting for background request to complete...');
      setStudyLoading(true);
      
      try {
        await studyGuideRequestRef.current;
        setStudyLoading(false);
      } catch (error: any) {
        console.error('[Study Guide] ❌ Error waiting for guide:', error);
        setStudyGuide('Sorry, I encountered an error while generating the study guide. Please try again.');
        setStudyLoading(false);
      }
    } else {
      console.log('[Study Guide] 🚀 No background request found, triggering now...');
      setStudyLoading(true);
      setStudyGuide('');
      setStudyError('');

      try {
        const response = await aiTutorService.studyGuide(currentConversationId, subject, topic);
        if (response.success && response.data) {
          setStudyGuide(response.data.guide);
        } else {
          throw new Error('Failed to generate study guide');
        }
      } catch (error: any) {
        console.error('Error generating study guide:', error);
        
        // ✅ Check if it's a token limit error (403 with specific structure)
        if (error.response?.status === 403 && error.response?.data?.detail) {
          const detail = error.response.data.detail;
          if (typeof detail === 'string' || (detail.upgradeRequired && detail.service === 'aiTutor')) {
            // Show popup modal instead of error message
            setTokenLimitData({
              message: typeof detail === 'string' ? detail : (detail.message || 'Your free trial credits are running low.'),
              tokensRemaining: detail.tokensRemaining,
              service: 'aiTutor',
              upgradeRequired: true
            });
            setShowTokenLimitModal(true);
            setStudyLoading(false);
            return; // Don't set error message
          }
        }
        
        setStudyGuide('Sorry, I encountered an error while generating the study guide. Please try again.');
      } finally {
        setStudyLoading(false);
      }
    }
  };

  const handleKeyPoints = async () => {
    if (!isConnected || !currentConversationId || !subject || !topic) {
      alert('Please select subject and topic first');
      return;
    }

    setShowKeyPointsModal(true);

    if (keyPoints) {
      setKeyPointsLoading(false);
      return;
    }

    if (keyPointsError) {
      setKeyPointsLoading(false);
      setKeyPoints(keyPointsError);
      return;
    }

    if (keyPointsRequestRef.current) {
      console.log('[Key Points] ⏳ Waiting for background request to complete...');
      setKeyPointsLoading(true);
      
      try {
        await keyPointsRequestRef.current;
        setKeyPointsLoading(false);
      } catch (error: any) {
        console.error('[Key Points] ❌ Error waiting for key points:', error);
        setKeyPoints('Sorry, I encountered an error while generating the key points. Please try again.');
        setKeyPointsLoading(false);
      }
    } else {
      console.log('[Key Points] 🚀 No background request found, triggering now...');
      setKeyPointsLoading(true);
      setKeyPoints('');
      setKeyPointsError('');

      try {
        const response = await aiTutorService.keyPoints(currentConversationId, subject, topic);
        if (response.success && response.data) {
          setKeyPoints(response.data.key_points);
        } else {
          throw new Error('Failed to generate key points');
        }
      } catch (error: any) {
        console.error('Error generating key points:', error);
        
        // ✅ Check if it's a token limit error (403 with specific structure)
        if (error.response?.status === 403 && error.response?.data?.detail) {
          const detail = error.response.data.detail;
          if (typeof detail === 'string' || (detail.upgradeRequired && detail.service === 'aiTutor')) {
            // Show popup modal instead of error message
            setTokenLimitData({
              message: typeof detail === 'string' ? detail : (detail.message || 'Your free trial credits are running low.'),
              tokensRemaining: detail.tokensRemaining,
              service: 'aiTutor',
              upgradeRequired: true
            });
            setShowTokenLimitModal(true);
            setKeyPointsLoading(false);
            return; // Don't set error message
          }
        }
        
        setKeyPoints('Sorry, I encountered an error while generating the key points. Please try again.');
      } finally {
        setKeyPointsLoading(false);
      }
    }
  };

  const handleQuickAction = (actionOrPrompt: string) => {
    if (actionOrPrompt === 'explain') {
      handleExplainConcept();
    } else if (actionOrPrompt === 'practice') {
      handlePracticeProblem();
    } else if (actionOrPrompt === 'study') {
      handleStudyGuide();
    } else if (actionOrPrompt === 'keypoints') {
      handleKeyPoints();
    } else if (isConnected && currentConversationId) {
      // Legacy: fallback for prompt-based actions
      // In expanded view, generate audio; in normal view, text only
      sendMessage(actionOrPrompt, { isAudio: avatarExpanded });
    }
  };

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        // Update final transcript
        if (finalTranscript) {
          finalTranscriptRef.current += finalTranscript;
          setTranscript(finalTranscriptRef.current + interimTranscript);
          
          // Clear any existing timeout
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }
          
          // Auto-send after 1 second of silence
          silenceTimeoutRef.current = setTimeout(async () => {
            if (finalTranscriptRef.current.trim() && !messageSentRef.current) {
              const cleanTranscript = finalTranscriptRef.current.trim();
              console.log('[Audio] Auto-sending after silence:', cleanTranscript);
              
              // Mark as sent to prevent duplicate
              messageSentRef.current = true;
              
              // Ensure conversation exists before sending
              if (!currentConversationId && examType && subject && topic) {
                console.log('[Audio] Creating conversation before sending...');
                try {
                  const conversationId = await createNewConversation(examType, subject, topic);
                  // Update URL with new conversation ID
                  if (conversationId) {
                    updateConversationUrl(conversationId);
                  }
                  // Wait a bit for connection to establish
                  await new Promise(resolve => setTimeout(resolve, 500));
                } catch (err) {
                  console.error('[Audio] Failed to create conversation:', err);
                  messageSentRef.current = false;
                  return;
                }
              }
              
              // Send message immediately (hook will add to messages)
              if (isConnected || currentConversationId) {
                console.log('[Audio] 🎤 Sending message to backend:', cleanTranscript);
                
                // Use ref to get current files (avoids stale closure)
                const currentFiles = uploadedFilesRef.current;
                console.log('[Audio] 📁 Current uploaded files from REF:', currentFiles.length, currentFiles);
                
                // Include uploaded files if any are present
                const images = currentFiles.filter(f => f.type === 'image');
                const pdfs = currentFiles.filter(f => f.type === 'pdf');
                const filePreviews = currentFiles.map(file => ({
                  preview: file.preview,
                  id: file.id,
                  type: file.type,
                  name: file.file.name
                }));
                
                console.log('[Audio] 🖼️ Filtered images:', images.length);
                console.log('[Audio] 📄 Filtered PDFs:', pdfs.length);
                console.log('[Audio] 📦 File previews:', filePreviews.length);
                
                sendMessage(cleanTranscript, { 
                  isAudio: true,
                  images: images.length > 0 ? images : undefined,
                  pdfs: pdfs.length > 0 ? pdfs : undefined,
                  filePreviews: filePreviews.length > 0 ? filePreviews : undefined
                });
                
                console.log('[Audio] ✅ Message sent with files!');
                
                // Clear uploaded files after sending
                setUploadedFiles([]);
                uploadedFilesRef.current = []; // Also clear ref
                console.log('[Audio] 🗑️ Cleared uploaded files from state and ref');
              } else {
                console.warn('[Audio] Cannot send - not connected. ConversationId:', currentConversationId, 'Connected:', isConnected);
                messageSentRef.current = false;
              }
              
              // Stop recording
              stopRecording();
            }
          }, 1000); // 1 second delay
        } else if (interimTranscript) {
          // Show interim results
          setTranscript(finalTranscriptRef.current + interimTranscript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
      };

      recognition.onend = () => {
        // Only restart if still recording AND message hasn't been sent
        // This prevents restart after auto-send has stopped recording
        if (isRecording && recognitionRef.current && !messageSentRef.current) {
          // Restart if still recording (user is still speaking)
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.log('Speech recognition restart failed:', e);
          }
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isRecording, currentConversationId, examType, subject, topic, createNewConversation, isConnected, sendMessage]);  // ✅ Remove stopRecording (causes hoisting error)

  const startRecording = async () => {
    console.log('[Recording] 🎙️ startRecording called');
    console.log('[Recording] 📁 Files at start:', uploadedFiles.length);
    console.log('[Recording] 📋 File details:', uploadedFiles.map(f => f.file.name));
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start MediaRecorder for audio file
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        // Clear silence timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
        
        // Send audio and transcript if not already sent
        const cleanTranscript = finalTranscriptRef.current.trim();
        if (cleanTranscript && audioChunksRef.current.length > 0) {
          // Transcript already sent in auto-send, just clean up
          console.log('[Audio] Recording stopped, transcript already sent:', cleanTranscript);
          // Audio blob can be uploaded to server if needed later
        }
        
        // Reset everything
        setTranscript('');
        finalTranscriptRef.current = '';
        audioChunksRef.current = [];
        messageSentRef.current = false;
      };

      mediaRecorder.start();

      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      setIsRecording(true);
      setTranscript('');
      finalTranscriptRef.current = '';
      messageSentRef.current = false; // Reset sent flag
      
      // Clear any existing timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Microphone access denied. Please allow microphone access to use audio chat.');
    }
  };

  const stopRecording = async () => {
    // Clear silence timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // Only send if message wasn't already sent by auto-send
    const cleanTranscript = finalTranscriptRef.current.trim();
    if (cleanTranscript && !messageSentRef.current) {
      // Ensure conversation exists before sending
      if (!currentConversationId && examType && subject && topic) {
        console.log('[Audio] Creating conversation before sending (manual stop)...');
        try {
          const conversationId = await createNewConversation(examType, subject, topic);
          // Update URL with new conversation ID
          if (conversationId) {
            updateConversationUrl(conversationId);
          }
          // Wait a bit for connection to establish
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error('[Audio] Failed to create conversation:', err);
          setTranscript('');
          finalTranscriptRef.current = '';
          messageSentRef.current = false;
          setIsRecording(false);
          return;
        }
      }
      
      if (isConnected || currentConversationId) {
        console.log('[Audio] 🛑 Manual stop - sending transcript:', cleanTranscript);
        
        // Use ref to get current files (avoids stale closure)
        const currentFiles = uploadedFilesRef.current;
        console.log('[Audio] 📁 Current uploaded files from REF:', currentFiles.length, currentFiles);
        messageSentRef.current = true;
        
        // Include uploaded files if any are present
        const images = currentFiles.filter(f => f.type === 'image');
        const pdfs = currentFiles.filter(f => f.type === 'pdf');
        const filePreviews = currentFiles.map(file => ({
          preview: file.preview,
          id: file.id,
          type: file.type,
          name: file.file.name
        }));
        
        console.log('[Audio] 🖼️ Filtered images:', images.length);
        console.log('[Audio] 📄 Filtered PDFs:', pdfs.length);
        console.log('[Audio] 📦 File previews:', filePreviews.length);
        
        sendMessage(cleanTranscript, { 
          isAudio: true,
          images: images.length > 0 ? images : undefined,
          pdfs: pdfs.length > 0 ? pdfs : undefined,
          filePreviews: filePreviews.length > 0 ? filePreviews : undefined
        });
        
        console.log('[Audio] ✅ Message sent with files!');
        
        // Clear uploaded files after sending
        setUploadedFiles([]);
        uploadedFilesRef.current = []; // Also clear ref
        console.log('[Audio] 🗑️ Cleared uploaded files from state and ref');
      } else {
        console.warn('[Audio] Cannot send on manual stop - not connected');
      }
    }

    setTranscript('');
    finalTranscriptRef.current = '';
    messageSentRef.current = false;
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {(loadingConversation || loadingStudentInfo) ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{loadingStudentInfo ? 'Loading your profile...' : 'Loading conversation...'}</p>
          </div>
        </div>
      ) : (
        <>
      <SubjectSelectionDialog
        isOpen={showSubjectDialog}
        skipExamStep={true} // Always skip exam step (removed)
        defaultExamType={examType} // Pass exam type from student profile
        examTarget={examTarget} // Pass exam_target for subject filtering
        onClose={() => {
          // If user cancels, leave this page (no AI Tutor without a subject)
          navigate('/dashboard');
        }}
        onConfirm={(exam, s, t) => {
          setShowSubjectDialog(false);
          setExamType(exam || examType); // Use passed exam or existing
          setSubject(s);
          setTopic(t);
        }}
      />

          {((subject || currentConversationId) || messages.length > 0) && (
          <div className="bg-white shadow-sm border-b border-gray-200 p-2 sm:p-3 md:p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
          <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-base sm:text-lg md:text-2xl font-bold text-gray-800">AI Tutor</h1>
            {examType && (
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 truncate px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg font-medium">
                {examType}
              </p>
            )}
            {subject && (
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 truncate">Subject: {subject}</p>
            )}
            {topic && (
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-500 truncate">Topic: {topic}</p>
            )}
            {!subject && (
              <button
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-gradient-to-r from-blue-600 to-purple-600 text-white text-[10px] sm:text-xs"
                onClick={() => setShowSubjectDialog(true)}
              >Choose Subject</button>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-[10px] sm:text-xs md:text-sm text-gray-600">{connectionStatus}</span>
            {currentConversationId && (
              <span className="hidden md:inline text-xs text-gray-400">{currentConversationId.slice(0, 8)}...</span>
            )}
          </div>
        </div>
      </div>
      )}

      {avatarExpanded && (
        <div className="fixed inset-0 z-50 bg-white">
          {/* Top bar */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800 text-sm sm:text-base">AI Tutor</h3>
            <button className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs sm:text-sm" onClick={handleCloseAvatar}>Close</button>
          </div>

          {/* Two-column expanded view: Stack on mobile, side-by-side on tablet+ */}
          <div className="flex flex-col md:flex-row h-[calc(100vh-44px)] md:h-[calc(100vh-52px)]">
            <div className="w-full md:w-[50%] h-[40vh] md:h-full border-b md:border-b-0 md:border-r border-gray-200 flex items-center justify-center bg-black/5 relative">
              {/* Mic Icon - Floating on Avatar Top Right */}
              <div className="absolute top-2 right-2 sm:top-4 sm:right-4 md:top-8 md:right-8 z-20">
                <button
                  onClick={toggleRecording}
                  disabled={!currentConversationId || !isConnected}
                  className={`group relative p-2.5 sm:p-3 md:p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 ${
                    isRecording
                      ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white ring-4 ring-red-300 ring-opacity-60 animate-pulse'
                      : 'bg-gradient-to-br from-purple-500 via-blue-500 to-purple-600 hover:from-purple-600 hover:via-blue-600 hover:to-purple-700 text-white shadow-purple-500/50 hover:shadow-purple-500/70'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isRecording ? 'Stop recording (Click to stop)' : 'Start audio recording (Click to record)'}
                >
                  {/* Mic Icon */}
                  <svg className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 transition-all ${isRecording ? 'animate-pulse' : 'group-hover:scale-110'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isRecording ? (
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        <circle cx="12" cy="12" r="9" strokeWidth={2.5} />
                      </>
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    )}
                  </svg>
                  
                  {/* Recording Indicator */}
                  {isRecording && (
                    <>
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-400 rounded-full animate-ping opacity-75"></div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full"></div>
                      <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs font-bold text-red-600 bg-white px-3 py-1.5 rounded-lg shadow-xl border border-red-200">
                        ⏺ Recording...
                      </div>
                    </>
                  )}
                  
                  {/* Hover Tooltip */}
                  {!isRecording && (
                    <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-purple-600 bg-white px-3 py-1.5 rounded-lg shadow-lg border border-purple-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                      🎤 Start Recording
                    </div>
                  )}
                </button>
              </div>
              
              <div className="w-full h-full">
                <iframe 
                  src="/WebGL/index.html?mode=expanded" 
                  title="AI Tutor Avatar Expanded" 
                  className="w-full h-full rounded-xl bg-transparent" 
                  style={{ minWidth: '100%', minHeight: '100%', border: 'none' }}
                  allow="autoplay; fullscreen" 
                />
              </div>
            </div>
            <div className="flex-1 flex flex-col min-w-0 h-[60vh] md:h-full">
              <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 bg-gray-50">
                {filteredMessages.map((m, idx) => {
                  const isStreamingMessage = isStreaming && idx === lastMessageIndex && m.role === 'assistant';
                  return (
                  <div key={m.id || `msg-${idx}`} className={`mb-2 sm:mb-3 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block px-4 py-3 rounded-lg text-sm sm:text-base shadow-sm ${m.role === 'user' ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' : 'bg-white text-gray-800 border border-gray-200 ai-tutor-message'}`}>
                      {m.role === 'user' ? (
                        <div className="text-white">
                          {/* File previews for user messages (images + PDFs) */}
                          {m.files && m.files.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {m.files.map((file) => (
                                <div key={file.id} className="relative group">
                                  {file.type === 'image' ? (
                                    <img 
                                      src={file.preview} 
                                      alt="Uploaded" 
                                      className="w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-lg border-2 border-white/30 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                                      onClick={() => window.open(file.preview, '_blank')}
                                      title="Click to view full image"
                                    />
                                  ) : (
                                    <div 
                                      className="w-32 h-32 sm:w-40 sm:h-40 flex flex-col items-center justify-center rounded-lg border-2 border-white/50 bg-white/10 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                                      onClick={() => window.open(file.preview, '_blank')}
                                      title={`Click to view: ${file.name}`}
                                    >
                                      <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                      </svg>
                                      <span className="text-xs sm:text-sm text-white font-semibold mt-1 px-2 text-center break-words max-w-full">
                                        {file.name && file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name}
                                      </span>
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors pointer-events-none"></div>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="whitespace-pre-wrap break-words">{m.content}</div>
                        </div>
                      ) : (
                        <div className="text-sm sm:text-[15px] md:text-base leading-relaxed text-gray-800">
                          {isStreamingMessage ? (
                            // During streaming, use FormattedMessage for proper structure rendering
                            // This ensures markdown formatting is applied in real-time
                            <div className="relative">
                              <FormattedMessage content={m.content} />
                              <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-1 align-middle"></span>
                            </div>
                          ) : (
                            // After streaming, show formatted markdown
                            <FormattedMessage content={m.content} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
                })}
                {(thinkingMessage || thinkingStatus) ? (
                  <div className="text-left mb-3">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 border border-purple-200 rounded-lg shadow-sm animate-pulse">
                      <svg className="w-4 h-4 text-purple-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-xs font-medium text-purple-700">
                        {thinkingStatus && <span className="capitalize">{thinkingStatus}</span>}
                        {thinkingMessage && <span className="ml-1">• {thinkingMessage}</span>}
                      </span>
                    </div>
                  </div>
                ) : isTyping ? (
                  <div className="text-left mb-3">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                      </div>
                      <span className="text-xs text-gray-600">AI is typing...</span>
                    </div>
                  </div>
                ) : null}
                <div ref={messagesEndRef} />
              </div>
              
              {/* File Upload Section in Expanded View */}
              <div className="border-t border-gray-200 p-2 sm:p-2.5 md:p-3">
                {/* File Preview Area (Images + PDFs) */}
                {uploadedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-50 rounded-lg">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="relative group">
                        {file.type === 'image' ? (
                          <img 
                            src={file.preview} 
                            alt="Upload preview" 
                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border-2 border-gray-300 shadow-sm"
                          />
                        ) : (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 flex flex-col items-center justify-center rounded-lg border-2 border-red-300 bg-red-50 shadow-sm">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="text-[8px] sm:text-[10px] text-red-600 font-semibold mt-0.5">PDF</span>
                          </div>
                        )}
                        <button
                          onClick={() => removeFile(file.id)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                          title={`Remove ${file.type}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {uploadedFiles.length < 3 && (
                      <div className="text-xs text-gray-500 self-center ml-2">
                        {3 - uploadedFiles.length} more file{3 - uploadedFiles.length > 1 ? 's' : ''} allowed
                      </div>
                    )}
                  </div>
                )}
                
                {/* Input Area */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* File upload button (Images + PDFs) */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadedFiles.length >= 3 || !currentConversationId || !isConnected}
                    className="p-1.5 sm:p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
                    title={uploadedFiles.length >= 3 ? 'Maximum 3 files allowed' : 'Upload images or PDFs'}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  
                  {/* Mic Button */}
                  <button
                    onClick={toggleRecording}
                    disabled={!currentConversationId || !isConnected}
                    className={`p-1.5 sm:p-2 rounded-lg font-semibold transition-all flex-shrink-0 ${
                      isRecording
                        ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    } disabled:opacity-50`}
                    title={isRecording ? 'Stop recording' : 'Start audio recording'}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                  
                <input
                    value={isRecording ? transcript : inputValue}
                    onChange={(e) => !isRecording && setInputValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !isRecording) handleSend(); }}
                    placeholder={uploadedFiles.length > 0 ? (isRecording ? "Listening..." : "Add message (optional)...") : (isRecording ? "Listening..." : "Type your question…")}
                    readOnly={isRecording}
                    className="flex-1 min-w-0 px-2 sm:px-3 py-1.5 sm:py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm md:text-base text-gray-900 placeholder-gray-400 bg-white"
                    style={{ color: '#111827' }}
                />
                <button
                  onClick={handleSend}
                    disabled={(!inputValue.trim() && uploadedFiles.length === 0) || !currentConversationId || !isConnected || isRecording}
                    className="px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold text-xs sm:text-sm disabled:opacity-50 hover:shadow-lg transition-all flex-shrink-0"
                >
                    {uploadedFiles.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <span>{uploadedFiles.length}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                      </div>
                    ) : 'Send'}
                </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {(subject || currentConversationId) && (
      <div className="flex-1 flex flex-col lg:flex-row gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4 overflow-hidden relative">
        {/* Chat Area - Full width on mobile, reduced on desktop for quick actions */}
        <div className="flex-1 lg:flex-[0_0_calc(100%-280px)] bg-white border border-gray-200 rounded-xl sm:rounded-2xl shadow-lg flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 lg:p-6 space-y-3 sm:space-y-4 md:space-y-5 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  Welcome to AI Tutor! 👋
                </h3>
                <p className="text-gray-600 max-w-md">
                  Ask me anything about {subject || 'your subject'} or use the quick actions to get started!
                </p>
              </div>
            )}
            {filteredMessages.map((m, idx) => {
                const isStreamingMessage = isStreaming && idx === lastMessageIndex && m.role === 'assistant';
                return (
              <div 
                key={m.id || `msg-${idx}`} 
                className={`flex gap-2 sm:gap-3 md:gap-4 items-start animate-in fade-in slide-in-from-bottom-4 duration-300 ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Bot Avatar - Only for assistant messages (left side) */}
                {m.role === 'assistant' && (
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-0.5 shadow-lg ring-2 ring-white">
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                      </div>
                    </div>
                    {/* Online indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-md"></div>
                  </div>
                )}

                {/* User Avatar - Only for user messages (right side, before message) */}
                {m.role === 'user' && (
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 p-0.5 shadow-lg ring-2 ring-white">
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                        <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`max-w-[80%] sm:max-w-[75%] md:max-w-[70%] lg:max-w-[65%] ${
                  m.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'
                }`}>
                  <div className={`group relative rounded-xl sm:rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl ${
                    m.role === 'user'
                      ? 'bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 text-white rounded-br-md'
                      : 'bg-white text-gray-900 rounded-bl-md border border-gray-100'
                  }`}>
                    {/* Message Tail */}
                    <div className={`absolute top-0 ${
                      m.role === 'user' 
                        ? 'right-0 translate-x-1 -translate-y-1' 
                        : 'left-0 -translate-x-1 -translate-y-1'
                    }`}>
                      <div className={`w-3 h-3 sm:w-4 sm:h-4 rotate-45 ${
                        m.role === 'user'
                          ? 'bg-gradient-to-br from-blue-600 to-purple-600'
                          : 'bg-white border-l border-b border-gray-100'
                      }`}></div>
                    </div>

                    <div className={`relative p-2.5 sm:p-3 md:p-4 lg:p-5 ${m.role === 'user' ? 'pr-3 sm:pr-4 md:pr-5' : 'pl-3 sm:pl-4 md:pl-5'}`}>
                    {m.role === 'user' ? (
                      <div className="text-white">
                          {/* File previews for user messages */}
                        {m.files && m.files.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {m.files.map((file) => (
                              <div key={file.id} className="relative group">
                                {file.type === 'image' ? (
                                    <div className="relative">
                                  <img 
                                    src={file.preview} 
                                    alt="Uploaded" 
                                        className="w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-xl border-2 border-white/40 shadow-xl hover:shadow-2xl transition-all cursor-pointer hover:scale-105"
                                    onClick={() => window.open(file.preview, '_blank')}
                                    title="Click to view full image"
                                  />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    </div>
                                ) : (
                                  <div 
                                      className="w-32 h-32 sm:w-40 sm:h-40 flex flex-col items-center justify-center rounded-xl border-2 border-white/40 bg-white/10 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all cursor-pointer hover:scale-105"
                                    onClick={() => window.open(file.preview, '_blank')}
                                    title={`Click to view: ${file.name}`}
                                  >
                                      <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                      <span className="text-xs sm:text-sm text-white font-semibold mt-1 px-2 text-center break-words max-w-full drop-shadow">
                                      {file.name && file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                          <div className="text-sm sm:text-[15px] md:text-base leading-relaxed whitespace-pre-wrap break-words font-medium">
                            {m.content}
                          </div>
                      </div>
                    ) : (
                        <div className="text-sm sm:text-[15px] md:text-base leading-relaxed text-gray-800">
                        {isStreamingMessage ? (
                          // During streaming, use FormattedMessage for proper structure rendering
                          // This ensures markdown formatting is applied in real-time
                          <div className="relative">
                            <FormattedMessage content={m.content} />
                            <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-1 align-middle"></span>
                          </div>
                        ) : (
                          // After streaming, show formatted markdown
                          <FormattedMessage content={m.content} />
                        )}
                      </div>
                    )}
                  </div>
                </div>
                  {/* Timestamp */}
                  <span className={`text-xs text-gray-500 mt-1 px-2 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  </div>
              </div>
            );
            })}
            {(thinkingMessage || thinkingStatus) ? (
              <div className="flex gap-3 sm:gap-4 items-start animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-0.5 shadow-lg ring-2 ring-white animate-pulse">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl rounded-bl-md shadow-lg border border-gray-100">
                  <div className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border border-purple-200/50 rounded-xl shadow-sm">
                    <svg className="w-4 h-4 text-purple-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {thinkingStatus && <span className="capitalize">{thinkingStatus}</span>}
                      {thinkingMessage && <span className="ml-1">• {thinkingMessage}</span>}
                    </span>
                  </div>
                </div>
              </div>
            ) : isTyping ? (
              <div className="flex gap-3 sm:gap-4 items-start animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-0.5 shadow-lg ring-2 ring-white">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl rounded-bl-md shadow-lg border border-gray-100">
                  <div className="flex gap-1.5 items-center">
                    <div className="w-2.5 h-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full animate-bounce"></div>
                    <div className="w-2.5 h-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></div>
                    <div className="w-2.5 h-2.5 bg-gradient-to-br from-pink-500 to-red-500 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
                  </div>
                </div>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-200 bg-white/80 backdrop-blur-sm p-2 sm:p-3 md:p-4">
            {/* File Preview Area (Images + PDFs) */}
            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 p-1.5 sm:p-2 bg-gray-50 rounded-lg">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="relative group">
                    {file.type === 'image' ? (
                      <img 
                        src={file.preview} 
                        alt="Upload preview" 
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border-2 border-gray-300 shadow-sm"
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 flex flex-col items-center justify-center rounded-lg border-2 border-red-300 bg-red-50 shadow-sm">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[8px] sm:text-[10px] text-red-600 font-semibold mt-0.5">PDF</span>
                      </div>
                    )}
                    <button
                      onClick={() => removeFile(file.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                      title={`Remove ${file.type}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {uploadedFiles.length < 3 && (
                  <div className="text-xs text-gray-500 self-center ml-2">
                    {3 - uploadedFiles.length} more file{3 - uploadedFiles.length > 1 ? 's' : ''} allowed
                  </div>
                )}
              </div>
            )}
            
            {/* Input Area */}
            <div className="flex items-center gap-2">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              
              {/* File upload button (Images + PDFs) */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadedFiles.length >= 3 || !currentConversationId || !isConnected}
                className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md border border-gray-200 hover:border-gray-300 flex-shrink-0"
                title={uploadedFiles.length >= 3 ? 'Maximum 3 files allowed' : 'Upload images or PDFs'}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              
              {/* Text input */}
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={uploadedFiles.length > 0 ? "Add a message (optional)..." : "Type your question…"}
                className="flex-1 min-w-0 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm md:text-base text-gray-900 placeholder-gray-400 bg-white shadow-sm transition-all hover:border-gray-300 focus:shadow-md"
                style={{ color: '#111827' }}
              />
              
              {/* Send button */}
            <button
              onClick={handleSend}
                disabled={(!inputValue.trim() && uploadedFiles.length === 0) || !currentConversationId || !isConnected}
                className="px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-xl font-semibold text-xs sm:text-sm disabled:opacity-50 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg flex-shrink-0"
            >
                {uploadedFiles.length > 0 ? (
                  <div className="flex items-center gap-1">
                    <span>{uploadedFiles.length}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </div>
                ) : 'Send'}
            </button>
            </div>
          </div>
        </div>

        {/* Quick Actions Buttons - Hidden on mobile, visible on tablet+ */}
        <div className="hidden lg:flex lg:w-64 flex-col gap-2">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-3 sm:p-4 md:p-5">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-800 text-xs sm:text-sm md:text-base">Quick Actions</h3>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              {quickActions.map((action, idx) => (
            <button
                  key={idx}
                  onClick={() => {
                    if (action.action) {
                      handleQuickAction(action.action);
                    }
                  }}
                  disabled={!isConnected || isTyping || (!action.action && !currentConversationId)}
                  className="w-full flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-3.5 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 hover:from-blue-100 hover:via-purple-100 hover:to-pink-100 text-gray-700 border border-purple-200/50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left text-xs sm:text-sm font-medium shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  </div>
                  <span className="flex-1 truncate">{action.label}</span>
            </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Unity Avatar - Circle in Bottom Right */}
      {!avatarExpanded && (
          <div 
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 cursor-pointer group"
            onClick={handleExpandAvatar}
            title="Click to expand avatar"
          >
            {/* Circular Avatar Container */}
            <div className="relative">
              {/* Avatar Circle */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full shadow-2xl hover:shadow-[0_0_40px_rgba(147,51,234,0.8)] transition-all duration-300 hover:scale-110 overflow-hidden ring-2 sm:ring-4 ring-purple-400 ring-opacity-50 hover:ring-opacity-100 hover:ring-purple-500">
                <iframe 
                  src="/WebGL/index.html" 
                  title="AI Tutor Avatar" 
                  className="w-full h-full" 
                  style={{ 
                    border: 'none', 
                    background: 'transparent',
                    borderRadius: '50%',
                    overflow: 'hidden'
                  }}
                  allow="autoplay; fullscreen"
                />
              </div>
              
              {/* Expand indicator - appears on hover */}
              <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl ring-2 ring-white">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </div>
              
              {/* Pulse animation ring */}
              <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping opacity-75"></div>
              
              {/* Status indicator */}
              <div className="absolute top-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 bg-green-500 rounded-full border-1.5 sm:border-2 border-white shadow-lg"></div>
        </div>
      </div>
      )}
      {/* Explain Concept Modal */}
      <ExplainConceptModal
        isOpen={showExplainModal}
        onClose={() => setShowExplainModal(false)}
        explanation={explanation}
        subject={subject}
        topic={topic}
        isLoading={explainLoading}
      />

      <ExplainConceptModal
        isOpen={showPracticeModal}
        onClose={() => setShowPracticeModal(false)}
        explanation={practiceProblem}
        subject={subject}
        topic={topic}
        isLoading={practiceLoading}
        title="Practice Problem"
        icon="📝"
      />

      <ExplainConceptModal
        isOpen={showStudyModal}
        onClose={() => setShowStudyModal(false)}
        explanation={studyGuide}
        subject={subject}
        topic={topic}
        isLoading={studyLoading}
        title="Study Guide"
        icon="📚"
      />

      <ExplainConceptModal
        isOpen={showKeyPointsModal}
        onClose={() => setShowKeyPointsModal(false)}
        explanation={keyPoints}
        subject={subject}
        topic={topic}
        isLoading={keyPointsLoading}
        title="Key Points"
        icon="✨"
      />
      
      {/* Token Limit Modal */}
      {tokenLimitData && (
        <TokenLimitModal
          isOpen={showTokenLimitModal}
          onClose={closeTokenLimitModal}
          data={tokenLimitData}
        />
      )}
        </>
      )}
    </div>
  );
}

 