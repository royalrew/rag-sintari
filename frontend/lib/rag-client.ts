/**
 * RAG API Client
 * 
 * Kopiera denna fil till ditt frontend-projekt.
 * 
 * Användning:
 *   import { ragClient } from './lib/rag-client';
 *   const response = await ragClient.query({ query: "Vad är RAG?" });
 */

import type {
  QueryRequest,
  QueryResponse,
  HealthResponse,
  APIError,
} from '../types/rag-api';

const DEFAULT_API_URL = 'http://localhost:8000';

/**
 * RAG API Client
 */
export class RAGClient {
  private baseUrl: string;

  constructor(baseUrl: string = DEFAULT_API_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Health check - verifiera att API:n är redo
   */
  async health(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseUrl}/health`);
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Ställ en fråga till RAG-motorn
   */
  async query(request: QueryRequest): Promise<QueryResponse> {
    const response = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workspace: 'default',
        mode: 'answer',
        verbose: false,
        ...request,
      }),
    });

    if (!response.ok) {
      let error: APIError;
      try {
        error = await response.json();
      } catch {
        error = { detail: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      throw new Error(error.detail || `Query failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Helper: Ställ en enkel fråga (answer mode)
   */
  async ask(question: string, options?: {
    workspace?: string;
    doc_ids?: string[];
  }): Promise<QueryResponse> {
    return this.query({
      query: question,
      mode: 'answer',
      ...options,
    });
  }

  /**
   * Helper: Sammanfatta kontext
   */
  async summarize(query: string, options?: {
    workspace?: string;
    doc_ids?: string[];
  }): Promise<QueryResponse> {
    return this.query({
      query,
      mode: 'summary',
      ...options,
    });
  }

  /**
   * Helper: Extrahera information
   */
  async extract(query: string, options?: {
    workspace?: string;
    doc_ids?: string[];
  }): Promise<QueryResponse> {
    return this.query({
      query,
      mode: 'extract',
      ...options,
    });
  }
}

/**
 * Default client instance
 */
export const ragClient = new RAGClient(
  typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_RAG_API_URL || 
       process.env.VITE_RAG_API_URL || 
       DEFAULT_API_URL)
    : DEFAULT_API_URL
);

