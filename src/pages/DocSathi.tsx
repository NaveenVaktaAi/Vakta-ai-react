import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Link as LinkIcon, Youtube, Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { docSathiService } from '../services/docsathiService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import type { DocumentStatus } from '../types/docsathi';
import helperInstance from '../helpers/helper';

const DocSathi = () => {
  const navigate = useNavigate();
  const [uploadType, setUploadType] = useState<'document' | 'website' | 'youtube'>('document');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [documentFormat, setDocumentFormat] = useState('pdf');
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<DocumentStatus[]>([]);
  const [pollingDocuments, setPollingDocuments] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    // Using hardcoded user_id = 1 for now since backend expects integer
    const userId = '1'; // TODO: Get actual user_id from JWT or user object
    
    try {
      console.log('Loading documents for user:', userId);
      const response = await docSathiService.getUploadedDocuments(userId);
      console.log('Documents loaded:', response);
      
      if (response.success && response.data) {
        setDocuments(response.data);
        // Start polling for any processing documents
        response.data.forEach(doc => {
          if (doc.status === 'processing') {
            startPolling(doc._id);
          }
        });
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    }
  };

  const startPolling = (documentId: string) => {
    if (pollingDocuments.has(documentId)) return;
    
    setPollingDocuments(prev => new Set(prev).add(documentId));
    
    docSathiService.pollDocumentStatus(
      documentId,
      (status) => {
        // Update the document in the list
        setDocuments(prevDocs =>
          prevDocs.map(doc => doc._id === documentId ? status : doc)
        );
      }
    ).then((finalStatus) => {
      setPollingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
      
      setDocuments(prevDocs =>
        prevDocs.map(doc => doc._id === documentId ? finalStatus : doc)
      );
      
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
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Determine format from file extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') {
        setDocumentFormat('pdf');
      } else if (['doc', 'docx'].includes(ext || '')) {
        setDocumentFormat('word');
      }
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    try {
      // 1. Upload file to S3 using helper
      const uploadResults = await helperInstance.uploadFileOnS3(selectedFile);
      
      if (!uploadResults || uploadResults.length === 0) {
        throw new Error('Failed to upload file to S3');
      }

      const uploadedFile = uploadResults[0];

      // 2. Send document metadata to backend
      const documentResponse = await docSathiService.uploadDocument({
        FileData: {
          signedUrl: uploadedFile.signedUrl,
          fileNameTime: selectedFile.name
        },
        documentFormat: documentFormat
      });

      if (documentResponse.success && documentResponse.data) {
        // Backend returns { success, results, message }
        const results = documentResponse.data?.results || documentResponse.data;
        
        if (Array.isArray(results) && results.length > 0) {
          const newDoc = results[0];
          const documentId = newDoc.documentId || newDoc._id;
          
          // Create document object with processing status
          const document: DocumentStatus = {
            _id: documentId,
            name: selectedFile.name,
            url: uploadedFile.signedUrl,
            status: 'processing',
            document_format: documentFormat,
            created_ts: new Date().toISOString(),
            updated_ts: new Date().toISOString(),
            summary: "Document is being processed..."
          };
          
          // Add to documents list immediately
          setDocuments(prev => [document, ...prev]);
          
          toast.success('Document uploaded successfully! Training in progress...');
          
          // Start polling
          startPolling(documentId);
        }
        
        // Reset form
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

  const uploadWebsite = async () => {
    if (!websiteUrl.trim()) {
      toast.error('Please enter a website URL');
      return;
    }

    setUploading(true);
    try {
      const response = await docSathiService.uploadDocument({
        WebsiteUrl: websiteUrl
      });

      if (response.success && response.data) {
        const results = response.data?.results || response.data;
        
        if (Array.isArray(results) && results.length > 0) {
          const newDoc = results[0];
          const documentId = newDoc.documentId || newDoc._id;
          
          const document: DocumentStatus = {
            _id: documentId,
            name: websiteUrl,
            url: websiteUrl,
            status: 'processing',
            document_format: 'website',
            created_ts: new Date().toISOString(),
            updated_ts: new Date().toISOString(),
            summary: "Website is being processed..."
          };
          
          setDocuments(prev => [document, ...prev]);
          toast.success('Website URL added successfully! Processing in progress...');
          setWebsiteUrl('');
          
          // Start polling
          startPolling(documentId);
        }
      } else {
        throw new Error(response.message || 'Failed to add website URL');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add website URL');
    } finally {
      setUploading(false);
    }
  };

  const uploadYoutube = async () => {
    if (!youtubeUrl.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    setUploading(true);
    try {
      const response = await docSathiService.uploadDocument({
        YoutubeUrl: youtubeUrl
      });

      if (response.success && response.data) {
        const results = response.data?.results || response.data;
        
        if (Array.isArray(results) && results.length > 0) {
          const newDoc = results[0];
          const documentId = newDoc.documentId || newDoc._id;
          
          const document: DocumentStatus = {
            _id: documentId,
            name: youtubeUrl,
            url: youtubeUrl,
            status: 'processing',
            document_format: 'youtube',
            created_ts: new Date().toISOString(),
            updated_ts: new Date().toISOString(),
            summary: "YouTube video is being processed..."
          };
          
          setDocuments(prev => [document, ...prev]);
          toast.success('YouTube URL added successfully! Processing in progress...');
          setYoutubeUrl('');
          
          // Start polling
          startPolling(documentId);
        }
      } else {
        throw new Error(response.message || 'Failed to add YouTube URL');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add YouTube URL');
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = () => {
    if (uploadType === 'document') {
      uploadFile();
    } else if (uploadType === 'website') {
      uploadWebsite();
    } else if (uploadType === 'youtube') {
      uploadYoutube();
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
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-6 sm:mb-8">Your Documents</h1>

        {/* Upload Section */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8 border-2 border-dashed border-blue-300">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Youtube className="w-5 h-5 text-blue-600" />
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <LinkIcon className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-gray-600 text-center">Drag & Drop files or click to browse</p>
          </div>

          {/* Upload Type Selection */}
          <div className="flex gap-2 sm:gap-4 mb-4">
            <button
              onClick={() => setUploadType('document')}
              className={`flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all text-sm sm:text-base ${
                uploadType === 'document'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📄 Browse Files
            </button>
            <button
              onClick={() => setUploadType('website')}
              className={`flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all text-sm sm:text-base ${
                uploadType === 'website'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🔗 Add URL
            </button>
          </div>

          {/* Document Upload */}
          {uploadType === 'document' && (
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx"
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="block w-full p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 cursor-pointer transition-colors"
              >
                <div className="text-center">
                  <Upload className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX (Max 15MB)</p>
                </div>
              </label>
            </div>
          )}

          {/* Website URL Upload */}
          {uploadType === 'website' && (
            <div className="space-y-4">
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleUpload}
            disabled={uploading || 
              (uploadType === 'document' && !selectedFile) ||
              (uploadType === 'website' && !websiteUrl.trim())
            }
            className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {uploadType === 'document' ? 'Uploading...' : 'Processing...'}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />
                {uploadType === 'document' ? 'Upload Document' : 'Add URL'}
              </span>
            )}
          </button>
        </div>

        {/* Documents List */}
        <div className="space-y-4">
          {documents.map((doc) => (
            <div
              key={doc._id}
              className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-200 hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(doc.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{doc.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(doc.status)}`}>
                        {doc.status === 'processing' && pollingDocuments.has(doc._id) ? 'Processing' : 
                         doc.status === 'completed' ? 'Completed' : 
                         doc.status === 'failed' ? 'Failed' : doc.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {doc.document_format || doc.type}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Show button for completed or pending, but disable if pending */}
                {(doc.status === 'completed' || doc.status === 'pending') && (
                  <button
                    onClick={() => doc.status === 'completed' && navigate(`/docsathi/chat/${doc._id}`)}
                    disabled={doc.status === 'pending'}
                    className={`w-full sm:w-auto px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base font-semibold transition-all shadow-lg flex-shrink-0 ${
                      doc.status === 'completed'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:shadow-xl cursor-pointer'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {doc.status === 'completed' ? 'Start Chat' : 'Processing...'}
                  </button>
                )}
              </div>
            </div>
          ))}

          {documents.length === 0 && (
            <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 text-lg">No documents uploaded yet</p>
              <p className="text-gray-500 text-sm">Upload your first document to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocSathi;
