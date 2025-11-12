import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Link as LinkIcon, Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { docSathiService } from '../services/docsathiService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import type { DocumentStatus } from '../types/docsathi';
import helperInstance from '../helpers/helper';
import SimpleTrainingModal from '../components/SimpleTrainingModal';

const DocSathi = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [uploadType, setUploadType] = useState<'document' | 'url'>('document');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [documentFormat, setDocumentFormat] = useState('pdf');
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<DocumentStatus[]>([]);
  const [pollingDocuments, setPollingDocuments] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [currentTrainingDoc, setCurrentTrainingDoc] = useState<{ id: string; name: string; status: 'processing' | 'completed' | 'failed' } | null>(null);
  const currentTrainingDocRef = useRef<{ id: string; name: string; status: 'processing' | 'completed' | 'failed' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Sync ref with state
  useEffect(() => {
    currentTrainingDocRef.current = currentTrainingDoc;
  }, [currentTrainingDoc]);

  // Load documents on mount and when user is available
  useEffect(() => {
    if (user?._id) {
      console.log('[DocSathi] Loading documents for user:', user._id);
      loadDocuments();
    } else {
      console.log('[DocSathi] User not available yet, waiting...');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  // Watch for status change to 'completed' and close modal
  useEffect(() => {
    if (currentTrainingDoc && currentTrainingDoc.status === 'completed' && showTrainingModal) {
      console.log('[DocSathi] 🎯 Status is COMPLETED - Closing modal in 2 seconds');
      const timer = setTimeout(() => {
        console.log('[DocSathi] 🚪 Closing modal from parent component');
        setShowTrainingModal(false);
        setCurrentTrainingDoc(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentTrainingDoc?.status, showTrainingModal]);

  const loadDocuments = async () => {
    const userId = user?._id || '1';
    console.log('[DocSathi] loadDocuments called with userId:', userId);
    
    try {
      console.log('[DocSathi] Calling getUploadedDocuments API...');
      // Pass any value - backend will use authenticated user's ID from token
      const response = await docSathiService.getUploadedDocuments(userId);
      console.log('[DocSathi] API response:', response);
      
      if (response.success && response.data) {
        console.log('[DocSathi] Documents loaded:', response.data.length);
        setDocuments(response.data);
        response.data.forEach(doc => {
          if (doc.status === 'processing') {
            startPolling(doc._id);
          }
        });
      } else {
        console.log('[DocSathi] API call failed:', response.message);
        toast.error(response.message || 'Failed to load documents');
      }
    } catch (error) {
      console.error('[DocSathi] Error loading documents:', error);
      toast.error('Failed to load documents');
    }
  };

  const startPolling = (documentId: string) => {
    if (pollingDocuments.has(documentId)) return;
    
    setPollingDocuments(prev => new Set(prev).add(documentId));
    
    docSathiService.pollDocumentStatus(
      documentId,
      (status) => {
        console.log('[DocSathi] 📡 Polling update received:', status.status);
        setDocuments(prevDocs =>
          prevDocs.map(doc => doc._id === documentId ? status : doc)
        );
        
        // Update modal status IMMEDIATELY when status changes - THIS IS KEY!
        // Use ref to avoid closure issues
        const currentDoc = currentTrainingDocRef.current;
        if (currentDoc && currentDoc.id === documentId) {
          console.log('[DocSathi] 🔄 Polling callback - API status:', status.status);
          console.log('[DocSathi] 🔄 Current modal status before update:', currentDoc.status);
          
          // CRITICAL: Always update, especially when status becomes 'completed'
          setCurrentTrainingDoc(prev => {
            if (prev && prev.id === documentId) {
              console.log('[DocSathi] ⚡ UPDATING STATUS:', prev.status, '→', status.status);
              const newStatus = {
                id: documentId,
                name: status.name || prev.name,
                status: status.status as 'processing' | 'completed' | 'failed'
              };
              console.log('[DocSathi] ✅ New status object:', newStatus);
              return newStatus;
            }
            console.log('[DocSathi] ⚠️ No prev state found');
            return prev;
          });
          
          // Extra check for completed status
          if (status.status === 'completed') {
            console.log('[DocSathi] 🎉🎉🎉 STATUS IS COMPLETED IN CALLBACK!');
          }
        } else {
          console.log('[DocSathi] ⚠️ No currentTrainingDoc or ID mismatch. CurrentDoc:', currentDoc, 'DocumentId:', documentId);
        }
      }
    ).then((finalStatus) => {
      console.log('[DocSathi] 🎯 Polling completed, final status:', finalStatus.status);
      console.log('[DocSathi] 📋 Final status object:', finalStatus);
      
      setPollingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
      
      setDocuments(prevDocs =>
        prevDocs.map(doc => doc._id === documentId ? finalStatus : doc)
      );
      
      // Final update - ensure modal status is set to completed
      // Use ref to avoid closure issues
      const currentDoc = currentTrainingDocRef.current;
      if (currentDoc && currentDoc.id === documentId) {
        console.log('[DocSathi] ✅✅✅ FINAL UPDATE - Setting modal status to:', finalStatus.status);
        setCurrentTrainingDoc({
          id: documentId,
          name: finalStatus.name || currentDoc.name,
          status: finalStatus.status as 'processing' | 'completed' | 'failed'
        });
        console.log('[DocSathi] ✅ Modal status updated in .then()');
      } else {
        console.log('[DocSathi] ⚠️ No currentTrainingDoc in .then(). CurrentDoc:', currentDoc, 'DocumentId:', documentId);
      }
      
      if (finalStatus.status === 'completed') {
        toast.success(`Document "${finalStatus.name}" is ready!`);
      } else if (finalStatus.status === 'failed') {
        toast.error(`Document "${finalStatus.name}" failed to process.`);
      }
    }).catch((error) => {
      console.error('Error polling document status:', error);
      setPollingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
      
      // Update modal to failed status
      if (currentTrainingDoc && currentTrainingDoc.id === documentId) {
        setCurrentTrainingDoc(prev => prev ? { ...prev, status: 'failed' } : null);
      }
    });
  };

  const handleFileChange = (file: File) => {
    if (file) {
      // Validate file type
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'doc', 'docx'].includes(ext || '')) {
        toast.error('Please upload PDF, DOC, or DOCX files only');
        return;
      }
      
      // Validate file size (15MB)
      if (file.size > 15 * 1024 * 1024) {
        toast.error('File size must be less than 15MB');
        return;
      }
      
      setSelectedFile(file);
      if (ext === 'pdf') {
        setDocumentFormat('pdf');
      } else if (['doc', 'docx'].includes(ext || '')) {
        setDocumentFormat('word');
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadType === 'document') {
      setIsDragging(true);
    }
  }, [uploadType]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (uploadType === 'document') {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFileChange(files[0]);
      }
    }
  }, [uploadType]);

  const uploadFile = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    try {
      const uploadResults = await helperInstance.uploadFileOnS3(selectedFile);
      
      if (!uploadResults || uploadResults.length === 0) {
        throw new Error('Failed to upload file to S3');
      }

      const uploadedFile = uploadResults[0];

      const documentResponse = await docSathiService.uploadDocument({
        FileData: {
          signedUrl: uploadedFile.signedUrl,
          fileNameTime: selectedFile.name
        },
        documentFormat: documentFormat
      });

      if (documentResponse.success && documentResponse.data) {
        const results = documentResponse.data?.results || documentResponse.data;
        
        if (Array.isArray(results) && results.length > 0) {
          const newDoc = results[0];
          const documentId = newDoc.documentId || newDoc._id;
          
          const document: DocumentStatus = {
            _id: documentId,
            name: selectedFile.name,
            url: uploadedFile.signedUrl,
            status: 'processing',
            document_format: documentFormat,
            user_id: user?._id || '1',
            created_ts: new Date().toISOString(),
            updated_ts: new Date().toISOString(),
            summary: "Document is being processed..."
          };
          
          setDocuments(prev => [document, ...prev]);
          toast.success('Document uploaded successfully! Training in progress...');
          
          // Open training modal
          setCurrentTrainingDoc({
            id: documentId,
            name: selectedFile.name,
            status: 'processing'
          });
          setShowTrainingModal(true);
          
          startPolling(documentId);
        }
        
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error(documentResponse.message || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const uploadUrl = async () => {
    if (!url.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(url.trim());
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    setUploading(true);
    try {
      const response = await docSathiService.uploadDocument({
        Url: url.trim()  // ✅ Single URL field - backend will auto-detect YouTube vs Web
      });

      if (response.success && response.data) {
        const results = response.data?.results || response.data;
        
        if (Array.isArray(results) && results.length > 0) {
          const newDoc = results[0];
          const documentId = newDoc.documentId || newDoc._id;
          
          const document: DocumentStatus = {
            _id: documentId,
            name: url.trim(),
            url: url.trim(),
            status: 'processing',
            document_format: url.includes('youtube.com') || url.includes('youtu.be') ? 'youtube' : 'website',
            user_id: user?._id || '1',
            created_ts: new Date().toISOString(),
            updated_ts: new Date().toISOString(),
            summary: "URL is being processed..."
          };
          
          setDocuments(prev => [document, ...prev]);
          toast.success('URL added successfully! Processing in progress...');
          setUrl('');
          
          // Open training modal
          setCurrentTrainingDoc({
            id: documentId,
            name: url.trim(),
            status: 'processing'
          });
          setShowTrainingModal(true);
          
          startPolling(documentId);
        }
      } else {
        throw new Error(response.message || 'Failed to add URL');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add URL');
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = () => {
    if (uploadType === 'document') {
      uploadFile();
    } else if (uploadType === 'url') {
      uploadUrl();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-600 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Your Documents
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Upload documents, websites, or YouTube videos to start chatting with AI
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-8 border border-gray-200">
          {/* Upload Type Tabs */}
          <div className="flex gap-3 mb-6 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => {
                setUploadType('document');
                setSelectedFile(null);
                setUrl('');
              }}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                uploadType === 'document'
                  ? 'bg-white text-blue-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-5 h-5" />
                <span>Upload File</span>
              </div>
            </button>
            <button
              onClick={() => {
                setUploadType('url');
                setSelectedFile(null);
              }}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                uploadType === 'url'
                  ? 'bg-white text-blue-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <LinkIcon className="w-5 h-5" />
                <span>Add URL</span>
              </div>
            </button>
          </div>

          {/* Document Upload with Drag & Drop */}
          {uploadType === 'document' && (
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                accept=".pdf,.doc,.docx"
                className="hidden"
                id="file-upload"
              />
              <div
                ref={dropZoneRef}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative w-full p-12 rounded-xl border-2 border-dashed transition-all cursor-pointer
                  ${isDragging 
                    ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
                    : selectedFile 
                      ? 'border-green-400 bg-green-50' 
                      : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                  }
                `}
              >
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-900">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="mt-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
                      isDragging ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <Upload className={`w-10 h-10 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
                    </div>
                    <div className="text-center">
                      <p className="text-base font-semibold text-gray-900 mb-1">
                        {isDragging ? 'Drop your file here' : 'Drag & drop your file here'}
                      </p>
                      <p className="text-sm text-gray-500">
                        or <span className="text-blue-600 font-medium">click to browse</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        Supports PDF, DOC, DOCX (Max 15MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* URL Input */}
          {uploadType === 'url' && (
            <div className="space-y-4">
              <div className="relative">
                <LinkIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter website URL or YouTube video URL..."
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-base transition-all"
                />
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <div className="w-5 h-5 text-blue-600 mt-0.5">💡</div>
                <div>
                  <p className="font-medium text-gray-900 mb-1">Smart URL Detection</p>
                  <p>We automatically detect if it's a website or YouTube video. Just paste any URL!</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleUpload}
            disabled={uploading || 
              (uploadType === 'document' && !selectedFile) ||
              (uploadType === 'url' && !url.trim())
            }
            className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl text-base flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{uploadType === 'document' ? 'Uploading...' : 'Processing...'}</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span>{uploadType === 'document' ? 'Upload Document' : 'Add URL'}</span>
              </>
            )}
          </button>
        </div>

        {/* Documents List */}
        <div className="space-y-4">
          {documents.length > 0 && (
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Documents</h2>
          )}
          
          {documents.map((doc) => (
            <div
              key={doc._id}
              className="bg-white rounded-xl shadow-md p-5 sm:p-6 border border-gray-200 hover:shadow-lg transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(doc.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate mb-2">{doc.name}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(doc.status)}`}>
                        {doc.status === 'processing' && pollingDocuments.has(doc._id) ? 'Processing' : 
                         doc.status === 'completed' ? 'Completed' : 
                         doc.status === 'failed' ? 'Failed' : doc.status}
                      </span>
                      <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                        {doc.document_format || doc.type}
                      </span>
                    </div>
                  </div>
                </div>
                
                {doc.status === 'completed' && (
                  <button
                    onClick={() => navigate(`/docsathi/chat/${doc._id}`)}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 flex-shrink-0"
                  >
                    Start Chat
                  </button>
                )}
                
                {doc.status === 'processing' && (
                  <div className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-600 rounded-lg font-semibold flex items-center justify-center gap-2 flex-shrink-0">
                    <Clock className="w-4 h-4 animate-pulse" />
                    <span>Processing...</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {documents.length === 0 && (
            <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-300">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-600 text-lg font-medium mb-2">No documents uploaded yet</p>
              <p className="text-gray-500 text-sm">Upload your first document to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Simple Training Modal */}
      {showTrainingModal && currentTrainingDoc && (
        <SimpleTrainingModal
          key={`${currentTrainingDoc.id}-${currentTrainingDoc.status}`} // Force re-render when status changes
          isOpen={showTrainingModal}
          onClose={() => {
            console.log('[DocSathi] 🚪 Closing modal');
            setShowTrainingModal(false);
            setCurrentTrainingDoc(null);
          }}
          documentName={currentTrainingDoc.name}
          status={currentTrainingDoc.status}
        />
      )}
    </div>
  );
};

export default DocSathi;
