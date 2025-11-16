# RAG API Reference

**Version:** 1.0.0  
**Base URL:** `http://localhost:8000`  
**Swagger UI:** `http://localhost:8000/docs`

---

## Endpoints

### `GET /`

Root endpoint med länkar till dokumentation.

**Response:**
```json
{
  "message": "RAG-motorn API",
  "docs": "/docs",
  "health": "/health"
}
```

---

### `GET /health`

Health check endpoint. Verifierar att systemet är redo.

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
- Systemet kan returnera `status: "not_ready"` om ingen index finns

---

### `POST /query`

Huvudendpoint för att ställa frågor till RAG-motorn.

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

**Request Fields:**
- `query` (required, string): Frågan att ställa
- `workspace` (optional, string, default: "default"): Workspace-id
- `doc_ids` (optional, string[]): Filtrera på specifika dokument
- `mode` (optional, "answer" | "summary" | "extract", default: "answer"): RAG-läge
- `verbose` (optional, boolean, default: false): Aktivera debug-output

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

**Response Fields:**
- `answer` (string): LLM-svar på frågan
- `sources` (Source[]): Lista av källor (dokument + sidor)
- `mode` (string): Använd RAG-läge
- `latency_ms` (number): Query-latens i millisekunder
- `workspace` (string): Workspace som användes

**Status Codes:**
- `200 OK` - Query lyckades
- `400 Bad Request` - Ogiltig request (validering misslyckades)
- `500 Internal Server Error` - Serverfel
- `503 Service Unavailable` - RAGEngine inte redo (ingen index)

---

## Data Models

### `Source`
```typescript
{
  document_name: string;  // Dokumentnamn
  page_number: number;     // Sidnummer
  snippet: string;         // Text-snippet från dokumentet
}
```

### `QueryRequest`
```typescript
{
  query: string;                              // Required
  workspace?: string;                         // Optional, default: "default"
  doc_ids?: string[];                         // Optional
  mode?: "answer" | "summary" | "extract";    // Optional, default: "answer"
  verbose?: boolean;                          // Optional, default: false
}
```

### `QueryResponse`
```typescript
{
  answer: string;        // LLM-svar
  sources: Source[];     // Källor
  mode: string;          // Använd läge
  latency_ms: number;   // Latens i ms
  workspace: string;     // Workspace
}
```

### `HealthResponse`
```typescript
{
  status: "healthy" | "not_ready";
  workspace: string;
  indexed_chunks: number;
  version: string;
}
```

---

## Modes

### `answer` (default)
Kortfattat svar på frågan (1-2 meningar) med källor.

**Exempel:**
```json
{
  "query": "Vad är syftet med systemet?",
  "mode": "answer"
}
```

### `summary`
Sammanfattning av relevant kontext (2-3 meningar) med källor.

**Exempel:**
```json
{
  "query": "Sammanfatta systemet",
  "mode": "summary"
}
```

### `extract`
Extraktion av nyckelpunkter från kontexten med källor.

**Exempel:**
```json
{
  "query": "Vilka funktioner finns?",
  "mode": "extract"
}
```

---

## Filtering

### Workspace Filtering
Filtrera på specifik workspace:

```json
{
  "query": "Vad är syftet?",
  "workspace": "kund_a"
}
```

### Document ID Filtering
Filtrera på specifika dokument:

```json
{
  "query": "Vad är betalningsvillkoren?",
  "doc_ids": ["policy.pdf", "terms.md"]
}
```

Kombinera båda:

```json
{
  "query": "Vad är betalningsvillkoren?",
  "workspace": "kund_a",
  "doc_ids": ["policy.pdf"]
}
```

---

## Error Handling

### Error Response Format
```json
{
  "detail": "RAGEngine inte redo. Kör indexering först."
}
```

### Common Errors

**503 Service Unavailable:**
```json
{
  "detail": "RAGEngine inte redo. Kör indexering först."
}
```
→ Systemet har ingen indexerad data. Indexera dokument först.

**500 Internal Server Error:**
```json
{
  "detail": "Query failed: <error message>"
}
```
→ Serverfel. Kontrollera logs.

**400 Bad Request:**
→ Request-validering misslyckades. Kontrollera request body.

---

## CORS

**Development:**
- CORS är öppen för alla origins (`*`)

**Production:**
- Uppdatera `api/main.py` för att begränsa till specifika origins

---

## Rate Limiting

För närvarande ingen rate limiting på API-nivå. Backend har intern rate limiting för OpenAI API-anrop.

---

## Latency

**Typisk latens:**
- p50: ~1.4s
- p95: ~2.4s (produktionsläge)
- p95: ~1.9s (bench-mode)

**Faktorer som påverkar latens:**
- LLM-modell (gpt-4o vs gpt-4o-mini)
- Antal chunks i kontext
- Rerank aktiverad/avstängd
- OpenAI API-latens (varierar)

---

## Swagger Documentation

Interaktiv API-dokumentation finns på:
- **Swagger UI:** `http://localhost:8000/docs`
- **OpenAPI Spec:** `http://localhost:8000/openapi.json`

---

## Examples

### cURL
```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Vad stöder RAG-motorn?",
    "workspace": "default",
    "mode": "answer"
  }'
```

### JavaScript/TypeScript
```typescript
const response = await fetch('http://localhost:8000/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'Vad stöder RAG-motorn?',
    workspace: 'default',
    mode: 'answer'
  })
});

const result = await response.json();
console.log(result.answer);
```

### Python
```python
import requests

response = requests.post(
    'http://localhost:8000/query',
    json={
        'query': 'Vad stöder RAG-motorn?',
        'workspace': 'default',
        'mode': 'answer'
    }
)

result = response.json()
print(result['answer'])
```

---

## Versioning

API-versionen finns i:
- Response header: `X-API-Version: 1.0.0`
- Health endpoint: `version` field
- OpenAPI spec: `info.version`

---

## Support

- **Dokumentation:** Se `docs/FRONTEND_INTEGRATION.md` för frontend-integration
- **Backend:** Se `README.md` för backend-dokumentation
- **Issues:** Öppna issue på GitHub

