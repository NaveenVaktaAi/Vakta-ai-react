export interface DocumentStatus {
  _id: string;
  user_id: string;
  name: string;
  url: string;
  status: 'processing' | 'completed' | 'failed';
  document_format: string;
  type?: string;
  created_ts: string;
  updated_ts: string;
  summary?: string;
}

export interface PreSignedUrlRequest {
  fileFormat: string;
}

export interface PreSignedUrlResponse {
  uploadUrl: string;
  fileUrl: string;
  data?: string; // Backend returns URL directly in data field
}

export interface UploadDocumentRequest {
  FileData?: {
    signedUrl: string;
    fileNameTime: string;
  };
  WebsiteUrl?: string;
  YoutubeUrl?: string;
  Url?: string;  // ✅ Single URL field - backend will auto-detect type
  documentFormat?: string;
}

export interface FileData {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
}

