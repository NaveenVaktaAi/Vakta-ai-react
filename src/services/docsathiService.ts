import api from './api';
import { PreSignedUrlRequest, PreSignedUrlResponse, UploadDocumentRequest, DocumentStatus } from '../types/docsathi';

export const docSathiService = {
  // Get pre-signed URL for uploading documents
  getPreSignedUrl: async (data: PreSignedUrlRequest): Promise<{ success: boolean; data?: PreSignedUrlResponse; message?: string }> => {
    try {
      const response = await api.post('/docSathi/pre-signed-url', data);
      console.log('Pre-signed URL response:', response.data);
      
      // Backend returns URL string directly in data field
      const uploadUrl = response.data.data;
      const fileUrl = uploadUrl; // Same URL for both upload and file reference
      
      return {
        success: response.data.success,
        data: {
          uploadUrl: uploadUrl,
          fileUrl: fileUrl
        },
        message: response.data.message
      };
    } catch (error: any) {
      console.error('Error getting pre-signed URL:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get pre-signed URL'
      };
    }
  },

  // Upload document
  uploadDocument: async (data: UploadDocumentRequest): Promise<{ success: boolean; data?: any; message?: string }> => {
    try {
      const response = await api.post('/docSathi/upload-document', data);
      console.log('Upload document response:', response.data);
      // Backend returns { success, results, message }
      return {
        success: response.data.success,
        data: response.data, // Return full response including results array
        message: response.data.message
      };
    } catch (error: any) {
      console.error('Error uploading document:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to upload document'
      };
    }
  },

  // Get all documents for user
  getUploadedDocuments: async (userId: string): Promise<{ success: boolean; data?: DocumentStatus[]; message?: string }> => {
    try {
      const response = await api.get(`/docSathi/get-all-documents/${userId}`);
      console.log('Get documents response:', response);
      return {
        success: response.data.success,
        data: response.data.data || [],
        message: response.data.message
      };
    } catch (error: any) {
      console.error('Error getting documents:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get documents'
      };
    }
  },

  // Check document status
  checkDocumentStatus: async (documentId: string): Promise<{ success: boolean; data?: DocumentStatus; message?: string }> => {
    try {
      const response = await api.post('/docSathi/check-document-status', { document_id: documentId });
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('Error checking document status:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to check document status'
      };
    }
  },

  // Poll document status
  pollDocumentStatus: async (
    documentId: string,
    onStatusUpdate?: (status: DocumentStatus) => void,
    interval: number = 4000
  ): Promise<DocumentStatus> => {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const response = await docSathiService.checkDocumentStatus(documentId);
          
          if (response.success && response.data) {
            const documentStatus = response.data;
            
            // Call the status update callback if provided
            if (onStatusUpdate) {
              onStatusUpdate(documentStatus);
            }
            
            // If status is not processing, resolve with the final status
            if (documentStatus.status !== 'processing') {
              resolve(documentStatus);
              return;
            }
            
            // If still processing, continue polling
            setTimeout(poll, interval);
          } else {
            reject(new Error(response.message || 'Failed to check document status'));
          }
        } catch (error) {
          reject(error);
        }
      };
      
      // Start polling
      poll();
    });
  }
};

