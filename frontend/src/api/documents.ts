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
  const BASE_URL = getBaseUrl();
  
  try {
    const response = await fetch(`${BASE_URL}${apiRoutes.documents.list}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.detail || `Failed to fetch documents: ${response.statusText}`);
    }

    const data: DocumentsListResponse = await response.json();
    
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
  
  try {
    const response = await fetch(`${BASE_URL}${apiRoutes.documents.upload}`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary
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
 * Delete document
 * DELETE /documents/:id
 * Returns: Success message
 */
export const deleteDocument = async (id: string): Promise<{ success: boolean }> => {
  // TODO: Implement when backend supports DELETE /documents/:id
  // For now, return success (frontend will handle state update)
  console.warn('DELETE /documents/:id not yet implemented in backend');
  return { success: true };
};
