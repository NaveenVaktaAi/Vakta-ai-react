import { useEffect, useRef, useState, useCallback } from 'react';
import { chatService } from '../services/chatService';

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface SendMessageOptions {
  useWebSearch?: boolean;
}

interface UseChatWebSocketReturn {
  isConnected: boolean;
  sendMessage: (message: string, options?: SendMessageOptions) => void;
  messages: Message[];
  isTyping: boolean;
  connect: () => void;
  disconnect: () => void;
  clearMessages: () => void;
  exportMessages: () => void;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  isMockMode: boolean;
  currentChatId: string | null;
  createNewChat: (onChatCreated?: (chatId: string | null) => void) => Promise<string | null>;
  loadChatMessages: (chatId: string) => Promise<void>;
}

export function useChatWebSocket(
  userId: number = 1,
  documentId?: string | null,
  initialChatId?: string | null
): UseChatWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: documentId
        ? "Hello! I'm your AI assistant. I'm ready to help you with your document. What would you like to know?"
        : "Hello! I'm your AI assistant with document knowledge. Upload documents to get more accurate answers, or ask me anything!",
      sender: 'bot',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [isMockMode, setIsMockMode] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(initialChatId || null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const hasAttemptedConnect = useRef<string | null>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const isLoadingMessagesRef = useRef(false);
  const hasCreatedChatRef = useRef(false);
  const isSelectingChatRef = useRef(false); // Track if we're in the middle of selecting a chat

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;
  const shouldReconnectRef = useRef(true);
  const connectFnRef = useRef<((targetChatId?: string | null) => Promise<void>) | null>(null);

  // Auto-connect effect - will be added after connect function is defined

  const createNewChat = useCallback(async (onChatCreated?: (chatId: string | null) => void): Promise<string | null> => {
    if (isCreatingChat) {
      console.log('[Chat] Chat creation already in progress, skipping...');
      return currentChatId;
    }

    // Prevent creating chat if already created for this session
    if (hasCreatedChatRef.current && !currentChatId) {
      console.log('[Chat] Chat already created this session, skipping...');
      return currentChatId;
    }

    setIsCreatingChat(true);
    try {
      // Generate title with current date/time like Next.js
      const now = new Date();
      const dateStr = now.toLocaleString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(',', '');
      const title = `Chat with Document ${dateStr}`;
      
      const response = await chatService.createChat({
        document_id: documentId || null,
        title: title,
        status: "pending"  // Status should be "pending" initially
      });

      if (response.success && response.data?.chat_id) {
        const newChatId = response.data.chat_id;
        hasCreatedChatRef.current = true; // Mark as created
        hasAttemptedConnect.current = null; // Reset to allow connection
        shouldReconnectRef.current = true; // Ensure reconnection is enabled
        setCurrentChatId(newChatId); // This will trigger auto-connect useEffect
        
        // Immediately connect WebSocket after chat creation
        console.log('[Chat] 🆕 Chat created, connecting WebSocket to:', newChatId);
        setTimeout(() => {
          // Ensure we connect to the newly created chat
          hasAttemptedConnect.current = newChatId;
          // Use ref to call connect function to avoid circular dependency
          if (connectFnRef.current) {
            connectFnRef.current(newChatId);
          }
        }, 100);
        
        if (onChatCreated) {
          onChatCreated(newChatId);
        }
        return newChatId;
      } else {
        throw new Error('Failed to create chat');
      }
    } catch (error) {
      console.error('[Chat] Error creating chat:', error);
      setIsMockMode(true);
      return null;
    } finally {
      setIsCreatingChat(false);
    }
  }, [documentId, currentChatId, isCreatingChat]);

  const loadChatMessages = useCallback(async (chatId: string) => {
    try {
      isLoadingMessagesRef.current = true; // Prevent WebSocket reconnect during loading
      console.log('[Chat] Loading messages for chat:', chatId);
      
      // Clear existing messages and typing state
      setIsTyping(false);
      processedMessageIds.current.clear();
      
      const response = await chatService.getChatWithMessages(chatId, 1, 50);
      console.log('[Chat] Full response:', response);
      console.log('[Chat] Response type:', typeof response);
      console.log('[Chat] Response keys:', Object.keys(response));
      console.log('[Chat] response.success:', response.success);
      console.log('[Chat] response.data:', response.data);
      
      // response is { success: true, data: { chat, messages, total_messages } }
      if (response.success && response.data) {
        const { chat, messages: backendMessages, total_messages } = response.data;
        
        console.log('[Chat] Chat data:', chat);
        console.log('[Chat] Messages array:', backendMessages);
        console.log('[Chat] Messages array type:', Array.isArray(backendMessages));
        console.log('[Chat] Total messages:', total_messages);
        
        if (backendMessages && Array.isArray(backendMessages) && backendMessages.length > 0) {
          // Convert backend messages to frontend Message format
          const chatMessages: Message[] = backendMessages.map((msg: Record<string, unknown>) => ({
            id: String(msg._id || msg.message_id || msg.id || Math.random().toString()),
            content: String(msg.message || msg.content || ''), // Backend uses 'message' field
            sender: (msg.is_bot ? 'bot' : 'user') as 'user' | 'bot',
            timestamp: String(msg.created_ts || msg.created_at || new Date().toISOString()), // Backend uses 'created_ts'
            metadata: {
              token: msg.token,
              type: msg.type,
              reaction: msg.reaction,
              is_edited: msg.is_edited,
              citation_source: msg.citation || undefined  // ✅ Include citation from backend
            } as Record<string, unknown>
          }));
          
          console.log('[Chat] Converted messages:', chatMessages);
          
          // Set messages - DON'T update currentChatId here (already set by caller)
          setMessages(chatMessages);
          // Note: currentChatId is already set by the caller, don't set it again
          
          console.log('[Chat] ✅ Messages loaded! Count:', chatMessages.length);
        } else {
          // If no messages found, keep welcome message instead of clearing
          console.log('[Chat] No messages found for chat, keeping welcome message');
          // Don't update currentChatId - already set by caller
          // Don't clear messages - keep the initial welcome message
        }
      } else {
        console.log('[Chat] ❌ No messages in response:', response);
        // Don't update currentChatId - already set by caller
      }
    } catch (error) {
      console.error('[Chat] Error loading messages:', error);
      // Don't update currentChatId - already set by caller
    } finally {
      isLoadingMessagesRef.current = false; // Allow WebSocket reconnect after loading
    }
  }, []);

  const connect = useCallback(async (targetChatId?: string | null) => {
    if (isMockMode || !shouldReconnectRef.current) return;
    if (connectionStatus === 'connecting') return;

    setConnectionStatus('connecting');

    try {
      // Use provided targetChatId, or fall back to currentChatId, or create new
      let chatId = targetChatId || currentChatId;
      if (!chatId) {
        chatId = await createNewChat();
        if (!chatId) {
          throw new Error('Failed to create chat');
        }
      }

      const wsUrl = `${import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:5000'}/api/v1/chat/ws/${chatId}`;
      console.log('[Chat] 🔌 WebSocket connecting to chatId:', chatId, 'URL:', wsUrl);
      console.log('[Chat] hasAttemptedConnect:', hasAttemptedConnect.current, 'currentChatId:', currentChatId, 'targetChatId:', targetChatId);
      
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[Chat] Connected to WebSocket for chat:', chatId);
        setIsConnected(true);
        setConnectionStatus('connected');
        setIsMockMode(false);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[Chat] Message received:', data);

          // Only process bot messages
          if (data.isBot === false) {
            console.log('[Chat] Ignoring user message confirmation');
            return;
          }

          // Handle different message types
          if (data.mt === 'chat_message_bot_partial') {
            // Streaming message chunks
            setIsTyping(true);
            
            if (data.start) {
              // Start of streaming - create new message
              const newMessage: Message = {
                id: data.start,
                content: data.message || '',
                sender: 'bot',
                timestamp: data.timestamp || new Date().toISOString(),
                metadata: { streaming: true, token: data.token }
              };
              setMessages(prev => [...prev, newMessage]);
              processedMessageIds.current.add(data.start);
            } else if (data.partial) {
              // Partial content - append to existing message
              setMessages(prev => prev.map(msg =>
                msg.id === data.uuid
                  ? { ...msg, content: msg.content + data.partial }
                  : msg
              ));
            } else if (data.stop) {
              // Message complete - include citation_source if provided
              setMessages(prev => prev.map(msg =>
                msg.id === data.stop
                  ? { 
                      ...msg, 
                      metadata: { 
                        ...msg.metadata, 
                        streaming: false,
                        citation_source: data.citation_source || undefined  // ✅ Add citation source
                      } 
                    }
                  : msg
              ));
              setIsTyping(false);
            }
          } else if (data.mt === 'message_upload_confirm' && data.isBot === true) {
            // Complete bot message
            setIsTyping(false);
            const newMessage: Message = {
              id: data.token || Date.now().toString(),
              content: data.message || '',
              sender: 'bot',
              timestamp: data.timestamp || new Date().toISOString(),
              metadata: data.message_context
            };
            setMessages(prev => [...prev, newMessage]);
            processedMessageIds.current.add(newMessage.id);
          } else if (data.mt === 'thinking_indicator') {
            // Show thinking status
            setIsTyping(true);
          } else if (data.mt === 'error') {
            // Error message
            setIsTyping(false);
            console.error('[Chat] Backend error:', data.message);
          }
        } catch (error) {
          console.error('[Chat] Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[Chat] WebSocket error:', error);
        setConnectionStatus('error');
        setIsMockMode(true);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('[Chat] WebSocket closed for chatId:', chatId);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Only auto-reconnect if:
        // 1. Reconnect is enabled
        // 2. We haven't exceeded max attempts
        // 3. We're still connected to the same chatId (not switching chats)
        if (shouldReconnectRef.current && 
            reconnectAttemptsRef.current < maxReconnectAttempts &&
            hasAttemptedConnect.current === chatId &&
            !isSelectingChatRef.current) {
          reconnectAttemptsRef.current++;
          console.log(`[Chat] Attempting reconnect ${reconnectAttemptsRef.current}/${maxReconnectAttempts} for chatId: ${chatId}`);
          reconnectTimeoutRef.current = setTimeout(() => {
            // Double-check conditions before reconnecting
            if (hasAttemptedConnect.current === chatId && shouldReconnectRef.current && !isSelectingChatRef.current) {
              connect(chatId); // Pass chatId explicitly
            }
          }, 2000);
        } else {
          console.log('[Chat] Not reconnecting - switching chats or max attempts reached');
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[Chat] Connection error:', error);
      setConnectionStatus('error');
      setIsMockMode(true);
    }
  }, [currentChatId, isMockMode, connectionStatus, createNewChat]);

  // Store connect function in ref so createNewChat can use it
  useEffect(() => {
    connectFnRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  const sendMessage = useCallback((message: string, options?: SendMessageOptions) => {
    if (!message.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);

    // Only send if connected to the current chatId (safety check)
    if (isConnected && 
        currentChatId && 
        hasAttemptedConnect.current === currentChatId &&
        wsRef.current && 
        wsRef.current.readyState === WebSocket.OPEN) {
      // Backend expects this format according to router.py line 414
      const chatMessage = {
        mt: "message_upload",
        message: message,
        userId: userId.toString(),
        chatId: currentChatId,
        documentId: documentId || "",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        selectedLanguage: "en",
        useWebSearch: options?.useWebSearch ?? false // Web search flag
      };
      
      console.log('[Chat] Sending message to chatId:', currentChatId, 'Web Search:', options?.useWebSearch ?? false);
      console.log('[Chat] Message payload:', chatMessage);
      wsRef.current.send(JSON.stringify(chatMessage));
      setIsTyping(true);
    } else {
      console.log('[Chat] Cannot send - WebSocket not connected to current chatId. Current:', currentChatId, 'Connected to:', hasAttemptedConnect.current);
      console.log('[Chat] Mock mode - simulating response');
      setIsTyping(true);
      setTimeout(() => {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: 'This is a demo response. Connect to the backend for real AI responses.',
          sender: 'bot',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, botMessage]);
        setIsTyping(false);
      }, 1000);
    }
  }, [isConnected, currentChatId, userId, documentId]);

  const clearMessages = useCallback(() => {
    // Restore welcome message when clearing
    setMessages([
      {
        id: '1',
        content: documentId
          ? "Hello! I'm your AI assistant. I'm ready to help you with your document. What would you like to know?"
          : "Hello! I'm your AI assistant with document knowledge. Upload documents to get more accurate answers, or ask me anything!",
        sender: 'bot',
        timestamp: new Date().toISOString(),
      },
    ]);
    processedMessageIds.current.clear();
  }, [documentId]);

  const exportMessages = useCallback(() => {
    const dataStr = JSON.stringify(messages, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-export-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [messages]);

  // Reset chat creation flag when documentId changes
  useEffect(() => {
    hasCreatedChatRef.current = false;
  }, [documentId]);

  // Handle chat selection - when initialChatId changes, connect to that chatId
  useEffect(() => {
    if (initialChatId && initialChatId !== hasAttemptedConnect.current) {
      const selectedChatId = initialChatId;
      const oldChatId = hasAttemptedConnect.current;
      console.log('[Chat] 📌 Chat selected - connecting to chatId:', selectedChatId);
      
      // Mark that we're selecting a chat (prevent "new chat" useEffect from interfering)
      isSelectingChatRef.current = true;
      
      // Disconnect old connection (before setting new)
      if (wsRef.current && oldChatId) {
        console.log('[Chat] Closing old WebSocket for chat:', oldChatId, 'before connecting to:', selectedChatId);
        shouldReconnectRef.current = false;
        wsRef.current.close();
        wsRef.current = null;
        setIsConnected(false);
        setConnectionStatus('disconnected');
      }
      
      // Prevent multiple connections - set immediately
      hasAttemptedConnect.current = selectedChatId;
      
      // Set currentChatId (connect() will use selectedChatId parameter)
      setCurrentChatId(selectedChatId);
      shouldReconnectRef.current = true;
      
      // Load messages for selected chat
      loadChatMessages(selectedChatId);
      
      // Connect after state update - PASS selectedChatId explicitly
      setTimeout(() => {
        // Double check we still want to connect to this chatId and haven't switched
        if (hasAttemptedConnect.current === selectedChatId && 
            shouldReconnectRef.current && 
            !isMockMode) {
          console.log('[Chat] ✅ Connecting to selected chatId:', selectedChatId);
          isSelectingChatRef.current = false; // Clear flag before connecting
          connect(selectedChatId); // Pass chatId explicitly to avoid stale closure
        } else {
          console.log('[Chat] ❌ Skipping connect - chatId changed or conditions not met');
          isSelectingChatRef.current = false;
        }
      }, 200);
    } else if (initialChatId && initialChatId === hasAttemptedConnect.current) {
      // Already connected to this chat, just ensure flag is clear
      isSelectingChatRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChatId]);

  // Handle new chat creation - ONLY when currentChatId changes and it's NOT from initialChatId
  useEffect(() => {
    // ONLY connect if this is truly a NEW chat creation:
    // 1. currentChatId exists
    // 2. initialChatId is NULL (not a selected chat) - this is the KEY check
    // 3. We're NOT in the middle of selecting a chat
    // 4. We haven't already connected to this chatId
    // 5. Not loading messages (to avoid conflict)
    const isTrulyNewChat = currentChatId && 
        !initialChatId && // CRITICAL: Only if not a selected chat
        !isSelectingChatRef.current && // CRITICAL: Not in the middle of chat selection
        hasAttemptedConnect.current !== currentChatId &&
        !isLoadingMessagesRef.current &&
        !isMockMode &&
        shouldReconnectRef.current;
    
    if (isTrulyNewChat) {
      console.log('[Chat] 🆕 New chat created - connecting to chatId:', currentChatId);
      
      // Disconnect old connection if different
      const oldChatId = hasAttemptedConnect.current;
      if (wsRef.current && oldChatId && oldChatId !== currentChatId) {
        console.log('[Chat] Closing old WebSocket for chat:', oldChatId, 'before connecting to new chat:', currentChatId);
        shouldReconnectRef.current = false;
        wsRef.current.close();
        wsRef.current = null;
        setIsConnected(false);
        setConnectionStatus('disconnected');
      }
      
      // Prevent multiple connections - set immediately
      hasAttemptedConnect.current = currentChatId;
      shouldReconnectRef.current = true;
      
      // Connect to new chat - PASS currentChatId explicitly
      const newChatId = currentChatId; // Capture value before setTimeout
      setTimeout(() => {
        // Verify conditions still valid
        if (hasAttemptedConnect.current === newChatId && 
            !initialChatId && // Still no selected chat
            shouldReconnectRef.current && 
            !isMockMode) {
          console.log('[Chat] ✅ Connecting to new chatId:', newChatId);
          connect(newChatId); // Pass chatId explicitly to avoid stale closure
        } else {
          console.log('[Chat] ❌ Skipping connect to new chat - conditions changed');
        }
      }, 150);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChatId, initialChatId, isMockMode]);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    isConnected,
    sendMessage,
    messages,
    isTyping,
    connect,
    disconnect,
    clearMessages,
    exportMessages,
    connectionStatus,
    isMockMode,
    currentChatId,
    createNewChat,
    loadChatMessages,
  };
}

