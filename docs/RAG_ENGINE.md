# RAG Engine - Teknisk Översikt

Senast uppdaterad: 2025-11-15

## Syfte

Detta dokument beskriver RAG-motorns arkitektur, flöden, konfigurationer och driftaspekter (latens, fel, logging). Det fungerar som kontrakt mellan backend och klienter/operatörer.

---

## Arkitektur (hög nivå)

```
Dokument → Text Extraction → Chunking → Embeddings → Index (InMemory + Cache)
                                                         ↓
                                                   Disk Cache (MTIME)
                                                         ↓
Fråga → Retriever (BM25 + Embeddings) → [Reranker (CE, valbar)] → Top-K
                                                         ↓
                                    Engine (Prompt builder + LLM Client)
                                                         ↓
                               Svar + Källor + Latens → API/CLI → Query Logger
```

Komponenter:
- `ingest/text_extractor.py` – TXT/MD/PDF/DOCX
- `ingest/chunker.py` – 600/120 tokens + positionsmetadata
- `rag/embeddings_client.py` – OpenAI `text-embedding-3-large`
- `rag/index.py` – InMemoryIndex (numpy, cosine)
- `rag/index_store.py` – Disk-cache + MTIME-guards
- `rag/retriever.py` – Hybrid retrieval (BM25 + embeddings)
- `rag/reranker.py` – Cross-encoder rerank (LLM-baserad, config-styrd)
- `rag/llm_client.py` – GPT-4o (answer), 4o-mini (summary/extract)
- `rag/engine.py` – Orkestrering, prompt, latensmätning, logging
- `api/main.py` – FastAPI-lager, `/health`, `/query`
- `rag/query_logger.py` – JSONL-logging
- `rag/error_handling.py` – Enhetliga JSON-fel (FastAPI handlers)

---

## Flöde (per query)

1. API tar emot request (`POST /query`) och genererar `request_id`
2. Engine startar latensmätning (total + retrieval + LLM)
3. Retriever:
   - Filtrerar på `workspace` och ev. `doc_ids`
   - Beräknar BM25-score, embeddings-score, normaliserar, väger ihop
4. (Valfritt) Reranker:
   - Top-N kandidater rankas med cross-encoder (LLM siffra 0–1)
   - Mixas med hybrid-score via `mix_weight`
5. Engine:
   - Bygger prompt (bench-mode kort; prod-mode med källor)
   - Kallar LLM (answer/summary/extract)
6. Logging:
   - `rag/query_logger.py` loggar JSONL (latens, retrieval stats, metadata)
7. Error handling:
   - Fel normaliseras via `rag/error_handling.py` till enhetliga JSON-svar

---

## Konfiguration (utdrag)

`config/rag_config.yaml`:

```yaml
models:
  embeddings: text-embedding-3-large
  llm:
    answer: gpt-4o
    answer_premium: gpt-4o
    summary: gpt-4o-mini
    extract: gpt-4o-mini

retrieval:
  mode: hybrid
  top_k: 8
  hybrid:
    alpha: 0.35
    beta: 0.65

rerank:
  enabled: false
  model: gpt-4o-mini
  input_top_k: 8
  output_top_k: 3
  mix_weight: 0.7

chunking:
  target_tokens: 600
  overlap_tokens: 120

storage:
  index_dir: ./index_cache

bench:
  use_bench_prompt: false
```

---

## Logging

- Fil: `logs/rag_queries.jsonl` (styr via `RAG_QUERY_LOG_PATH`)
- Strukturen beskrivs i `docs/QUERY_LOGGING.md`
- Varje post innehåller bl.a. `request_id`, `latency_ms`, `retrieval_latency_ms`, `llm_latency_ms`, `retrieval.strategy`, `sources`, `meta`.

Exempel (kort):
```json
{"timestamp":"...Z","query":"...","mode":"answer","latency_ms":1405.5,"retrieval_latency_ms":505.2,"llm_latency_ms":900.3,"success":true}
```

---

## Error Model

- Beskrivs i `docs/ERRORS.md`
- Alla fel normaliseras till JSON med fälten: `error`, `type`, `code`, `message`, `request_id`, `details`
- Globala handlers registreras i `api/main.py` via `register_exception_handlers(app)`

---

## Latens & Benchmark

- Perf-svit: `evaluation/perf_eval.py`
- Bench-mode (`bench.use_bench_prompt: true`) för kort prompt och stabil mätning
- Baseline (bästa av 3):
  - avg ~1406 ms, p50 ~1371 ms, p95 ~1947 ms
- Produktionsläge (full prompt):
  - avg ~1536 ms, p50 ~1390 ms, p95 ~2371 ms

Tips:
- Stäng av rerank under bench för lägre svans
- Kör 3× och ta bästa p95 för baseline

---

## Kvalitet (Golden Evaluation)

- Kör: `python -m evaluation.golden_eval`
- Tiering:
  - Diamond / Platinum / Gold / Silver / Bronze
- Aktuell baseline:
  - Diamond 1/3, Platinum 1/3, Gold 1/3, 0 Silver/Bronze

---

## Roadmap (nästa steg)

Hög prioritet:
- RAG Docs (detta dokument klart) → Fortsätt expandera med exempel

Medel prioritet:
- Full incremental indexing (utöka `rag/incremental_indexer.py`)
- Multi-scope (fullt stöd) i `rag/retriever_scope.py`
- Rate limiting implementation i `rag/rate_limit.py`

Låg prioritet:
- Dedikerad stress-test suite (500+ frågor)
- Separata scorer-moduler om vi bryter ur logiken från `golden_eval`

---

## Drift & Operativt

- Monitoring: använd `logs/rag_queries.jsonl` + `request_id` för korrelation
- Failover: API returnerar standardiserade fel (se `docs/ERRORS.md`)
- Konfigurationsstyrt: nästan allt justeras i `config/rag_config.yaml`

---

## Appendix

- OpenAPI: `http://localhost:8000/openapi.json`
- Swagger UI: `http://localhost:8000/docs`
- Frontend-integration: `docs/FRONTEND_INTEGRATION.md`

