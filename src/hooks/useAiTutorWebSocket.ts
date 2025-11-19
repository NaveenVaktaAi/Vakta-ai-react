import { useCallback, useEffect, useRef, useState } from 'react';
import { aiTutorService, buildTutorWsUrl } from '../services/aiTutorService';
import { fetchAndDecompressAudio, extractCompressionMetadata, isCompressedAudioUrl } from '../utils/audioDecompression';

export interface TutorMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: string;
  files?: { preview: string; id: string; type: 'image' | 'pdf'; name?: string }[]; // File previews for display
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UploadedFile {
  file: File;
  preview: string;
  id: string;
  type: 'image' | 'pdf';
}

interface SendOptions {
  isAudio?: boolean;
  token?: string;
  timezone?: string;
  languageCode?: string;
  audioUrl?: string;
  images?: UploadedFile[]; // Array of uploaded images
  pdfs?: UploadedFile[]; // Array of uploaded PDFs
  filePreviews?: { preview: string; id: string; type: 'image' | 'pdf'; name?: string }[]; // File previews for display
}

// Phoneme data structure for Unity
interface PhonemeData {
  time: number;        // milliseconds
  blendshape: string;  // Unity blendshape name
  weight: number;      // 0.0 to 1.0
}

export interface TokenLimitData {
  message: string;
  tokensRemaining?: number;
  service?: string;
  upgradeRequired?: boolean;
  tokensNeeded?: number;
  tokensUsed?: number;
  tokenLimit?: number;
  percentageUsed?: number;
  dailyLimitExceeded?: boolean;
}

