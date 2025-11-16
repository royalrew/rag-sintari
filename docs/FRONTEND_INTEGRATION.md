# Frontend Integration Guide

**API Version:** 1.0.0  
**Base URL:** `http://localhost:8000` (development)  
**Swagger Docs:** `http://localhost:8000/docs`

---

## 🚀 Quick Start

### 1. Health Check

```typescript
const response = await fetch('http://localhost:8000/health');
const health = await response.json();
// { status: "healthy", workspace: "default", indexed_chunks: 1, version: "1.0.0" }
```

### 2. Query Example

```typescript
const response = await fetch('http://localhost:8000/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "Vad stöder RAG-motorn?",
    workspace: "default",
    mode: "answer"
  })
});

const result = await response.json();
// { answer: "...", sources: [...], mode: "answer", latency_ms: 1234.5, workspace: "default" }
```

---

## 📋 TypeScript Types

### Types (`frontend/types/rag-api.ts`)

```typescript
// Request Types
export interface QueryRequest {
  query: string;
  workspace?: string;  // default: "default"
  doc_ids?: string[];  // optional: filter by document IDs
  mode?: "answer" | "summary" | "extract";  // default: "answer"
  verbose?: boolean;  // default: false
}

// Response Types
export interface Source {
  document_name: string;
  page_number: number;
  snippet: string;
}

export interface QueryResponse {
  answer: string;
  sources: Source[];
  mode: string;
  latency_ms: number;
  workspace: string;
}

export interface HealthResponse {
  status: "healthy" | "not_ready";
  workspace: string;
  indexed_chunks: number;
  version: string;
}

// Error Types
export interface APIError {
  detail: string;
}
```

---

## 🔧 API Client (React Example)

### Client (`frontend/lib/rag-client.ts`)

```typescript
import type { QueryRequest, QueryResponse, HealthResponse, APIError } from './types/rag-api';

const API_BASE_URL = process.env.NEXT_PUBLIC_RAG_API_URL || 'http://localhost:8000';

export class RAGClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async health(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }
    return response.json();
  }

  async query(request: QueryRequest): Promise<QueryResponse> {
    const response = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace: 'default',
        mode: 'answer',
        verbose: false,
        ...request,
      }),
    });

    if (!response.ok) {
      const error: APIError = await response.json();
      throw new Error(error.detail || `Query failed: ${response.statusText}`);
    }

    return response.json();
  }
}

export const ragClient = new RAGClient();
```

---

## ⚛️ React Hook Example

### Hook (`frontend/hooks/useRAG.ts`)

```typescript
import { useState, useCallback } from 'react';
import { ragClient } from '../lib/rag-client';
import type { QueryRequest, QueryResponse } from '../types/rag-api';

interface UseRAGReturn {
  query: (request: QueryRequest) => Promise<void>;
  response: QueryResponse | null;
  loading: boolean;
  error: string | null;
}

export function useRAG(): UseRAGReturn {
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useCallback(async (request: QueryRequest) => {
    setLoading(true);
    setError(null);
    try {
      const result = await ragClient.query(request);
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { query, response, loading, error };
}
```

### Component Example (`frontend/components/RAGChat.tsx`)

```typescript
import { useState } from 'react';
import { useRAG } from '../hooks/useRAG';

export function RAGChat() {
  const [input, setInput] = useState('');
  const [workspace, setWorkspace] = useState('default');
  const [mode, setMode] = useState<'answer' | 'summary' | 'extract'>('answer');
  const { query, response, loading, error } = useRAG();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    await query({
      query: input,
      workspace,
      mode,
    });
  };

  return (
    <div className="rag-chat">
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ställ en fråga..."
          disabled={loading}
        />
        <select value={mode} onChange={(e) => setMode(e.target.value as any)}>
          <option value="answer">Svar</option>
          <option value="summary">Sammanfattning</option>
          <option value="extract">Extraktion</option>
        </select>
        <button type="submit" disabled={loading}>
          {loading ? 'Laddar...' : 'Skicka'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {response && (
        <div className="response">
          <div className="answer">{response.answer}</div>
          <div className="sources">
            <h3>Källor:</h3>
            {response.sources.map((source, i) => (
              <div key={i} className="source">
                <strong>{source.document_name}</strong> (s. {source.page_number})
                <p>{source.snippet}</p>
              </div>
            ))}
          </div>
          <div className="meta">
            Latens: {response.latency_ms.toFixed(0)} ms
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 🌐 Vue 3 Example

### Composable (`frontend/composables/useRAG.ts`)

```typescript
import { ref } from 'vue';
import { ragClient } from '../lib/rag-client';
import type { QueryRequest, QueryResponse } from '../types/rag-api';

export function useRAG() {
  const response = ref<QueryResponse | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const query = async (request: QueryRequest) => {
    loading.value = true;
    error.value = null;
    try {
      response.value = await ragClient.query(request);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      response.value = null;
    } finally {
      loading.value = false;
    }
  };

  return { query, response, loading, error };
}
```

---

## 🎨 Svelte Example

### Store (`frontend/stores/rag.ts`)

```typescript
import { writable } from 'svelte/store';
import { ragClient } from '../lib/rag-client';
import type { QueryRequest, QueryResponse } from '../types/rag-api';

export const ragResponse = writable<QueryResponse | null>(null);
export const ragLoading = writable(false);
export const ragError = writable<string | null>(null);

