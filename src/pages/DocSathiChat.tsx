import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Bot, ArrowLeft, FileText, Plus, Clock, MessageSquare, Menu, X } from 'lucide-react';
import { useChatWebSocket } from '../hooks/useChatWebSocket';
import { documentService, DocumentChat } from '../services/documentService';
import MessageBubble from '../components/MessageBubble';
import FormattedMessage from '../components/FormattedMessage';
import TextSelectionPopup from '../components/TextSelectionPopup';
import QuickActionsOverlay from '../components/QuickActionsOverlay';
import { useAuth } from '../context/AuthContext';

interface ChatInterfaceProps {
  documentId: string;
  chatId: string | null;
  onChatCreated?: (newChatId: string | null) => void;
  selectedTextQuery?: string;
  onSelectedTextUsed?: () => void;
}

const ChatInterface = ({ documentId, chatId, onChatCreated, selectedTextQuery, onSelectedTextUsed }: ChatInterfaceProps) => {
  const [inputValue, setInputValue] = useState('');
  const [useWebSearch, setUseWebSearch] = useState(false); // Web search toggle
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasAttemptedConnect = useRef<string | null>(null);

  const {
    isConnected,
    sendMessage,
    messages,
    isTyping,
    connect,
    connectionStatus,
    isMockMode,
    createNewChat,
    loadChatMessages,
    clearMessages,
  } = useChatWebSocket(1, documentId || null, chatId);

  // Let the hook manage WS connection based on currentChatId. Avoid auto-connecting on documentId
  // to ensure the WebSocket always binds to the selected chatId.

  const prevChatIdRef = useRef(chatId);
  const hasCreatedChatRef = useRef(false);
  const newlyCreatedChatsRef = useRef<Set<string>>(new Set());
  
  const lastLoadedChatIdRef = useRef<string | null>(null);
  
  const isInitialMountRef = useRef(true);
  
  useEffect(() => {
    // On initial mount, check if we need to create a chat
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      // On initial mount, if chatId is null and we have documentId, create new chat
      if (chatId === null && documentId && !hasCreatedChatRef.current) {
        console.log('[ChatInterface] Initial mount - creating new chat');
        hasCreatedChatRef.current = true;
        createNewChat((newChatId) => {
          if (newChatId) {
            newlyCreatedChatsRef.current.add(newChatId);
          }
          if (onChatCreated) {
            onChatCreated(newChatId);
          }
          hasCreatedChatRef.current = false;
        });
        prevChatIdRef.current = chatId;
        return;
      }
      prevChatIdRef.current = chatId;
      return;
    }
    
    // After initial mount, only create new chat when explicitly requested (chatId changes from non-null to null)
    if (chatId === null && prevChatIdRef.current !== null) {
      console.log('[ChatInterface] User requested new chat - resetting flags and clearing messages');
      hasCreatedChatRef.current = false;
      lastLoadedChatIdRef.current = null;
      clearMessages();
      
      // Create new chat after a brief delay to ensure state is updated
      setTimeout(() => {
        if (chatId === null && documentId && !hasCreatedChatRef.current) {
          console.log('[ChatInterface] Creating new chat after explicit request');
          hasCreatedChatRef.current = true;
          createNewChat((newChatId) => {
            if (newChatId) {
              newlyCreatedChatsRef.current.add(newChatId);
            }
            if (onChatCreated) {
              onChatCreated(newChatId);
            }
            hasCreatedChatRef.current = false;
          });
        }
      }, 50);
    }
    
    prevChatIdRef.current = chatId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, documentId, clearMessages]);

  useEffect(() => {
    console.log('[ChatInterface] ========== CHAT ID CHANGED ==========');
    console.log('[ChatInterface] Current chatId:', chatId);
    console.log('[ChatInterface] Last loaded chatId:', lastLoadedChatIdRef.current);
    console.log('[ChatInterface] Is newly created?', chatId ? newlyCreatedChatsRef.current.has(chatId) : false);
    
    // If chatId exists and is not temp-trigger, remove from newlyCreatedChatsRef (it's an existing selected chat)
    if (chatId && chatId !== 'temp-trigger') {
      newlyCreatedChatsRef.current.delete(chatId); // Clear - this is a selected chat, not newly created
    }
    
    // Note: Messages loading is handled by hook when initialChatId changes
    // We don't need to load here to avoid duplicate calls
    if (chatId && chatId !== lastLoadedChatIdRef.current && chatId !== 'temp-trigger') {
      lastLoadedChatIdRef.current = chatId;
      console.log('[ChatInterface] ✅ ChatId updated, messages will be loaded by hook');
    }
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle selected text query
  useEffect(() => {
    if (selectedTextQuery && selectedTextQuery.trim()) {
      console.log('[ChatInterface] Selected text query received:', selectedTextQuery);
      
      setInputValue(selectedTextQuery);
      
      const waitForChatAndSend = () => {
        console.log('[ChatInterface] Checking if ready to send selected text query...');
        
        if (chatId && chatId !== 'temp-trigger' && (isConnected || isMockMode)) {
          console.log('[ChatInterface] Ready to send selected text query:', selectedTextQuery);
          sendMessage(selectedTextQuery);
          setInputValue("");
          if (onSelectedTextUsed) {
            onSelectedTextUsed();
          }
        } else {
          console.log('[ChatInterface] Not ready yet, retrying in 200ms...');
          setTimeout(waitForChatAndSend, 200);
        }
      };
      
      setTimeout(waitForChatAndSend, 100);
    }
  }, [selectedTextQuery, onSelectedTextUsed, sendMessage, chatId, isConnected, isMockMode]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    // Pass web search flag to backend
    sendMessage(inputValue, { useWebSearch });
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-sm sm:text-lg font-semibold text-gray-900">AI Assistant</h1>
              <p className="text-xs sm:text-sm text-gray-600">{isMockMode ? 'Demo Mode' : connectionStatus}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 bg-gray-50">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={{
            id: message.id,
            content: message.content,
            sender: message.sender,
            timestamp: message.timestamp,
            metadata: message.metadata
          }} />
        ))}

        {isTyping && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t border-gray-200 p-2 sm:p-4 flex-shrink-0">
        {/* Web Search Toggle */}
        <div className="flex items-center gap-2 mb-2 sm:mb-3 px-1">
          <button
            onClick={() => setUseWebSearch(!useWebSearch)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              useWebSearch 
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={useWebSearch ? 'Web Search Enabled' : 'Web Search Disabled'}
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" 
              />
            </svg>
            <span className="hidden sm:inline">
              {useWebSearch ? 'Web Search: ON' : 'Document Only'}
            </span>
            <span className="sm:hidden">
              {useWebSearch ? 'Web' : 'Doc'}
            </span>
          </button>
          <span className="text-xs text-gray-500 hidden sm:inline">
            {useWebSearch 
              ? '🌐 Search includes web results' 
              : '📄 Search limited to document'}
          </span>
        </div>
        
        <div className="flex gap-2 sm:gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isMockMode ? 'Ask (demo)...' : isConnected ? 'Ask...' : 'Connecting...'}
            disabled={!isConnected && !isMockMode}
            className="flex-1 px-2 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 text-sm sm:text-base"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || (!isConnected && !isMockMode)}
            className="px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const DocSathiChat = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chatHistory, setChatHistory] = useState<DocumentChat[]>([]);
  const [documentText, setDocumentText] = useState<string>('');
  const [documentType, setDocumentType] = useState<string>('');
  const [documentUrl, setDocumentUrl] = useState<string>('');
  const [documentName, setDocumentName] = useState<string>('');
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMoreChats, setLoadingMoreChats] = useState(false);
  const [loadingText, setLoadingText] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [hasMoreChats, setHasMoreChats] = useState(true);
  const [chatOffset, setChatOffset] = useState(0);
  const [selectedTextQuery, setSelectedTextQuery] = useState<string>("");
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const isProcessingSelectedTextRef = useRef(false);

  useEffect(() => {
    // Reset pagination when document changes
    setChatOffset(0);
    setHasMoreChats(true);
    loadDocumentChats(0, false);
    loadDocumentText();
  }, [documentId]);

  const loadDocumentChats = async (offset: number = 0, append: boolean = false) => {
    if (!documentId) return;
    
    console.log('loadDocumentChats called:', { offset, append, hasMoreChats, currentCount: chatHistory.length });
    
    if (!hasMoreChats && append) {
      console.log('Skipping load - no more chats available');
      return;
    }
    
    // Use different loading states for initial vs append
    if (append) {
      setLoadingMoreChats(true);
    } else {
      setLoadingChats(true);
    }
    
    try {
      console.log('Making API call with:', { documentId, limit: 10, offset });
      const response = await documentService.getDocumentChats(documentId, { limit: 10, offset });
      
      if (response.success && response.data && Array.isArray(response.data)) {
        if (append) {
          // Append to existing chats
          setChatHistory(prev => [...prev, ...(response.data || [])]);
        } else {
          // Replace chats (initial load or refresh)
          setChatHistory(response.data || []);
        }
        
        // Check if there are more chats to load
        if (response.data.length < 10) {
          setHasMoreChats(false);
        }
        
        console.log('Loaded document chats:', response.data.length, 'Offset:', offset);
      }
    } catch (error) {
      console.error('Error loading document chats:', error);
    } finally {
      if (append) {
        setLoadingMoreChats(false);
      } else {
        setLoadingChats(false);
      }
    }
  };

  const loadMoreChats = () => {
    const newOffset = chatOffset + 10;
    console.log('loadMoreChats called:', {
      currentOffset: chatOffset,
      newOffset,
      currentChatCount: chatHistory.length
    });
    setChatOffset(newOffset);
    loadDocumentChats(newOffset, true);
  };

  const loadDocumentText = async () => {
    if (!documentId) return;
    setLoadingText(true);
    try {
      const response = await documentService.getDocumentText(documentId);
      if (response.success && response.data) {
        setDocumentText(response.data.summary || '');
        setDocumentType(response.data.type || '');
        setDocumentUrl((response.data as { document_url?: string })?.document_url || '');
        setDocumentName((response.data as { document_name?: string })?.document_name || '');
      }
    } catch (error) {
      console.error('Error loading document text:', error);
    } finally {
      setLoadingText(false);
    }
  };

  const handleAskFromSelectedText = (selectedText: string) => {
    console.log('Ask DocSathi clicked with text:', selectedText);
    
    if (isProcessingSelectedTextRef.current || selectedTextQuery === selectedText) {
      console.log('Already processing selected text query, ignoring');
      return;
    }
    
    isProcessingSelectedTextRef.current = true;
    
    if (!currentChatId || currentChatId === 'temp-trigger') {
      console.log('Creating new chat for selected text');
      setCurrentChatId('temp-trigger');
      setTimeout(() => setCurrentChatId(null), 0);
    }
    
    setSelectedTextQuery(selectedText);
    
    setTimeout(() => {
      isProcessingSelectedTextRef.current = false;
    }, 2000);
  };

  const handleNewChat = () => {
    if (currentChatId === null) {
      setCurrentChatId('temp-trigger');
      setTimeout(() => setCurrentChatId(null), 0);
    } else {
      setCurrentChatId(null);
    }
  };

  const handleChatSelect = async (chatId: string) => {
    console.log('[NewChatPage] ========== CHAT SELECTED ==========');
    console.log('[NewChatPage] Chat ID:', chatId);
    console.log('[NewChatPage] Previous chat ID:', currentChatId);
    setCurrentChatId(chatId);
    console.log('[NewChatPage] Set new chat ID to state');

    // Avoid reloading chat list here to prevent extra re-renders/blink
    // We already keep chat history in state; it will refresh when needed (e.g., after new chat/message)
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Determine document types
  // Check for S3/AWS documents first (these are uploaded files like PDF, DOC, DOCX, TXT, etc.)
  const isS3Document = documentUrl && (documentUrl.includes('s3.') || documentUrl.includes('amazonaws.com') || documentUrl.includes('amazon.com/s3'));
  const isPDF = documentType?.toLowerCase() === 'pdf' || (documentUrl && documentUrl.endsWith('.pdf'));
  
  // Video detection: YouTube URLs or document type containing 'video'
  const isYouTube = !isS3Document && (documentUrl?.includes('youtube.com') || documentUrl?.includes('youtu.be'));
  const isVideo = !isS3Document && !isPDF && (isYouTube || documentType?.toLowerCase().includes('video') || documentType?.toLowerCase() === 'videourl');
  
  // Web URL: Check URL pattern first (most reliable), then fall back to documentType
  // A URL is web if:
  // 1. It starts with http:// or https://
  // 2. It's NOT an S3 document
  // 3. It's NOT a PDF
  // 4. It's NOT YouTube/video
  // OR documentType explicitly indicates web/url/website
  const isWeb = documentUrl && (
    (documentUrl.startsWith('http://') || documentUrl.startsWith('https://')) &&
    !isS3Document &&
    !isPDF &&
    !isVideo &&
    !documentUrl.includes('youtube.com') &&
    !documentUrl.includes('youtu.be')
  ) || (
    !isS3Document &&
    !isPDF &&
    !isVideo &&
    documentType &&
    (documentType.toLowerCase().includes('url') || 
     documentType.toLowerCase().includes('web') ||
     documentType.toLowerCase() === 'website')
  );
  
  // Show content section (summary/keypoints) ONLY for videos and Web URLs
  // For PDFs, S3 documents (doc, docx, txt, etc.), show ONLY the preview, NO summary
  const showContentSection = isVideo || isWeb;

  const getPreviewContent = () => {
    if (isYouTube && documentUrl) {
      const videoId = documentUrl.includes('youtu.be') 
        ? documentUrl.split('youtu.be/')[1]?.split('?')[0]
        : documentUrl.split('v=')[1]?.split('&')[0];
      
      if (videoId) {
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        return (
          <div className="h-full">
            <div className="mb-2">
              <h4 className="text-sm font-medium text-gray-700 truncate">
                {documentName || 'YouTube Video'}
              </h4>
            </div>
            <div className="h-full rounded-lg overflow-hidden shadow-lg">
              <iframe
                src={embedUrl}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>
        );
      }
    }
    
    if (isPDF && documentUrl) {
      // PDF: Show full PDF document in iframe (no content section below)
      return (
        <div className="h-full w-full">
          <div className="mb-2">
            <h4 className="text-sm font-medium text-gray-700 truncate">
              {documentName || 'PDF Document'}
            </h4>
          </div>
          <div className="h-full rounded-lg overflow-hidden border-2 border-gray-200 shadow-2xl">
            <iframe
              src={`${documentUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
              width="100%"
              height="100%"
              style={{ border: "none" }}
              title="PDF Document"
              allow="fullscreen"
              className="w-full h-full"
            />
          </div>
        </div>
      );
    }
    
    // For S3 uploaded documents (doc, docx, txt etc.) - handle ALL S3 URLs that are not PDF
    if (isS3Document && !isPDF) {
      return (
        <div className="h-full w-full">
          <div className="mb-2">
            <h4 className="text-sm font-medium text-gray-700 truncate">
              {documentName || 'Document'}
            </h4>
          </div>
          <div className="h-full rounded-lg overflow-hidden border-2 border-gray-200 shadow-2xl">
            <iframe
              src={`${documentUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
              width="100%"
              height="100%"
              style={{ border: "none" }}
              title="Document Preview"
              allow="fullscreen"
              className="w-full h-full"
            />
          </div>
        </div>
      );
    }
    
    if (isWeb && documentUrl) {
      // Extract domain from URL with error handling
      let domain = 'Website';
      try {
        const urlObj = new URL(documentUrl);
        domain = urlObj.hostname.replace('www.', '');
      } catch (error) {
        console.error('Error parsing URL:', error);
        // Try to extract domain manually
        const urlMatch = documentUrl.match(/https?:\/\/(?:www\.)?([^/]+)/);
        if (urlMatch) {
          domain = urlMatch[1];
        }
      }
      
      return (
        <div className="h-full w-full flex flex-col gap-2 sm:gap-3">
          {/* Header with URL */}
          <div className="flex-shrink-0">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate pr-2">
                {documentName || 'Web Page'}
              </h4>
              <a
                href={documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] sm:text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 sm:gap-1 font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-50 rounded-md sm:rounded-lg hover:bg-blue-100 flex-shrink-0"
              >
                <span className="hidden sm:inline">Open link</span>
                <span className="sm:hidden">Open</span>
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-600 bg-gray-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <a href={documentUrl} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 truncate text-gray-900 text-[10px] sm:text-xs">
                {documentUrl}
              </a>
            </div>
          </div>

          {/* Preview Card - Full Height */}
          <div className="flex-1 min-h-0 bg-white rounded-lg border-2 border-blue-300 shadow-xl overflow-hidden">
            <div className="h-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col items-center justify-center text-center p-4 sm:p-6 md:p-8">
              {/* Domain Name */}
              <h5 className="text-base sm:text-lg md:text-xl lg:text-2xl font-extrabold text-gray-900 mb-2 sm:mb-3 bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 break-words px-2">
                {domain}
              </h5>
              
              {/* Description */}
              <p className="text-xs sm:text-sm md:text-base text-gray-700 mb-4 sm:mb-5 md:mb-6 max-w-xs sm:max-w-sm md:max-w-md font-medium px-2">
                Click below to view the full web page. AI summary is available below.
              </p>
              
              {/* Button */}
              <button
                onClick={() => window.open(documentUrl, '_blank')}
                className="px-4 py-2 sm:px-6 sm:py-3 md:px-8 md:py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-bold text-sm sm:text-base md:text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-xl hover:shadow-2xl transform hover:scale-105 flex items-center gap-1.5 sm:gap-2"
              >
                <svg className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span>View Full Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center hover:bg-gray-200 hover:border-gray-400 transition-colors cursor-pointer shadow-lg hover:shadow-xl">
        <div className="text-center">
          <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-xs text-gray-500">Document Preview</p>
          <p className="text-xs text-gray-400">Content will appear here</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Header with Menu Button and Preview Toggle */}
      <div className="lg:hidden absolute top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">DocSathi Chat</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMobilePreview(!showMobilePreview)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FileText className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={() => navigate('/docsathi')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-blue-50 hover:border-blue-300 transition-colors flex items-center gap-2 text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Document Preview (Bottom Sheet) */}
      {showMobilePreview && (
        <>
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowMobilePreview(false)}
          />
          <div className="lg:hidden fixed left-0 right-0 bottom-0 bg-white z-40 flex flex-col" style={{ height: '85vh' }}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">
                {isPDF && documentUrl ? 'PDF Document' : isYouTube && documentUrl ? 'YouTube Video' : 
                 isWeb ? 'Web Page' : 'Document Content'}
              </h3>
              <button
                onClick={() => setShowMobilePreview(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Preview Section */}
              <div className={`${showContentSection ? 'h-2/5 border-b border-gray-200' : 'flex-1'} p-4 flex flex-col overflow-hidden`}>
                {loadingText ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-sm text-gray-500">Loading content...</span>
                  </div>
                ) : (
                  <div className="h-full overflow-hidden">
                    {getPreviewContent()}
                  </div>
                )}
              </div>

              {/* Summary/Content Section - Only for Videos and Web URLs (NOT for PDFs or uploaded documents) */}
              {showContentSection && documentText && (
                <div className="flex-1 p-4 overflow-y-auto">
                  <h4 className="font-semibold text-gray-800 mb-3">Summary & Key Points</h4>
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                    <FormattedMessage content={documentText} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <>
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowMobileSidebar(false)}
          />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 w-72 sm:w-80 bg-white z-40 flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setShowMobileSidebar(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>
              <button
                onClick={handleNewChat}
                className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 flex-shrink-0">
                <MessageSquare className="w-4 h-4" />
                Chats
              </h3>
              
              {loadingChats ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-sm text-gray-500">Loading chats...</span>
                </div>
              ) : chatHistory.length > 0 ? (
                <div className="flex-1 overflow-y-auto pr-2" onScroll={(e) => {
                  const target = e.currentTarget;
                  const scrollPercentage = (target.scrollTop / (target.scrollHeight - target.clientHeight)) * 100;
                  
                  if (scrollPercentage > 80 && hasMoreChats && !loadingMoreChats) {
                    loadMoreChats();
                  }
                }}>
                  <div className="space-y-2">
                    {currentChatId && currentChatId !== 'temp-trigger' && !chatHistory.find(chat => (chat.chat_id || chat._id) === currentChatId) && (
                      <div className="p-3 cursor-pointer transition-all duration-200 hover:shadow-md bg-blue-50 border-2 border-blue-200 shadow-sm rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">New Chat</p>
                            <p className="text-xs text-gray-500 mt-1">Currently active</p>
                          </div>
                          <div className="ml-2 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">New</div>
                        </div>
                      </div>
                    )}
                    
                    {chatHistory.map((chat, index) => (
                      <div
                        key={chat.chat_id || chat._id || `chat-${index}`}
                        className={`p-3 cursor-pointer transition-all duration-200 hover:shadow-md ${
                          currentChatId === (chat.chat_id || chat._id)
                            ? 'bg-blue-50 border-2 border-blue-200 shadow-sm' 
                            : 'hover:bg-gray-50 border-2 border-transparent'
                        } rounded-lg`}
                        onClick={() => {
                          const chatId = chat.chat_id || chat._id; // Use chat_id from backend
                          console.log('[ChatHistory] 🖱️ CLICKED on chat:', chatId, chat.title);
                          if (chatId) {
                            handleChatSelect(chatId);
                            setShowMobileSidebar(false);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-gray-900 truncate">
                              {chat.title || `Chat ${(chat.chat_id || chat._id) ? (chat.chat_id || chat._id)?.slice(-6) : 'New'}`}
                            </h4>
                            {chat.last_message && (
                              <p className="text-xs text-gray-500 mt-1 truncate">
                                {chat.last_message}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-400">
                                {chat.created_at ? formatDate(chat.created_at) : 'Now'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {loadingMoreChats && chatHistory.length > 0 && (
                      <div className="flex items-center justify-center py-4">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="ml-2 text-sm text-gray-500">Loading more...</span>
                      </div>
                    )}
                    
                    {!hasMoreChats && chatHistory.length > 0 && (
                      <div className="text-center py-4 text-xs text-gray-400">
                        No more chats
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No chats yet</p>
                  <p className="text-xs text-gray-400">Start a new conversation</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Chat History Sidebar - Hidden on mobile, visible on desktop */}
      <div className="hidden lg:flex lg:w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate('/docsathi')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-blue-50 hover:border-blue-300 transition-colors flex items-center gap-2 text-gray-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
          <button
            onClick={handleNewChat}
            className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        <div className="flex-1 p-4 overflow-hidden flex flex-col">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 flex-shrink-0">
            <MessageSquare className="w-4 h-4" />
            Chats
          </h3>
          
          {loadingChats ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-sm text-gray-500">Loading chats...</span>
            </div>
          ) : chatHistory.length > 0 ? (
            <div className="flex-1 overflow-y-auto pr-2" onScroll={(e) => {
              // Prevent scroll event from bubbling to parent elements
              e.stopPropagation();
              
              const target = e.currentTarget;
              const scrollPercentage = (target.scrollTop / (target.scrollHeight - target.clientHeight)) * 100;
              
              console.log('Scroll debug:', {
                scrollTop: target.scrollTop,
                scrollHeight: target.scrollHeight,
                clientHeight: target.clientHeight,
                scrollPercentage: Math.round(scrollPercentage),
                hasMoreChats,
                loadingMoreChats,
                shouldLoad: scrollPercentage > 80 && hasMoreChats && !loadingMoreChats
              });
              
              // Load more when scrolled 80% down
              if (scrollPercentage > 80 && hasMoreChats && !loadingMoreChats) {
                console.log('Scroll threshold reached, loading more chats...');
                loadMoreChats();
              }
            }}>
              <div className="space-y-2">
                {currentChatId && currentChatId !== 'temp-trigger' && !chatHistory.find(chat => chat._id === currentChatId) && (
                  <div className="p-3 cursor-pointer transition-all duration-200 hover:shadow-md bg-blue-50 border-2 border-blue-200 shadow-sm rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          New Chat
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Currently active
                        </p>
                      </div>
                      <div className="ml-2 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        New
                      </div>
                    </div>
                  </div>
                )}
                
                {chatHistory.map((chat, index) => (
                  <div
                    key={chat._id || `chat-${index}`}
                    className={`p-3 cursor-pointer transition-all duration-200 hover:shadow-md ${
                      currentChatId === (chat.chat_id || chat._id)
                        ? 'bg-blue-50 border-2 border-blue-200 shadow-sm' 
                        : 'hover:bg-gray-50 border-2 border-transparent'
                    } rounded-lg`}
                    onClick={() => {
                      const chatId = chat.chat_id || chat._id; // Use chat_id from backend
                      console.log('[ChatHistory] 🖱️ CLICKED on chat (desktop):', chatId, chat.title);
                      if (chatId) {
                        handleChatSelect(chatId);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 truncate">
                          {chat.title || `Chat ${chat._id ? chat._id.slice(-6) : 'New'}`}
                        </h4>
                        {chat.last_message && (
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {chat.last_message}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-400">
                            {chat.created_at ? formatDate(chat.created_at) : 'Now'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Loading more indicator */}
                {loadingMoreChats && chatHistory.length > 0 && (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-sm text-gray-500">Loading more...</span>
                  </div>
                )}
                
                {/* End of chats indicator */}
                {!hasMoreChats && chatHistory.length > 0 && (
                  <div className="text-center py-4 text-xs text-gray-400">
                    No more chats
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No chats yet</p>
              <p className="text-xs text-gray-400">Start a new conversation</p>
            </div>
          )}
        </div>
      </div>

      {/* Document Preview Panel - Show on tablet and desktop, hidden on mobile */}
      <div className="hidden lg:flex lg:w-[43%] bg-white border-r border-gray-200 flex-col">
        {/* Document Preview - Show 2/5 height for videos/web URLs (with summary below), full height for documents/PDFs (no summary) */}
        <div className={`${showContentSection ? 'h-2/5 border-b border-gray-200' : 'flex-1'} p-2 lg:p-4 flex flex-col`}>
          <h3 className="font-semibold text-gray-800 mb-3 flex-shrink-0">Document Preview</h3>
          <div className="h-full shadow-2xl rounded-lg overflow-hidden flex-1 min-h-0">
            {getPreviewContent()}
          </div>
        </div>

        {/* Document Text - Only show for Videos and Web URLs (NOT for PDFs or uploaded documents) */}
        {showContentSection && (
          <div className="flex-1 p-2 lg:p-4 flex flex-col min-h-0">
            <h3 className="font-semibold text-gray-800 mb-3 flex-shrink-0 text-sm lg:text-base">
              {isVideo ? 'Video Summary' : isWeb ? 'Web Page Summary' : 'Document Content'}
            </h3>
            {loadingText ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-sm text-gray-500">Loading content...</span>
              </div>
            ) : (
                <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50 rounded-lg border border-gray-200 relative">
                <div className="p-4">
                  {documentText ? (
                    <div className="space-y-4 select-text">
                      <FormattedMessage content={documentText} />
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No content available</p>
                      <p className="text-xs mt-1">Document content will appear here</p>
                    </div>
                  )}
                </div>
                <TextSelectionPopup onAskQuestion={handleAskFromSelectedText} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat Interface Panel - Full width on mobile, more space on desktop */}
      <div className="w-full lg:w-[57%] flex flex-col mt-12 md:mt-0 relative">
        {/* Quick Actions Button */}
        <div className="absolute top-1/2 right-4 transform -translate-y-1/2 z-10 hidden lg:block">
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="bg-gradient-to-b from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg px-3 py-6 rounded-lg transition-all"
            style={{ 
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
            }}
          >
            <span className="text-xs font-semibold">Quick Actions</span>
          </button>
        </div>

        <ChatInterface
          documentId={documentId || ''}
          chatId={currentChatId} 
          onChatCreated={(newChatId) => {
            setCurrentChatId(newChatId);
            loadDocumentChats();
          }}
          selectedTextQuery={selectedTextQuery}
          onSelectedTextUsed={() => setSelectedTextQuery("")}
        />

        {/* Quick Actions Overlay */}
        {showQuickActions && documentId && (
          <QuickActionsOverlay
            documentId={documentId}
            documentTitle={documentName || 'Document'}
            userId={user?._id || '1'}
            onClose={() => setShowQuickActions(false)}
          />
        )}
      </div>
    </div>
  );
};

export default DocSathiChat;

