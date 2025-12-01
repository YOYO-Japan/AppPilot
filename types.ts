export enum ConversionStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface ConvertedFile {
  fileName: string;
  originalName: string;
  content: string; // HTML string content
  blobUrl: string;
}

export interface FileData {
  file: File;
  base64: string;
}