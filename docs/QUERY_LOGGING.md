# Query Logging

**Status:** ✅ Implementerad och aktiv

## Översikt

Alla RAG-queries loggas automatiskt till `logs/rag_queries.jsonl` i JSONL-format (en JSON-objekt per rad).

## Loggformat

Varje rad är ett JSON-objekt med följande struktur:

```json
{
  "timestamp": "2025-11-15T19:26:21.571Z",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "query": "Vad stöder RAG-motorn?",
  "mode": "answer",
  "model": "gpt-4o",
  "latency_ms": 1974.93,
  "retrieval_latency_ms": 505.21,
  "llm_latency_ms": 1469.71,
  "success": true,
  "error_type": null,
  "error_message": null,
  "retrieval": {
    "strategy": "hybrid",
    "num_candidates": 3,
    "top_k": 8,
    "sources": [
      {
        "id": "cli-chunk-1",
        "score": 0.65,
        "meta": {
          "document_name": "RAG Demo",
          "page_number": 1
        }
      }
    ]
  },
  "meta": {
    "source_count": 1,
    "workspace_id": "default",
    "document_ids": null
  }
}
```

## Fält

### Grundläggande
- `timestamp` - UTC timestamp (ISO 8601)
- `request_id` - Unik ID för requesten (från API, null i CLI)
- `query` - Användarens fråga
- `mode` - RAG-läge: "answer" | "summary" | "extract"
- `model` - LLM-modell som användes (t.ex. "gpt-4o")

### Latens
- `latency_ms` - Total latens i millisekunder
- `retrieval_latency_ms` - Retrieval-latens (embedding + BM25 + filtering)
- `llm_latency_ms` - LLM-anrop latens

### Resultat
- `success` - true om query lyckades, false vid fel
- `error_type` - Exception-typ (om success=false)
- `error_message` - Felmeddelande (om success=false)

### Retrieval Stats
- `retrieval.strategy` - "hybrid" | "bm25" | "embeddings"
- `retrieval.num_candidates` - Antal chunks som hämtades
- `retrieval.top_k` - Konfigurerad top_k
- `retrieval.sources` - Lista av källor med scores

### Metadata
- `meta.source_count` - Antal unika källor i svaret
- `meta.workspace_id` - Workspace som användes
- `meta.document_ids` - Filtrerade dokument (om några)

## Konfiguration

### Standardloggfil
`logs/rag_queries.jsonl`

### Anpassad loggfil
Sätt miljövariabel:
```powershell
$env:RAG_QUERY_LOG_PATH = "C:\custom\path\queries.jsonl"
```

Eller i `.env`:
```
RAG_QUERY_LOG_PATH=./custom/queries.jsonl
```

## Användning

### Analysera loggar

**PowerShell:**
```powershell
# Läsa alla loggar
Get-Content logs\rag_queries.jsonl | ForEach-Object { $_ | ConvertFrom-Json }

# Filtrera på success
Get-Content logs\rag_queries.jsonl | 
  ForEach-Object { $_ | ConvertFrom-Json } | 
  Where-Object { $_.success -eq $true }

# Beräkna genomsnittlig latens
$logs = Get-Content logs\rag_queries.jsonl | ForEach-Object { $_ | ConvertFrom-Json }
$avg = ($logs | Measure-Object -Property latency_ms -Average).Average
Write-Host "Genomsnittlig latens: $avg ms"
```

**Python:**
```python
import json

with open("logs/rag_queries.jsonl", "r", encoding="utf-8") as f:
    logs = [json.loads(line) for line in f]

# Filtrera på success
successful = [log for log in logs if log["success"]]

# Beräkna genomsnittlig latens
avg_latency = sum(log["latency_ms"] for log in successful) / len(successful)
print(f"Genomsnittlig latens: {avg_latency:.1f} ms")
```

## Trådsäkerhet

Query logger är trådsäker och kan användas från:
- CLI (single-threaded)
- FastAPI (multi-threaded)
- Async contexts

Alla skrivningar är låsta med `threading.Lock()`.

## Felhantering

Om loggning misslyckas:
- Felet loggas till stderr
- RAG-systemet fortsätter fungera normalt
- Ingen exception kastas (loggern får aldrig krascha RAG)

## Exempel på användning

### Analysera långsamma queries
```python
import json

with open("logs/rag_queries.jsonl", "r", encoding="utf-8") as f:
    logs = [json.loads(line) for line in f]

slow = [log for log in logs if log.get("latency_ms", 0) > 2000]
print(f"Antal långsamma queries (>2s): {len(slow)}")
```

### Hitta vanligaste queries
```python
from collections import Counter

queries = [log["query"] for log in logs]
most_common = Counter(queries).most_common(10)
print("Vanligaste queries:")
for query, count in most_common:
    print(f"  {count}x: {query}")
```

### Analysera retrieval performance
```python
retrieval_times = [log["retrieval_latency_ms"] for log in logs if log.get("retrieval_latency_ms")]
llm_times = [log["llm_latency_ms"] for log in logs if log.get("llm_latency_ms")]

print(f"Retrieval avg: {sum(retrieval_times)/len(retrieval_times):.1f} ms")
print(f"LLM avg: {sum(llm_times)/len(llm_times):.1f} ms")
```

## Integration

Query logger är automatiskt integrerad i:
- ✅ `rag/engine.py` - Loggar alla queries
- ✅ `api/main.py` - Genererar request_id för API-queries

Ingen extra konfiguration behövs - det fungerar direkt!

