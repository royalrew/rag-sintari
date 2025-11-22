/**
 * RAG API Client
 * Dedicated client for Railway RAG backend
 */

import { apiGet, apiPost, ApiError } from './client';
import { ragRoutes } from '@/config/apiRoutes';

export interface RAGQueryRequest {
  query: string;
  workspace?: string;
  doc_ids?: string[];
  mode?: 'answer' | 'summary' | 'extract';
  verbose?: boolean;
}

export interface RAGSource {
  document_name: string;
  page_number: number;
  snippet: string;
}

export interface RAGQueryResponse {
  answer: string;
  sources: RAGSource[];
  mode: string;
  latency_ms: number;
  workspace: string;
  no_answer?: boolean; // True om svaret är "Jag hittar inte svaret i källorna"
}

export interface RAGHealthResponse {
  status: string;
  workspace: string;
  indexed_chunks: number;
  version: string;
}

/**
 * Check RAG backend health
 */
export const checkRAGHealth = async (): Promise<RAGHealthResponse> => {
  try {
    const response = await apiGet<RAGHealthResponse>(ragRoutes.health);
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to check RAG health', 500, error);
  }
};

/**
 * Query RAG backend
 */
export const queryRAG = async (
  request: RAGQueryRequest
): Promise<RAGQueryResponse> => {
  try {
    const body: RAGQueryRequest = {
      query: request.query,
      workspace: request.workspace || 'default',
      doc_ids: request.doc_ids,
      mode: request.mode || 'answer',
      verbose: request.verbose || false,
    };

    const response = await apiPost<RAGQueryResponse>(ragRoutes.query, body);
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to query RAG', 500, error);
  }
};

