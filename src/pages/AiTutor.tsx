import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAiTutorWebSocket } from '../hooks/useAiTutorWebSocket';
import { SubjectSelectionDialog } from '../components/SubjectSelectionDialog';
import FormattedMessage from '../components/FormattedMessage';

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
  const [subject, setSubject] = useState<string>('');
  const [topic, setTopic] = useState<string>('');  // ✅ Add topic state
  const [showSubjectDialog, setShowSubjectDialog] = useState(true);
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

  const {
    messages,
    isTyping,
    thinkingMessage,
    thinkingStatus,
    isConnected,
    connectionStatus,
    currentConversationId,
    createNewConversation,
    endConversation,
    sendMessage,
  } = useAiTutorWebSocket(userId);

  useEffect(() => {
    if (subject && topic && !currentConversationId) {
      createNewConversation(subject, topic).catch(() => undefined);  // ✅ Pass both subject and topic
    }
  }, [subject, topic, currentConversationId, createNewConversation]);  // ✅ Add all dependencies

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

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

    // Text input = no audio response (isAudio: false)
    await sendMessage(text || defaultMessage, { 
      isAudio: false,
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
    { label: 'Explain Concept', prompt: `Explain ${subject || 'this concept'} in simple terms with examples` },
    { label: 'Practice Problem', prompt: `Give me a practice problem on ${subject || 'this topic'}` },
    { label: 'Study Guide', prompt: `Create a study guide for ${subject || 'this topic'}` },
    { label: 'Key Points', prompt: `What are the key points I should remember about ${subject || 'this topic'}?` },
  ];

  const handleQuickAction = (prompt: string) => {
    if (isConnected && currentConversationId) {
      // Quick actions = text only response (isAudio: false)
      sendMessage(prompt, { isAudio: false });
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
              if (!currentConversationId && subject && topic) {
                console.log('[Audio] Creating conversation before sending...');
                try {
                  await createNewConversation(subject, topic);  // ✅ Pass both subject and topic
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
  }, [isRecording, currentConversationId, subject, topic, createNewConversation, isConnected, sendMessage]);  // ✅ Remove stopRecording (causes hoisting error)

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
      if (!currentConversationId && subject && topic) {
        console.log('[Audio] Creating conversation before sending (manual stop)...');
        try {
          await createNewConversation(subject, topic);  // ✅ Pass both subject and topic
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
      <SubjectSelectionDialog
        isOpen={showSubjectDialog}
        onClose={() => {
          // If user cancels, leave this page (no AI Tutor without a subject)
          navigate('/dashboard');
        }}
        onConfirm={(s, t) => {   // ✅ Receive both subject and topic
          setShowSubjectDialog(false);
          setSubject(s);
          setTopic(t);
        }}
      />

      {(subject || currentConversationId) && (
      <div className="bg-white shadow-sm border-b border-gray-200 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-3">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-800 truncate">AI Tutor</h1>
            <p className="text-xs sm:text-sm text-gray-600 truncate">Subject: {subject || '...'}</p>
            {!subject && (
              <button
                className="px-2 py-1 rounded-md bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs"
                onClick={() => setShowSubjectDialog(true)}
              >Choose Subject</button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs sm:text-sm text-gray-600">{connectionStatus}</span>
            {currentConversationId && (
              <span className="hidden sm:inline text-xs text-gray-400">{currentConversationId.slice(0, 8)}...</span>
            )}
          </div>
        </div>
      </div>
      )}

      {avatarExpanded && (
        <div className="fixed inset-0 z-50 bg-white">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">AI Tutor</h3>
            <button className="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800" onClick={handleCloseAvatar}>Close</button>
          </div>

          {/* Two-column expanded view: Left avatar (50%), Right chat (50%) */}
          <div className="flex h-[calc(100vh-44px)]">
            <div className="w-[50%] border-r border-gray-200 flex items-center justify-center bg-black/5 relative">
              {/* Mic Icon - Floating on Avatar Top Right */}
              <div className="absolute top-8 right-8 z-20">
                <button
                  onClick={toggleRecording}
                  disabled={!currentConversationId || !isConnected}
                  className={`group relative p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 ${
                    isRecording
                      ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white ring-4 ring-red-300 ring-opacity-60 animate-pulse'
                      : 'bg-gradient-to-br from-purple-500 via-blue-500 to-purple-600 hover:from-purple-600 hover:via-blue-600 hover:to-purple-700 text-white shadow-purple-500/50 hover:shadow-purple-500/70'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isRecording ? 'Stop recording (Click to stop)' : 'Start audio recording (Click to record)'}
                >
                  {/* Mic Icon */}
                  <svg className={`w-7 h-7 transition-all ${isRecording ? 'animate-pulse' : 'group-hover:scale-110'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gray-50">
                {messages.map((m, idx) => (
                  <div key={idx} className={`mb-2 sm:mb-3 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
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
                        <div className="text-gray-800 [&_*]:!text-gray-800 [&_*]:text-gray-800 [&_p]:!text-gray-800 [&_p]:text-gray-800 [&_strong]:!text-gray-900 [&_strong]:text-gray-900 [&_strong]:font-semibold [&_code]:!text-indigo-700 [&_code]:text-indigo-700 [&_div]:!text-gray-800 [&_div]:text-gray-800 [&_h1]:text-blue-700 [&_h1]:font-bold [&_h2]:text-blue-600 [&_h2]:font-bold [&_h3]:text-blue-600 [&_h3]:font-bold [&_h4]:text-blue-600 [&_h4]:font-bold [&_ul]:my-4 [&_ol]:my-4 [&_li]:text-gray-800 [&_li]:leading-relaxed" style={{ color: '#1f2937 !important' }}>
                          <FormattedMessage content={m.content} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
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
              <div className="border-t border-gray-200 p-2 sm:p-3">
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
                <div className="flex items-center gap-2">
                  {/* File upload button (Images + PDFs) */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadedFiles.length >= 3 || !currentConversationId || !isConnected}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    title={uploadedFiles.length >= 3 ? 'Maximum 3 files allowed' : 'Upload images or PDFs'}
                  >
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  
                  {/* Mic Button */}
                  <button
                    onClick={toggleRecording}
                    disabled={!currentConversationId || !isConnected}
                    className={`p-2 rounded-lg font-semibold transition-all ${
                      isRecording
                        ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    } disabled:opacity-50`}
                    title={isRecording ? 'Stop recording' : 'Start audio recording'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                  
                <input
                    value={isRecording ? transcript : inputValue}
                    onChange={(e) => !isRecording && setInputValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !isRecording) handleSend(); }}
                    placeholder={uploadedFiles.length > 0 ? (isRecording ? "Listening..." : "Add message (optional)...") : (isRecording ? "Listening..." : "Type your question…")}
                    readOnly={isRecording}
                    className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base text-gray-900 placeholder-gray-400 bg-white"
                    style={{ color: '#111827' }}
                />
                <button
                  onClick={handleSend}
                    disabled={(!inputValue.trim() && uploadedFiles.length === 0) || !currentConversationId || !isConnected || isRecording}
                    className="px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold disabled:opacity-50 hover:shadow-lg transition-all"
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
      <div className="flex-1 flex flex-col lg:flex-row gap-3 sm:gap-4 p-3 sm:p-4 overflow-hidden relative">
        {/* Chat Area - Reduced width to make room for quick actions */}
        <div className="flex-1 lg:flex-[0_0_calc(100%-280px)] bg-white border border-gray-200 rounded-xl flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 bg-gray-50">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {/* Bot Avatar Icon - Only for assistant messages */}
                {m.role === 'assistant' && (
                  <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full self-start flex-shrink-0 shadow-sm">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                )}

                <div className="max-w-[80%] space-y-3">
                  <div className={`p-4 rounded-2xl shadow-md relative ${
                    m.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                      : 'bg-white text-gray-900'
                  }`}>
                    {m.role === 'user' ? (
                      <div className="text-white">
                        {/* File previews for user messages (images + PDFs) */}
                        {m.files && m.files.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
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
                        <div className="text-base leading-7 whitespace-pre-wrap break-words">{m.content}</div>
                      </div>
                    ) : (
                      <div className="text-base leading-7 text-gray-900 [&_*]:text-gray-900 [&_*]:!text-gray-900 [&_p]:text-gray-900 [&_p]:!text-gray-900 [&_strong]:text-gray-900 [&_strong]:!text-gray-900 [&_strong]:font-semibold [&_code]:text-indigo-700 [&_h1]:text-blue-700 [&_h2]:text-blue-600 [&_h3]:text-blue-600 [&_h4]:text-blue-600 [&_ul]:my-4 [&_ol]:my-4 [&_li]:text-gray-900 [&_li]:leading-relaxed" style={{ color: '#1f2937' }}>
                        <FormattedMessage content={m.content} />
                      </div>
                    )}
                  </div>
                </div>

                {/* User Avatar Icon - Only for user messages */}
                {m.role === 'user' && (
                  <div className="p-2.5 bg-gray-200 rounded-full self-start flex-shrink-0 shadow-sm">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
            {(thinkingMessage || thinkingStatus) ? (
              <div className="flex gap-4 justify-start">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full self-start flex-shrink-0 shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm">
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
              </div>
            ) : isTyping ? (
              <div className="flex gap-4 justify-start">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full self-start flex-shrink-0 shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-200 p-2 sm:p-3">
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
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title={uploadedFiles.length >= 3 ? 'Maximum 3 files allowed' : 'Upload images or PDFs'}
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              
              {/* Text input */}
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={uploadedFiles.length > 0 ? "Add a message (optional)..." : "Type your question…"}
                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base text-gray-900 placeholder-gray-400 bg-white"
                style={{ color: '#111827' }}
              />
              
              {/* Send button */}
            <button
              onClick={handleSend}
                disabled={(!inputValue.trim() && uploadedFiles.length === 0) || !currentConversationId || !isConnected}
                className="px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold disabled:opacity-50 hover:shadow-lg transition-all"
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

        {/* Quick Actions Buttons - Directly Visible on Right Side */}
        <div className="lg:w-64 flex flex-col gap-2">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Quick Actions</h3>
            <div className="space-y-2">
              {quickActions.map((action, idx) => (
            <button
                  key={idx}
                  onClick={() => handleQuickAction(action.prompt)}
                  disabled={!isConnected || isTyping}
                  className="w-full flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 text-gray-700 border border-gray-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left text-sm"
                >
                  <svg className="w-4 h-4 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="font-medium">{action.label}</span>
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
            className="fixed bottom-6 right-6 z-40 cursor-pointer group"
            onClick={handleExpandAvatar}
            title="Click to expand avatar"
          >
            {/* Circular Avatar Container */}
            <div className="relative">
              {/* Avatar Circle */}
              <div className="w-32 h-32 rounded-full shadow-2xl hover:shadow-[0_0_40px_rgba(147,51,234,0.8)] transition-all duration-300 hover:scale-110 overflow-hidden ring-4 ring-purple-400 ring-opacity-50 hover:ring-opacity-100 hover:ring-purple-500">
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
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl ring-2 ring-white">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </div>
              
              {/* Pulse animation ring */}
              <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping opacity-75"></div>
              
              {/* Status indicator */}
              <div className="absolute top-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg"></div>
        </div>
      </div>
      )}
    </div>
  );
}

 