/**
 * RAG API TypeScript Types
 * 
 * Kopiera denna fil till ditt frontend-projekt.
 * 
 * API Base URL: http://localhost:8000 (development)
 * Swagger Docs: http://localhost:8000/docs
 */

// ============================================================================
// Request Types
// ============================================================================

export interface QueryRequest {
  /** Frågan att ställa till RAG-motorn */
  query: string;
  
  /** Workspace-id (default: "default") */
  workspace?: string;
  
  /** Filtrera på specifika dokument (optional) */
  doc_ids?: string[];
  
  /** RAG-läge: answer | summary | extract (default: "answer") */
  mode?: "answer" | "summary" | "extract";
  
  /** Aktivera debug-output (default: false) */
  verbose?: boolean;
}

// ============================================================================
// Response Types
// ============================================================================

export interface Source {
  /** Dokumentnamn */
  document_name: string;
  
  /** Sidnummer */
  page_number: number;
  
  /** Text-snippet från dokumentet */
  snippet: string;
}

export interface QueryResponse {
  /** LLM-svar på frågan */
  answer: string;
  
  /** Lista av källor (dokument + sidor) */
  sources: Source[];
  
  /** Använd RAG-läge */
  mode: string;
  
  /** Query-latens i millisekunder */
  latency_ms: number;
  
  /** Workspace som användes */
  workspace: string;
}

export interface HealthResponse {
  /** Systemstatus: "healthy" | "not_ready" */
  status: "healthy" | "not_ready";
  
  /** Aktuell workspace */
  workspace: string;
  
  /** Antal indexerade chunks */
  indexed_chunks: number;
  
  /** API-version */
  version: string;
}

// ============================================================================
// Error Types
// ============================================================================

export interface APIError {
  /** Felmeddelande */
  detail: string;
}

// ============================================================================
// Helper Types
// ============================================================================

export type RAGMode = "answer" | "summary" | "extract";

export interface QueryOptions {
  workspace?: string;
  doc_ids?: string[];
  mode?: RAGMode;
  verbose?: boolean;
}

