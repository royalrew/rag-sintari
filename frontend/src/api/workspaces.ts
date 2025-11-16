/**
 * Workspaces API
 * Handles workspace management operations
 */

import { apiGet, apiPost, apiPut, apiDelete } from './client';
import { apiRoutes } from '@/config/apiRoutes';
import { mockWorkspaces, Workspace } from '@/lib/mockData';

/**
 * List all workspaces
 * GET /api/workspaces
 * Returns: Array of workspace objects
 */
export const listWorkspaces = async (): Promise<Workspace[]> => {
  // TODO: Replace with actual API call when backend is ready
  // return apiGet<Workspace[]>(apiRoutes.workspaces.list);
  
  // Mock implementation
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockWorkspaces), 100);
  });
};

/**
 * Get workspace by ID
 * GET /api/workspaces/:id
 * Returns: Workspace object
 */
export const getWorkspace = async (id: string): Promise<Workspace | null> => {
  // TODO: Replace with actual API call when backend is ready
  // return apiGet<Workspace>(apiRoutes.workspaces.detail(id));
  
  // Mock implementation
  return new Promise((resolve) => {
    setTimeout(() => {
      const workspace = mockWorkspaces.find((w) => w.id === id);
      resolve(workspace || null);
    }, 100);
  });
};

/**
 * Create new workspace
 * POST /api/workspaces
 * Body: { name, description?, icon? }
 * Returns: Created workspace object
 */
export const createWorkspace = async (
  data: Omit<Workspace, 'id'>
): Promise<Workspace> => {
  // TODO: Replace with actual API call when backend is ready
  // return apiPost<Workspace>(apiRoutes.workspaces.create, data);
  
  // Mock implementation
  return new Promise((resolve) => {
    setTimeout(() => {
      const newWorkspace: Workspace = {
        id: Date.now().toString(),
        ...data,
      };
      resolve(newWorkspace);
    }, 100);
  });
};

/**
 * Update workspace
 * PUT /api/workspaces/:id
 * Body: { name?, description?, icon? }
 * Returns: Updated workspace object
 */
export const updateWorkspace = async (
  id: string,
  data: Partial<Workspace>
): Promise<Workspace> => {
  // TODO: Replace with actual API call when backend is ready
  // return apiPut<Workspace>(apiRoutes.workspaces.update(id), data);
  
  // Mock implementation
  return new Promise((resolve) => {
    setTimeout(() => {
      const workspace = mockWorkspaces.find((w) => w.id === id);
      if (workspace) {
        resolve({ ...workspace, ...data });
      } else {
        throw new Error('Workspace not found');
      }
    }, 100);
  });
};

/**
 * Delete workspace
 * DELETE /api/workspaces/:id
 * Returns: Success message
 */
export const deleteWorkspace = async (id: string): Promise<{ success: boolean }> => {
  // TODO: Replace with actual API call when backend is ready
  // return apiDelete<{ success: boolean }>(apiRoutes.workspaces.delete(id));
  
  // Mock implementation
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true });
    }, 100);
  });
};
