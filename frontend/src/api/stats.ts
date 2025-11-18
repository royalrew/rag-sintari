/**
 * Stats API
 * Handles statistics and overview data
 */

import { apiGet } from './client';

export interface Stats {
  total_documents: number;
  total_workspaces: number;
  total_queries: number;
  accuracy: number;
}

export interface RecentQuery {
  id: string;
  query: string;
  timestamp: string;
  workspace?: string;
  mode?: string;
  success: boolean;
}

export interface WorkspaceActivity {
  workspace_id: string;
  last_active?: string;
  query_count: number;
}

/**
 * Get statistics
 * GET /stats?workspace=...
 */
export const getStats = async (workspace?: string): Promise<Stats> => {
  const query = workspace ? `?workspace=${encodeURIComponent(workspace)}` : '';
  return apiGet<Stats>(`/stats${query}`);
};

/**
 * Get recent queries
 * GET /recent-queries?limit=10&workspace=...
 */
export const getRecentQueries = async (
  limit: number = 10,
  workspace?: string
): Promise<RecentQuery[]> => {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  if (workspace) {
    params.append('workspace', workspace);
  }
  const response = await apiGet<{ queries: RecentQuery[] }>(`/recent-queries?${params.toString()}`);
  return response.queries;
};

/**
 * Get workspace activity (last active time per workspace)
 * GET /workspace-activity
 */
export const getWorkspaceActivity = async (): Promise<Record<string, WorkspaceActivity>> => {
  return apiGet<Record<string, WorkspaceActivity>>('/workspace-activity');
};

