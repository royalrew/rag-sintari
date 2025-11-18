/**
 * Workspaces API
 * Handles workspace management operations
 */

import { apiGet, apiPost, apiPut, apiDelete } from './client';
import { apiRoutes } from '@/config/apiRoutes';
import { mockWorkspaces, Workspace } from '@/lib/mockData';

const STORAGE_KEY = 'dokument-ai-workspaces';

function loadFromStorage(): Workspace[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as Workspace[];
    }
  } catch {}
  // Seed with mock once if nothing stored
  saveToStorage(mockWorkspaces);
  return [...mockWorkspaces];
}

function saveToStorage(items: Workspace[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

/**
 * List all workspaces
 * GET /api/workspaces
 * Returns: Array of workspace objects
 */
export const listWorkspaces = async (): Promise<Workspace[]> => {
  // TODO: Replace with actual API call when backend is ready
  // return apiGet<Workspace[]>(apiRoutes.workspaces.list);
  return new Promise((resolve) => {
    setTimeout(() => resolve(loadFromStorage()), 50);
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
  return new Promise((resolve) => {
    setTimeout(() => {
      const list = loadFromStorage();
      const workspace = list.find((w) => w.id === id);
      if (workspace) {
        // Ta bort mock data (accuracy, documentCount) - dessa ska komma från backend stats
        const { accuracy: mockAccuracy, documentCount: mockDocCount, ...workspaceWithoutMock } = workspace;
        resolve({
          ...workspaceWithoutMock,
          documentCount: undefined, // Ska komma från backend stats
          accuracy: undefined, // Ska komma från backend stats
        } as Workspace);
      } else {
        resolve(null);
      }
    }, 50);
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
  return new Promise((resolve) => {
    setTimeout(() => {
      const list = loadFromStorage();
      // Ta bort accuracy och documentCount från data (ska komma från backend)
      const { accuracy, documentCount, ...workspaceData } = data;
      const newWorkspace: Workspace = {
        id: Date.now().toString(),
        ...workspaceData,
        icon: workspaceData.icon || '📁', // Säkerställ att icon alltid finns
        // accuracy och documentCount ska inte sparas i localStorage, de kommer från backend
      };
      const updated = [newWorkspace, ...list];
      saveToStorage(updated);
      resolve(newWorkspace);
    }, 50);
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
  return new Promise((resolve) => {
    setTimeout(() => {
      const list = loadFromStorage();
      const idx = list.findIndex((w) => w.id === id);
      if (idx === -1) throw new Error('Workspace not found');
      // Ta bort accuracy och documentCount från data (ska komma från backend)
      const { accuracy, documentCount, ...workspaceData } = data;
      const existing = list[idx];
      // Ta bort accuracy och documentCount från existing också innan merge
      const { accuracy: existingAccuracy, documentCount: existingDocCount, ...existingWithoutStats } = existing;
      const updated: Workspace = { ...existingWithoutStats, ...workspaceData } as Workspace;
      const next = [...list];
      next[idx] = updated;
      saveToStorage(next);
      resolve(updated);
    }, 50);
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
  return new Promise((resolve) => {
    setTimeout(() => {
      const list = loadFromStorage();
      const next = list.filter((w) => w.id !== id);
      saveToStorage(next);
      resolve({ success: true });
    }, 50);
  });
};