export function useAiTutorWebSocket(
  userId: number,
  onTokenLimitExceeded?: (data: TokenLimitData) => void
) {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState<string>('');
  const [thinkingStatus, setThinkingStatus] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioQueueRef = useRef<Array<{url: string, phonemes: PhonemeData[], id: string}>>([]);
  const isPlayingAudioRef = useRef<boolean>(false);
  const processedAudioIdsRef = useRef<Set<string>>(new Set()); // Track processed audio chunks to prevent duplicates
  const processedMessageIdsRef = useRef<Set<string>>(new Set()); // Track processed message IDs to prevent duplicates

  // Convert backend phonemes to Unity format (same as NextJS implementation)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convertToUnityFormat = useCallback((backendPhonemes: any[]): PhonemeData[] => {
    if (!backendPhonemes || backendPhonemes.length === 0) return [];
    
    const mapBlendshape = (name?: string): string => {
      if (!name) return 'sil';
      const n = String(name);
      const table: Record<string, string> = {
        'AE': 'AE', 'IH': 'IH', 'EE': 'EE', 'Er': 'Er', 'IY': 'EE', 'E': 'EE',
        'AA': 'Ah', 'AH': 'Ah', 'A': 'Ah', 'AO': 'Oh', 'OW': 'Oh', 'OY': 'Oh', 'O': 'Oh',
        'UW': 'W_OO', 'UH': 'W_OO', 'U': 'W_OO', 'W_OO': 'W_OO',
        'OH': 'Oh', 'Oh': 'Oh', 'Ah': 'Ah', 'TH': 'TH',
        'T_L_D_N': 'T_L_D_N', 'K_G_H_NG': 'K_G_H_NG', 'B_M_P': 'B_M_P',
        'S_Z': 'S_Z', 'F_V': 'F_V', 'R': 'R',
        'L': 'T_L_D_N', 'D': 'T_L_D_N', 'N': 'T_L_D_N', 'T': 'T_L_D_N',
        'G': 'K_G_H_NG', 'H': 'K_G_H_NG', 'NG': 'K_G_H_NG', 'K': 'K_G_H_NG',
        'P': 'B_M_P', 'B': 'B_M_P', 'M': 'B_M_P',
        'Z': 'S_Z', 'S': 'S_Z', 'V': 'F_V', 'F': 'F_V',
        'Ch_J': 'Ch_J', 'sil': 'sil'
      };
      return table[n] || n;
    };

    const defaultWeight = (blendshape: string): number => {
      switch (blendshape) {
        case 'Ah': return 0.9;
        case 'Oh': return 0.85;
        case 'AE': return 0.8;
        case 'EE': return 0.6;
        case 'IH': return 0.5;
        case 'W_OO': return 0.6;
        case 'Er': return 0.5;
        case 'sil': return 0.0;
        default: return 0.35;
      }
    };

    const raw = backendPhonemes.map(phoneme => {
      const blend = mapBlendshape(phoneme.unity_blendshape || phoneme.phoneme);
      return {
        time: Math.round((phoneme.start_time || 0) * 1000), // Convert seconds to milliseconds
        blendshape: blend,
        weight: defaultWeight(blend)
      } as PhonemeData;
    });

    // Sort and collapse near-duplicates
    raw.sort((a, b) => a.time - b.time);
    const MIN_GAP_MS = 30;
    const smoothed: PhonemeData[] = [];
    for (const p of raw) {
      const last = smoothed[smoothed.length - 1];
      if (last && last.blendshape === p.blendshape && p.time - last.time < MIN_GAP_MS) continue;
      smoothed.push(p);
    }
    return smoothed;
  }, []);

  // ✅ NOTE: Audio queue management moved to Unity HTML
  // Unity maintains its own seamless queue and plays chunks continuously without gaps
  // Frontend just sends chunks as they arrive - Unity handles the rest

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch { /* ignore */ }
      wsRef.current = null;
    }
    // Clear audio queue
    audioQueueRef.current = [];
    isPlayingAudioRef.current = false;
    processedAudioIdsRef.current.clear(); // Clear processed audio IDs on disconnect
    processedMessageIdsRef.current.clear(); // Clear processed message IDs on disconnect
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  const connect = useCallback((conversationId: string) => {
    // ✅ PREVENT MULTIPLE CONNECTIONS: Close existing connection before creating new one
    if (wsRef.current) {
      console.log('[AI Tutor] ⚠️ Closing existing WebSocket connection before creating new one');
      try {
        wsRef.current.close();
      } catch (e) {
        console.warn('[AI Tutor] Error closing existing connection:', e);
      }
      wsRef.current = null;
    }
    
    const wsUrl = buildTutorWsUrl(conversationId);
    setConnectionStatus('connecting');
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const messageType = data?.mt || data?.type; // Support both mt and type
          
          console.log('[AI Tutor] Received message:', messageType, data);
          
          switch (messageType) {
            case 'connected':
              console.log('[AI Tutor] Connected:', data.message);
              break;
              
            case 'user_message_received':
              // User message confirmation or bot message (like token limit warning)
              console.log('[AI Tutor] Message received:', data.message, 'isBot:', data.isBot);
              
              // ✅ If it's a bot message (like token limit warning), add it to chat
              if (data.isBot && data.type === 'token_limit_warning') {
                setMessages((prev) => {
                  const messageId = data.token || `token-warning-${Date.now()}`;
                  
                  // Check if message already exists
                  const exists = prev.some(msg => msg.id === messageId);
                  if (exists) {
                    console.log('[AI Tutor] ⏭️ Token warning message already exists');
                    return prev;
                  }
                  
                  return [...prev, {
                    role: 'assistant' as const,
                    content: data.message || '',
                    id: messageId,
                    createdAt: data.timestamp || new Date().toISOString()
                  }];
                });
              }
              // Otherwise, it's just a user message confirmation - already added when sent
              break;
              
            case 'stream_start':
              console.log('[AI Tutor] stream_start - Setting typing indicator');
              // Keep typing indicator ON - it should already be ON from sendMessage
              setIsStreaming(true);
              setIsTyping(true); // Ensure it's ON
              // Don't set thinking message/status - just show three dots
              // Only show thinking message if backend explicitly sends thinking_indicator
              // Initialize new message with proper ID
              setMessages((prev) => {
                const messageId = data.messageId || `stream-${Date.now()}`;
                
                // ✅ DUPLICATE PREVENTION: Check if message ID already processed
                if (processedMessageIdsRef.current.has(messageId)) {
                  console.log('[AI Tutor] ⏭️ Skipping duplicate stream_start:', messageId);
                  return prev;
                }
                
                // Check if message already exists in messages array
                const exists = prev.some(msg => msg.id === messageId);
                if (exists) {
                  console.log('[AI Tutor] ⏭️ Message already exists in array:', messageId);
                  return prev;
                }
                
                // Mark as processed
                processedMessageIdsRef.current.add(messageId);
                
                return [...prev, { 
                  role: 'assistant' as const, 
                  content: '',
                  id: messageId,
                  createdAt: new Date().toISOString()
                }];
              });
              break;
              
            case 'stream_chunk':
              // Append chunk to the last message (assistant message)
              // CRITICAL: Keep typing indicator ON during streaming - don't turn it off!
              setIsTyping(true);
              setIsStreaming(true);
              // Don't set thinking message/status during chunks - just show three dots
              // Only show thinking message if backend explicitly sends thinking_indicator
              setMessages((prev) => {
                const chunk = data.chunk || '';
                if (!chunk) {
                  console.log('[AI Tutor] ⚠️ Empty chunk received, skipping');
                  return prev; // Don't update if no chunk
                }
                
                const newMessages = [...prev];
                const lastMsg = newMessages[newMessages.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                  // Only append if chunk is not already in content (prevent duplication)
                  if (!lastMsg.content.endsWith(chunk)) {
                    // Create new message object instead of mutating
                    const updatedContent = (lastMsg.content || '') + chunk;
                    newMessages[newMessages.length - 1] = {
                      ...lastMsg,
                      content: updatedContent
                    };
                    // Debug log every 10th chunk to avoid spam
                    if (updatedContent.length % 50 < chunk.length) {
                      console.log('[AI Tutor] 📝 Stream chunk added, content length:', updatedContent.length);
                    }
                  } else {
                    console.log('[AI Tutor] ⏭️ Duplicate chunk detected, skipping');
                  }
                } else {
                  console.log('[AI Tutor] ⚠️ No assistant message found for chunk, creating new one');
                  // If no assistant message exists, create one
                  const messageId = data.messageId || `stream-${Date.now()}`;
                  newMessages.push({
                    role: 'assistant' as const,
                    content: chunk,
                    id: messageId,
                    createdAt: new Date().toISOString()
                  });
                }
                return newMessages;
              });
              break;
              
            case 'stream_end':
              // Only turn off typing indicator when stream ends
              console.log('[AI Tutor] stream_end - Turning off typing indicator');
              setIsTyping(false);
              setIsStreaming(false);
              // Clear thinking indicators only after stream ends
              setThinkingMessage('');
              setThinkingStatus('');
              // Finalize the message with fullText (if provided and different)
              if (data.fullText) {
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMsg = newMessages[newMessages.length - 1];
                  if (lastMsg && lastMsg.role === 'assistant') {
                    // Only replace if fullText is different (prevents unnecessary re-render)
                    if (lastMsg.content !== data.fullText) {
                      // Create new message object instead of mutating
                      newMessages[newMessages.length - 1] = {
                        ...lastMsg,
                        content: data.fullText
                      };
                    }
                  }
                  return newMessages;
                });
              }
              // Clear processed audio IDs when stream ends to allow new audio for next message
              // But keep a small buffer to prevent immediate duplicates
              if (processedAudioIdsRef.current.size > 100) {
                processedAudioIdsRef.current.clear();
              }
              // Clear processed message IDs periodically (keep last 50 to prevent immediate duplicates)
              if (processedMessageIdsRef.current.size > 50) {
                processedMessageIdsRef.current.clear();
              }
              break;
              
            case 'typing_indicator':
              // Explicit typing indicator from backend - keep it ON
              // Just show three dots - don't set thinking message unless backend sends it
              console.log('[AI Tutor] typing_indicator received - keeping typing ON');
              setIsTyping(true);
              // Don't set thinking message/status - just show dots
              break;
              
            case 'stop_typing_indicator':
              // Only backend can explicitly stop typing indicator
              console.log('[AI Tutor] stop_typing_indicator received - turning typing OFF');
              setIsTyping(false);
              setIsStreaming(false);
              setThinkingMessage('');
              setThinkingStatus('');
              break;
              
            case 'thinking_indicator':
              // Backend sends thinking status like "Analyzing...", "Searching...", etc.
              console.log('[AI Tutor] ✅ Thinking indicator received:', data.message, data.status);
              // Keep typing indicator ON - don't turn it off
              setIsTyping(true);
              setIsStreaming(false); // Not streaming yet, just thinking
              setThinkingMessage(data.message || 'Processing...');
              setThinkingStatus(data.status || 'thinking');
              console.log('[AI Tutor] Set state - isTyping: true, message:', data.message, 'status:', data.status);
              break;
              
            case 'token_limit_exceeded':
              // ✅ Token limit exceeded - show popup modal only if upgrade required
              console.log('[AI Tutor] Token limit exceeded:', data);
              const tokenData: TokenLimitData = {
                message: data.message || 'Your free trial credits are running low.',
                tokensRemaining: data.tokensRemaining,
                service: data.service || 'aiTutor',
                upgradeRequired: data.upgradeRequired !== false,
                tokensNeeded: data.tokensNeeded,
                tokensUsed: data.tokensUsed,
                tokenLimit: data.tokenLimit,
                percentageUsed: data.percentageUsed,
                dailyLimitExceeded: data.dailyLimitExceeded
              };
              
              setIsTyping(false);
              setIsStreaming(false);
              setThinkingMessage('');
              setThinkingStatus('');
              
              // ✅ Only call callback (which shows modal) if upgrade is required
              // Show modal only if: upgradeRequired is true AND dailyLimitExceeded is not true
              // Don't show modal for premium users (upgradeRequired=false) or daily quota exceeded
              if (onTokenLimitExceeded && (data.upgradeRequired === true && data.dailyLimitExceeded !== true)) {
                onTokenLimitExceeded(tokenData);
              }
              break;
              
            case 'error':
              console.error('[AI Tutor] Error:', data.error);
              setIsTyping(false);
              setIsStreaming(false);
              setThinkingMessage('');
              setThinkingStatus('');
              break;
              
            // Legacy support
            case 'user_message':
              // Only add if not already in messages (prevent duplicates from backend echo)
              if (data?.message) {
                setMessages((prev) => {
                  const lastMessage = prev[prev.length - 1];
                  const messageText = String(data.message);
                  // Don't add if last message is the same (prevents duplicate)
                  if (lastMessage && lastMessage.role === 'user' && lastMessage.content === messageText) {
                    console.log('[AI Tutor] Duplicate user_message from backend ignored');
                    return prev;
                  }
                  return [...prev, { role: 'user', content: messageText }];
                });
              }
              break;
              
            case 'bot_message':
              if (data?.message) {
            setMessages((prev) => [...prev, { role: 'assistant', content: String(data.message) }]);
              }
              break;
              
            case 'status':
              // Backend explicitly sent status - show it
              console.log('[AI Tutor] status received:', data.status, data.message);
            setThinkingStatus(String(data.status || ''));
            setThinkingMessage(String(data.message || ''));
              setIsTyping(true); // Keep typing ON when status is shown
              break;
              
            case 'audio':
            case 'audio_chunk': {
              // Handle audio chunk with phonemes for Unity avatar
              console.log('[AI Tutor] 🎵 ==================== AUDIO RECEIVED ====================');
              
              // Create unique audio ID to prevent duplicates
              // Use backend's messageId and chunkIndex if available, otherwise generate unique ID
              const messageId = data?.messageId || data?.conversationId || `msg-${Date.now()}`;
              const chunkIndex = data?.chunkIndex ?? 0;
              const audioUrlForId = data?.audioUrl || data?.audioFile || '';
              // Create unique ID: messageId + chunkIndex + audioUrl filename (to catch duplicates even if indices are same)
              const audioFilename = audioUrlForId ? audioUrlForId.substring(audioUrlForId.lastIndexOf('/') + 1) : 'audio';
              const audioId = `${messageId}-chunk-${chunkIndex}-${audioFilename}`;
              
              // ✅ DUPLICATE PREVENTION: Skip if already processed
              if (processedAudioIdsRef.current.has(audioId)) {
                console.log('[AI Tutor] ⏭️ Skipping duplicate audio chunk:', audioId);
                break;
              }
              
              // Mark as processed
              processedAudioIdsRef.current.add(audioId);
              
              console.log('[AI Tutor] 🎵 Raw backend data:', {
                audioId: audioId,
                audioUrl: data?.audioUrl,
                phonemeCount: data?.phonemes?.length || 0,
                text: data?.text,
                chunkIndex: chunkIndex,
                is_compressed: data?.is_compressed
              });
              
              // Convert backend phonemes to Unity format (user's Unity expects simple format)
              const backendPhonemes = data?.phonemes || [];
              const unityPhonemes = convertToUnityFormat(backendPhonemes);
              
              console.log('[AI Tutor] 🎭 Backend phonemes:', backendPhonemes.length);
              console.log('[AI Tutor] 🎭 Unity phonemes:', unityPhonemes.length);
              
              // Prepare audio URL - Use backend URL for audio files
              let audioUrl = null;
              if (data?.audioUrl) {
                if (data.audioUrl.startsWith('http')) {
                  audioUrl = data.audioUrl;
                } else {
                  const backendUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';
                  try {
                    const urlObj = new URL(backendUrl);
                    audioUrl = `${urlObj.protocol}//${urlObj.host}${data.audioUrl}`;
                    console.log('[AI Tutor] 🎵 Audio URL (backend):', audioUrl);
                  } catch (e) {
                    const host = window.location.hostname;
                    audioUrl = `http://${host}:5000${data.audioUrl}`;
                    console.log('[AI Tutor] 🎵 Audio URL (fallback):', audioUrl);
                  }
                }
              }
              
              // 🚀 Handle compressed audio: fetch, decompress, and create blob URL
              if (unityPhonemes.length > 0 && audioUrl) {
                // Check if audio is compressed
                const compressionMetadata = extractCompressionMetadata(data);
                const isCompressed = compressionMetadata.is_compressed || isCompressedAudioUrl(audioUrl);
                
                // Function to send audio to Unity (used for both compressed and uncompressed)
                const sendAudioToUnity = (finalAudioUrl: string, finalPhonemes: PhonemeData[]) => {
                  // Only send to the first/active iframe to prevent duplicates
                  const iframe = document.querySelector('iframe[src*="/WebGL/index.html"]') as HTMLIFrameElement;
                  if (iframe?.contentWindow) {
                    iframe.contentWindow.postMessage({
                      type: 'PLAY_TTS_WITH_PHONEMES',
                      payload: {
                        audioUrl: finalAudioUrl,
                        audioData: null,
                        phonemes: finalPhonemes,
                        id: audioId // Use unique ID to prevent Unity from playing duplicates
                      }
                    }, '*');
                    console.log('[AI Tutor] ✅ Sent audio to Unity:', {
                      audioId: audioId,
                      audioUrl: finalAudioUrl,
                      phonemesCount: finalPhonemes.length
                    });
                  } else {
                    console.warn('[AI Tutor] ⚠️ No Unity iframe found');
                  }
                };
                
                if (isCompressed) {
                  console.log('[AI Tutor] 🗜️ Compressed audio detected, decompressing...');
                  
                  // Fetch and decompress audio asynchronously
                  fetchAndDecompressAudio(audioUrl, compressionMetadata)
                    .then((decompressedBlob) => {
                      // Create blob URL from decompressed audio
                      const blobUrl = URL.createObjectURL(decompressedBlob);
                      console.log('[AI Tutor] ✅ Audio decompressed and ready:', blobUrl);
                      sendAudioToUnity(blobUrl, unityPhonemes);
                    })
                    .catch((error) => {
                      console.error('[AI Tutor] ❌ Error decompressing audio:', error);
                      // Fallback: try sending original URL
                      sendAudioToUnity(audioUrl, unityPhonemes);
                    });
                } else {
                  // Not compressed, send directly to Unity
                  console.log('[AI Tutor] 🎵 Sending uncompressed audio to Unity');
                  sendAudioToUnity(audioUrl, unityPhonemes);
                }
              } else {
                console.warn('[AI Tutor] ⚠️ Skipping audio - no phonemes or URL');
              }
              break;
            }
              
            case 'audio_generation_start':
              console.log('[AI Tutor] Audio generation started');
              break;
              
            case 'audio_generation_complete':
              console.log('[AI Tutor] Audio generation complete');
              break;
              
            default:
              // Fallback: if it's a string, treat as assistant message
              // ✅ DUPLICATE PREVENTION: Check if message already exists before adding
              if (typeof data === 'string') {
                setMessages((prev) => {
                  const lastMsg = prev[prev.length - 1];
                  // Don't add if last message is the same (prevents duplicate)
                  if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content === data) {
                    console.log('[AI Tutor] ⏭️ Skipping duplicate assistant message (string)');
                    return prev;
                  }
                  return [...prev, { role: 'assistant', content: data }];
                });
              } else if (data?.message && !messageType) {
                // Unknown format but has message field
                const messageText = String(data.message);
                setMessages((prev) => {
                  const lastMsg = prev[prev.length - 1];
                  // Don't add if last message is the same (prevents duplicate)
                  if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content === messageText) {
                    console.log('[AI Tutor] ⏭️ Skipping duplicate assistant message (data.message)');
                    return prev;
                  }
                  return [...prev, { role: 'assistant', content: messageText }];
                });
              }
          }
        } catch (e) {
          console.error('[AI Tutor] Error parsing message:', e);
          // Non-JSON fallbacks
          // ✅ DUPLICATE PREVENTION: Check if message already exists before adding
          if (typeof event.data === 'string') {
            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              // Don't add if last message is the same (prevents duplicate)
              if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content === event.data) {
                console.log('[AI Tutor] ⏭️ Skipping duplicate assistant message (fallback)');
                return prev;
              }
              return [...prev, { role: 'assistant', content: event.data }];
            });
          }
        }
      };

      ws.onerror = () => {
        setConnectionStatus('error');
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
      };
    } catch (e) {
      console.error('[AI Tutor] Connection error:', e);
      setConnectionStatus('error');
      setIsConnected(false);
    }
  }, [convertToUnityFormat]);

  const createNewConversation = useCallback(async (examType: string, subject: string, topic: string) => {
    // Generate tags based on exam, subject, and topic
    const tags: string[] = [];
    if (examType) tags.push(examType);
    if (subject) tags.push(subject);
    if (topic) tags.push(topic);
    
    const res = await aiTutorService.createConversation({ 
      exam_type: examType,
      exam_name: examType,  // Set exam_name same as exam_type
      subject, 
      topic, 
      tags  // Include tags
      // user_id removed - backend gets it from authentication middleware
    });
    if (res?.success && res?.data?.conversation_id) {
      const id = res.data.conversation_id;
      setCurrentConversationId(id);
      // Reset state for fresh session
      setMessages([]);
      setThinkingMessage('');
      setThinkingStatus('');
      disconnect();
      connect(id);
      return id;
    }
    throw new Error('Failed to create conversation');
  }, [connect, disconnect, userId]);

  const endConversation = useCallback(async () => {
    if (!currentConversationId) return;
    await aiTutorService.endConversation(currentConversationId);
    disconnect();
  }, [currentConversationId, disconnect]);

  const sendMessage = useCallback(async (text: string, opts?: SendOptions) => {
    // Prevent duplicate messages - check if last message is the same
    const trimmedText = text.trim();
    const hasFiles = (opts?.images && opts.images.length > 0) || (opts?.pdfs && opts.pdfs.length > 0);
    if (trimmedText === '' && !hasFiles) return;
    
    // Check connection status with better logging
    if (!currentConversationId) {
      console.error('[AI Tutor] Cannot send message - no conversation ID');
      return;
    }
    
    if (!wsRef.current) {
      console.error('[AI Tutor] Cannot send message - WebSocket not initialized');
      return;
    }
    
    if (wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('[AI Tutor] Cannot send message - WebSocket not open. State:', wsRef.current.readyState);
      return;
    }
    
    let imageUrls: string[] = [];
    let pdfUrls: string[] = [];
    
    // Upload images if present
    if (opts?.images && opts.images.length > 0) {
      console.log(`[AI Tutor] 🖼️ Starting image upload: ${opts.images.length} image(s)`);
      try {
        const formData = new FormData();
        opts.images.forEach((img, idx) => {
          console.log(`[AI Tutor] 📎 Adding image ${idx + 1}: ${img.file.name} (${img.file.size} bytes)`);
          formData.append('images', img.file);
        });
        formData.append('conversation_id', currentConversationId);
        
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';
        console.log('[AI Tutor] 📤 Uploading images to:', `${apiBaseUrl}/ai-tutor/upload-images`);
        const response = await fetch(`${apiBaseUrl}/ai-tutor/upload-images`, {
          method: 'POST',
          body: formData,
        });
        
        console.log('[AI Tutor] 📥 Upload response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          imageUrls = data.image_urls || [];
          console.log('[AI Tutor] ✅ Images uploaded successfully!');
          console.log('[AI Tutor] 🖼️ Image URLs:', imageUrls);
        } else {
          const errorText = await response.text();
          console.error('[AI Tutor] ❌ Image upload failed:', response.status, errorText);
        }
      } catch (error) {
        console.error('[AI Tutor] 💥 Error uploading images:', error);
      }
    }
    
    // Upload PDFs if present
    if (opts?.pdfs && opts.pdfs.length > 0) {
      console.log(`[AI Tutor] 📄 Starting PDF upload: ${opts.pdfs.length} PDF(s)`);
      try {
        const formData = new FormData();
        opts.pdfs.forEach((pdf, idx) => {
          console.log(`[AI Tutor] 📎 Adding PDF ${idx + 1}: ${pdf.file.name} (${pdf.file.size} bytes)`);
          formData.append('pdfs', pdf.file);
        });
        formData.append('conversation_id', currentConversationId);
        
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';
        console.log('[AI Tutor] 📤 Uploading PDFs to:', `${apiBaseUrl}/ai-tutor/upload-pdfs`);
        const response = await fetch(`${apiBaseUrl}/ai-tutor/upload-pdfs`, {
          method: 'POST',
          body: formData,
        });
        
        console.log('[AI Tutor] 📥 PDF upload response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          pdfUrls = data.pdf_urls || [];
          console.log('[AI Tutor] ✅ PDFs uploaded successfully!');
          console.log('[AI Tutor] 📄 PDF URLs:', pdfUrls);
        } else {
          const errorText = await response.text();
          console.error('[AI Tutor] ❌ PDF upload failed:', response.status, errorText);
        }
      } catch (error) {
        console.error('[AI Tutor] 💥 Error uploading PDFs:', error);
      }
    }
    
    // Set typing indicator immediately when message is sent
    // Don't set thinking message/status until backend sends it
    setIsTyping(true);
    setIsStreaming(false); // Reset streaming state
    setThinkingStatus(''); // Clear thinking status - wait for backend
    setThinkingMessage(''); // Clear thinking message - wait for backend
    
    // Prepare default message based on content
    let defaultMessage = 'Please analyze this content';
    if (imageUrls.length > 0 && pdfUrls.length > 0) {
      defaultMessage = 'Please analyze these images and documents';
    } else if (imageUrls.length > 0) {
      defaultMessage = 'Please analyze these images';
    } else if (pdfUrls.length > 0) {
      defaultMessage = 'Please analyze this document';
    }
    
    // Match nextjscode format - use 'mt' instead of 'type', 'is_audio' instead of 'isAudio'
    const payload = {
      mt: "message_upload",
      message: trimmedText || defaultMessage,
      content: trimmedText || defaultMessage, // Also include content field for compatibility
      timestamp: new Date().toISOString(),
      // userId removed - backend gets it from conversation document (secure)
      timezone: opts?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      languageCode: opts?.languageCode || 'en',
      is_audio: opts?.isAudio ?? false, // Use is_audio (backend supports both but prefers is_audio)
      isAudio: opts?.isAudio ?? false, // Also include isAudio for backward compatibility
      token: opts?.token || `msg_${Date.now()}`,
      audio_url: opts?.audioUrl || null, // Support audio_url if provided
      images: imageUrls.length > 0 ? imageUrls : undefined, // Add image URLs
      pdfs: pdfUrls.length > 0 ? pdfUrls : undefined, // Add PDF URLs
    };
    console.log('[AI Tutor] 📨 Sending message to backend:');
    console.log('[AI Tutor] 📝 Message:', payload.message);
    console.log('[AI Tutor] 🖼️ Images:', payload.images);
    console.log('[AI Tutor] 📄 PDFs:', payload.pdfs);
    console.log('[AI Tutor] 📦 Full payload:', payload);
    wsRef.current.send(JSON.stringify(payload));
    
    // Add message to local state only if not duplicate
    const displayContent = (imageUrls.length > 0 || pdfUrls.length > 0)
      ? `${trimmedText || defaultMessage}`
      : trimmedText;
    
    console.log('[AI Tutor] 💬 Adding message to chat:');
    console.log('[AI Tutor] 📝 Content:', displayContent);
    console.log('[AI Tutor] 📁 File previews from opts:', opts?.filePreviews);
    console.log('[AI Tutor] 📦 Files to add:', opts?.filePreviews?.length || 0);
    
    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage && lastMessage.role === 'user' && lastMessage.content === displayContent) {
        console.log('[AI Tutor] Duplicate message prevented:', trimmedText);
        return prev; // Don't add duplicate
      }
      
      const newMessage = { 
        role: 'user' as const, 
        content: displayContent,
        files: opts?.filePreviews  // Add file previews to message
      };
      
      console.log('[AI Tutor] ✅ New message object:', newMessage);
      console.log('[AI Tutor] 🖼️ Files in message:', newMessage.files);
      
      return [...prev, newMessage];
    });
    
    // Don't clear typing indicator here - let backend control it via stream_end or stop_typing_indicator
    // Typing indicator should stay ON until backend explicitly stops it
  }, [currentConversationId, userId]);

  // Cleanup on unmount
  useEffect(() => () => disconnect(), [disconnect]);

  return {
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
    connect,
    disconnect,
    createNewConversation,
    endConversation,
    sendMessage,
  };
}



