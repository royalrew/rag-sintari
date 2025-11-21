/**
 * Documents API
 * Handles document management and upload operations
 */

import { apiGet, apiPost, apiDelete } from './client';
import { apiRoutes } from '@/config/apiRoutes';
import { Document } from '@/lib/mockData';

// Backend response types
interface DocumentMetadata {
  id: number;
  filename: string;
  storage_key: string;
  created_at: string;
  content_type?: string | null;
  size_bytes?: number | null;
}

interface DocumentsListResponse {
  documents: DocumentMetadata[];
}

interface DocumentUploadResponse {
  ok: boolean;
  document: DocumentMetadata;
  message: string;
}

/**
 * Get base URL for RAG API
 */
const getBaseUrl = () => {
  const envUrl = (import.meta as any).env?.VITE_RAG_API_URL;
  if (envUrl) return envUrl;
  const isDev = (import.meta as any).env?.DEV || (import.meta as any).env?.MODE === 'development';
  return isDev ? 'http://localhost:8000' : 'https://rag-sintari-production.up.railway.app';
};

/**
 * Convert backend DocumentMetadata to frontend Document format
 */
const mapToFrontendDocument = (meta: DocumentMetadata, workspaceId: string = 'default'): Document => {
  // Determine file type from extension
  const getFileType = (filename: string): Document['type'] => {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.pdf')) return 'PDF';
    if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'Word';
    if (lower.endsWith('.csv')) return 'CSV';
    return 'Text'; // Default for .txt, .md, etc.
  };

  // Format file size
  const formatSize = (bytes?: number | null): string => {
    if (!bytes) return '0 KB';
    const sizeInMB = bytes / 1024 / 1024;
    if (sizeInMB < 1) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${sizeInMB.toFixed(2)} MB`;
  };

  return {
    id: meta.id.toString(),
    name: meta.filename,
    type: getFileType(meta.filename),
    size: formatSize(meta.size_bytes),
    workspace: workspaceId,
    updatedAt: meta.created_at.split('T')[0], // Extract date part
    status: 'indexed', // Assume indexed for now
  };
};

/**
 * List all documents
 * GET /documents
 * Returns: Array of document objects
 */
export const listDocuments = async (workspaceId?: string): Promise<Document[]> => {
  try {
    // Use apiGet from client.ts to ensure authentication headers are included
    const data: DocumentsListResponse = await apiGet<DocumentsListResponse>(apiRoutes.documents.list);
    
    // Map backend documents to frontend format
    // Note: workspaceId filtering is not yet implemented in backend
    // For now, we return all documents and filter in frontend if needed
    const documents = data.documents.map(meta => mapToFrontendDocument(meta, workspaceId || 'default'));
    
    // Filter by workspace if specified
    if (workspaceId) {
      return documents.filter(doc => doc.workspace === workspaceId);
    }
    
    return documents;
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
};

/**
 * Get document by ID
 * GET /documents/:id
 * Returns: Document object
 */
export const getDocument = async (id: string): Promise<Document | null> => {
  // TODO: Implement when backend supports GET /documents/:id
  // For now, fetch all documents and find by ID
  try {
    const documents = await listDocuments();
    return documents.find(doc => doc.id === id) || null;
  } catch (error) {
    console.error('Error fetching document:', error);
    return null;
  }
};

/**
 * Upload document
 * POST /documents/upload
 * Body: FormData with file
 * Returns: Upload response with document info
 */
export const uploadDocument = async (
  file: File,
  workspaceId: string
): Promise<Document> => {
  const BASE_URL = getBaseUrl();
  
  const formData = new FormData();
  formData.append('file', file);
  // Note: workspace is not yet supported in /documents/upload endpoint
  // We'll use it for frontend mapping only
  
  // Get access token for authentication
  const token = localStorage.getItem('accessToken');
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Don't set Content-Type header - browser will set it with boundary for FormData
  
  try {
    const response = await fetch(`${BASE_URL}${apiRoutes.documents.upload}`, {
      method: 'POST',
      headers: headers,
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.detail || `Upload failed: ${response.statusText}`);
    }
    
    const result: DocumentUploadResponse = await response.json();
    
    // Map backend response to frontend Document format
    return mapToFrontendDocument(result.document, workspaceId);
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

/**
 * Download document
 * GET /documents/:id/download
 * Returns: Download URL and filename
 */
export const downloadDocument = async (id: string | number): Promise<{ ok: boolean; url: string; filename: string }> => {
  try {
    // Use apiGet from client.ts to ensure authentication headers are included
    return await apiGet<{ ok: boolean; url: string; filename: string }>(`${apiRoutes.documents.detail(id)}/download`);
  } catch (error) {
    console.error('Error downloading document:', error);
    throw error;
  }
};

/**
 * Delete document
 * DELETE /documents/:id
 * Returns: Success message
 */
export const deleteDocument = async (id: string | number): Promise<{ ok: boolean }> => {
  try {
    // Use apiDelete from client.ts to ensure authentication headers are included
    return await apiDelete<{ ok: boolean }>(apiRoutes.documents.delete(id));
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};