export async function queryRAG(request: QueryRequest) {
  ragLoading.set(true);
  ragError.set(null);
  try {
    const result = await ragClient.query(request);
    ragResponse.set(result);
  } catch (err) {
    ragError.set(err instanceof Error ? err.message : 'Unknown error');
    ragResponse.set(null);
  } finally {
    ragLoading.set(false);
  }
}
```

---

## 🔌 API Endpoints

### `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "workspace": "default",
  "indexed_chunks": 1,
  "version": "1.0.0"
}
```

**Status Codes:**
- `200 OK` - Systemet är redo
- `503 Service Unavailable` - Systemet är inte redo (ingen index)

---

### `POST /query`

**Request Body:**
```json
{
  "query": "Vad stöder RAG-motorn?",
  "workspace": "default",
  "doc_ids": ["intro.txt"],
  "mode": "answer",
  "verbose": false
}
```

**Response:**
```json
{
  "answer": "RAG-motorn stöder Q&A, sammanfattning och extraktion...",
  "sources": [
    {
      "document_name": "intro.txt",
      "page_number": 1,
      "snippet": "RAG-motorn stöder Q&A, sammanfattning, extraktion."
    }
  ],
  "mode": "answer",
  "latency_ms": 1234.5,
  "workspace": "default"
}
```

**Status Codes:**
- `200 OK` - Query lyckades
- `400 Bad Request` - Ogiltig request (validering misslyckades)
- `500 Internal Server Error` - Serverfel
- `503 Service Unavailable` - RAGEngine inte redo

---

## 🎯 Modes

### `answer` (default)
Kortfattat svar på frågan (1-2 meningar) med källor.

### `summary`
Sammanfattning av relevant kontext (2-3 meningar) med källor.

### `extract`
Extraktion av nyckelpunkter från kontexten med källor.

---

## 🔍 Filtering

### Workspace
```typescript
await ragClient.query({
  query: "Vad är syftet?",
  workspace: "kund_a"  // Endast dokument från denna workspace
});
```

### Document IDs
```typescript
await ragClient.query({
  query: "Vad är betalningsvillkoren?",
  doc_ids: ["policy.pdf", "terms.md"]  // Endast dessa dokument
});
```

---

## ⚠️ Error Handling

```typescript
try {
  const response = await ragClient.query({ query: "Test" });
} catch (error) {
  if (error.message.includes('503')) {
    // Systemet är inte redo - visa meddelande till användaren
    console.error('RAG-systemet är inte redo. Indexera dokument först.');
  } else if (error.message.includes('500')) {
    // Serverfel - logga och visa generiskt fel
    console.error('Ett fel uppstod:', error.message);
  } else {
    // Övriga fel
    console.error('Okänt fel:', error);
  }
}
```

---

## 🚦 Loading States

```typescript
const { query, response, loading, error } = useRAG();

// I din komponent:
{loading && <Spinner />}
{error && <ErrorMessage message={error} />}
{response && <AnswerDisplay response={response} />}
```

---

## 📊 Latency Tracking

```typescript
const response = await ragClient.query({ query: "Test" });
console.log(`Query tog ${response.latency_ms}ms`);

// Visa för användaren:
if (response.latency_ms > 2000) {
  console.warn('Långsam query - överväg optimering');
}
```

---

## 🔐 CORS & Security

**Development:**
- CORS är öppen för alla (`allow_origins=["*"]`)

**Production:**
- Uppdatera `api/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Specifik origin
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
```

---

## 🧪 Testing

### Mock Response

```typescript
// frontend/__mocks__/rag-client.ts
export const ragClient = {
  async query() {
    return {
      answer: "Mock svar",
      sources: [{ document_name: "test.txt", page_number: 1, snippet: "..." }],
      mode: "answer",
      latency_ms: 100,
      workspace: "default",
    };
  },
};
```

---

## 📝 Environment Variables

```env
# .env.local (Next.js) eller .env (Vite)
NEXT_PUBLIC_RAG_API_URL=http://localhost:8000
# Production:
# NEXT_PUBLIC_RAG_API_URL=https://api.yourdomain.com
```

---

## 🎨 UI Recommendations

### Source Display
- Visa `document_name` och `page_number` som klickbara länkar
- Visa `snippet` som hover-tooltip eller expanderbar sektion
- Highlight relevanta delar i snippet

### Loading States
- Visa skeleton loader under query
- Disable submit-knapp under loading
- Visa progress-indikator för långa queries (>2s)

### Error States
- Visa tydliga felmeddelanden
- Ge användaren möjlighet att försöka igen
- Logga fel för debugging

---

## 🔗 Ytterligare Resurser

- **Swagger UI:** `http://localhost:8000/docs` (interaktiv API-dokumentation)
- **OpenAPI Spec:** `http://localhost:8000/openapi.json` (automatiskt genererad)
- **Backend README:** Se `README.md` för backend-dokumentation

---

## 💡 Tips

1. **Caching:** Cache responses för identiska queries (t.ex. med React Query)
2. **Debouncing:** Debounce input för att undvika för många requests
3. **Optimistic UI:** Visa loading-state direkt, uppdatera när response kommer
4. **Error Recovery:** Implementera retry-logik för transienta fel
5. **Source Highlighting:** Använd `snippet` för att highlighta relevanta delar

