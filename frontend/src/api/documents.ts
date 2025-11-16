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
 * POST /api/documents/upload
 * Body: FormData with file and metadata
 * Returns: Uploaded document object
 */
export const uploadDocument = async (
  file: File,
  workspaceId: string
): Promise<Document> => {
  // TODO: Replace with actual API call when backend is ready
  // const formData = new FormData();
  // formData.append('file', file);
  // formData.append('workspace', workspaceId);
  // return apiPost<Document>(apiRoutes.documents.upload, formData, {
  //   headers: { 'Content-Type': 'multipart/form-data' }
  // });
  
  // Mock implementation - simulates upload delay
  return new Promise((resolve) => {
    setTimeout(() => {
      // Format file size: show KB for files < 1MB, MB for larger
      const sizeInMB = file.size / 1024 / 1024;
      const sizeStr = sizeInMB < 1 
        ? `${(file.size / 1024).toFixed(2)} KB`
        : `${sizeInMB.toFixed(2)} MB`;
      
      const newDocument: Document = {
        id: Date.now().toString(),
        name: file.name,
        type: file.name.endsWith('.pdf') ? 'PDF' : file.name.endsWith('.md') ? 'Markdown' : 'Text',
        size: sizeStr,
        workspace: workspaceId,
        updatedAt: new Date().toISOString().split('T')[0],
        status: 'ready', // Changed from 'processing' to 'ready'
      };
      resolve(newDocument);
    }, 1500); // Simulate upload time
  });
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
