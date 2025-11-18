/**
 * Documents API
 * Handles document management and upload operations
 */

import { apiGet, apiPost, apiDelete } from './client';
import { apiRoutes } from '@/config/apiRoutes';
import { mockDocuments, Document } from '@/lib/mockData';

/**
 * List all documents
 * GET /api/documents
 * Query params: workspace? (filter by workspace)
 * Returns: Array of document objects
 */
export const listDocuments = async (workspaceId?: string): Promise<Document[]> => {
  // TODO: Replace with actual API call when backend is ready
  // const query = workspaceId ? `?workspace=${workspaceId}` : '';
  // return apiGet<Document[]>(`${apiRoutes.documents.list}${query}`);
  
  // Mock implementation
  return new Promise((resolve) => {
    setTimeout(() => {
      if (workspaceId) {
        const filtered = mockDocuments.filter((doc) => doc.workspace === workspaceId);
        resolve(filtered);
      } else {
        resolve(mockDocuments);
      }
    }, 100);
  });
};

/**
 * Get document by ID
 * GET /api/documents/:id
 * Returns: Document object
 */
export const getDocument = async (id: string): Promise<Document | null> => {
  // TODO: Replace with actual API call when backend is ready
  // return apiGet<Document>(apiRoutes.documents.detail(id));
  
  // Mock implementation
  return new Promise((resolve) => {
    setTimeout(() => {
      const document = mockDocuments.find((d) => d.id === id);
      resolve(document || null);
    }, 100);
  });
};

/**
 * Upload document
 * POST /upload
 * Body: FormData with file and workspace
 * Returns: Upload response with document info
 */
export const uploadDocument = async (
  file: File,
  workspaceId: string
): Promise<Document> => {
  // Use same logic as main API client
  const getBaseUrl = () => {
    const envUrl = (import.meta as any).env?.VITE_RAG_API_URL;
    if (envUrl) return envUrl;
    const isDev = (import.meta as any).env?.DEV || (import.meta as any).env?.MODE === 'development';
    return isDev ? 'http://localhost:8000' : 'https://rag-sintari-production.up.railway.app';
  };
  const BASE_URL = getBaseUrl();
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('workspace', workspaceId || 'default');
  
  try {
    const response = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.detail || `Upload failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Format file size: show KB for files < 1MB, MB for larger
    const sizeInMB = file.size / 1024 / 1024;
    const sizeStr = sizeInMB < 1 
      ? `${(file.size / 1024).toFixed(2)} KB`
      : `${sizeInMB.toFixed(2)} MB`;
    
    // Determine file type from extension
    const getFileType = (filename: string): Document['type'] => {
      const lower = filename.toLowerCase();
      if (lower.endsWith('.pdf')) return 'PDF';
      if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'Word';
      if (lower.endsWith('.csv')) return 'CSV';
      return 'Text'; // Default for .txt, .md, etc.
    };
    
    // Convert backend response to frontend Document format
    const newDocument: Document = {
      id: result.document_id,
      name: result.document_name,
      type: getFileType(file.name),
      size: sizeStr,
      workspace: workspaceId,
      updatedAt: new Date().toISOString().split('T')[0],
      status: 'ready',
    };
    
    return newDocument;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

/**
 * Delete document
 * DELETE /api/documents/:id
 * Returns: Success message
 */
export const deleteDocument = async (id: string): Promise<{ success: boolean }> => {
  // TODO: Replace with actual API call when backend is ready
  // return apiDelete<{ success: boolean }>(apiRoutes.documents.delete(id));
  
  // Mock implementation
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true });
    }, 100);
  });
};
