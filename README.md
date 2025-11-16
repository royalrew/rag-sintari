# RAG-motorn 🚀

**Svenskt RAG-system (Retrieval-Augmented Generation) med hybrid retrieval, disk-cache och världsklass kvalitetsmätning.**

## 📋 Översikt

Ett produktionsklart RAG-system byggt för svenska, dokumenttunga källor med fokus på:

- **Hög precision** – Hybrid retrieval (BM25 + embeddings)  
- **Bra latens** – Disk-cache med MTIME-guards, p95 < 2s  
- **Rimliga kostnader** – Smart caching, batch-embeddings  
- **Kvalitetsmätning** – Golden tests med tier-ranking (Diamond → Bronze)

---

## ✨ Features

✅ **Ingest & indexering**

- Multi-format: TXT, MD, PDF, DOCX  
- Smart chunking (ca 600 tokens, 120 overlap)  
- Batch-embeddings via OpenAI `text-embedding-3-large`  
- SQLite-persistens med versionshantering och mtime

✅ **Hybrid retrieval**

- BM25 (exakta termer, namn, siffror)  
- Embeddings (semantisk likhet, parafraser)  
- Konfigurerbar viktning (`alpha=0.35`, `beta=0.65`)  
- Workspace- & document-filtrering (multi-tenant-stöd)

✅ **Disk-cache med MTIME-guards**

- Instant startup (0 embeddings vid oförändrade dokument)  
- Auto-rebuild endast vid ändrade filer  
- Cache per workspace: `./index_cache/{workspace}/`

✅ **LLM-integration**

- OpenAI GPT-4o (Q&A), GPT-4o-mini (summary/extract)  
- Svenska prompter med källhänvisningar  
- `temperature=0.0` för deterministiska svar

✅ **Kvalitet & testing**

- Golden evaluation med tier-system (Diamond / Platinum / Gold / Silver / Bronze)  
- Performance-tester (p50 / p95 / p99-latens)  
- Stress-test (t.ex. 500+ queries)  
- Quality gates för CI/CD (blockera deploy vid för låg kvalitet)

---

## 🚀 Snabbstart

### 1. Installation

```powershell
# Gå till projektmappen
cd "C:\Users\...\RAG"

# Installera dependencies
python -m pip install -r requirements.txt

# Skapa .env med OpenAI API-nyckel
echo OPENAI_API_KEY=sk-... > .env
```

### 2. Verifiera setup

```powershell
python -m rag.check
```

**Förväntat:**

```
[OK] OPENAI_API_KEY loaded
[OK] config/rag_config.yaml loaded
All checks passed.
```

### 3. Indexera dokument & ställ en fråga

```powershell
# Skapa testmapp med ett dokument
mkdir my_docs
echo RAG-motorn stöder Q&A, sammanfattning, extraktion. > my_docs/intro.txt

# Indexera + fråga
python -m cli.chat_cli --verbose `
  --docs_dir "./my_docs" `
  --workspace default `
  --mode answer `
  "Vad stöder RAG-motorn?"
```

**Exempeloutput:**

```json
{
  "answer": "RAG-motorn stöder Q&A, sammanfattning och extraktion.",
  "sources": [
    {
      "document_name": "intro.txt",
      "page_number": 1,
      "snippet": "RAG-motorn stöder Q&A, sammanfattning, extraktion."
    }
  ],
  "mode": "answer"
}
```

### 4. Kör igen (från cache, utan embeddings)

```powershell
python -m cli.chat_cli `
  --docs_dir "./my_docs" `
  --workspace default `
  --mode summary `
  "Sammanfatta systemet"
```

**Second run → index laddas från disk-cache → 0 embeddings → svar ≈ < 1s.**

---

## 📖 Användning (CLI)

### Grundkommando

```powershell
python -m cli.chat_cli `
  --docs_dir "C:\path\to\docs" `
  --workspace production `
  --mode answer `
  "Din fråga här"
```

**Flaggor:**

- `--docs_dir` – Mapp med .txt / .md / .pdf / .docx
- `--workspace` – Workspace-id (multi-tenant)
- `--mode` – `answer` | `summary` | `extract`
- `--doc_ids` – Filtrera på specifika dokument (kommaseparerade filnamn)
- `--verbose` – Aktivera debug (BM25/emb/hybrid-score per chunk)

### Filtrera på specifika dokument

```powershell
python -m cli.chat_cli `
  --docs_dir "./docs" `
  --workspace default `
  --doc_ids intro.txt,policy.md `
  --mode answer `
  "Vad är betalningsvillkoren?"
```

### Debug-läge

```powershell
python -m cli.chat_cli --verbose `
  --docs_dir "./docs" `
  --workspace default `
  --mode answer `
  "Testfråga"
```

**Exempel på debugrad:**

```
[cli] Indexed files: 5, chunks: 23, vectors: 23
[retriever] chunk_14 | bm25=0.723 | emb=0.841 | hybrid=0.804 | preview='...'
```

---

## 🌐 Frontend Integration

**API är redo för frontend-integration!**

### Quick Start

1. **Starta API-servern:**
```powershell
python -m uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
```

2. **Swagger UI:** Öppna `http://localhost:8000/docs` för interaktiv API-dokumentation

3. **Testa API:**
```powershell
# Health check
curl http://localhost:8000/health

# Query
curl -X POST http://localhost:8000/query `
  -H "Content-Type: application/json" `
  -d '{\"query\": \"Vad stöder RAG-motorn?\", \"workspace\": \"default\"}'
```

### Dokumentation

- **[Frontend Integration Guide](docs/FRONTEND_INTEGRATION.md)** – Komplett guide med TypeScript-typer, React/Vue/Svelte-exempel
- **[API Reference](docs/API_REFERENCE.md)** – Detaljerad API-dokumentation
- **TypeScript Types** – Se `frontend/types/rag-api.ts`
- **API Client** – Se `frontend/lib/rag-client.ts`
- **React Example** – Se `frontend/examples/react-example.tsx`

### Endpoints

- `GET /health` – Health check
- `POST /query` – Ställ frågor till RAG-motorn
- `GET /docs` – Swagger UI (interaktiv dokumentation)

---

## 🧪 Testing

### 1. Golden Evaluation (kvalitet)

```powershell
python -m evaluation.golden_eval
```

**Exempeloutput:**

```
========== RAG GOLDEN EVAL ==========
Antal testfall: 3
Source-hit rate:          1.000
Genomsnittlig recall:     1.000
Genomsnittlig must-cover: 0.667
Genomsnittlig nice-cover: 0.250
Totala forbidden-hits:    0
Tier-fördelning:
  Diamond  : 1/3
  Silver   : 1/3
  Bronze   : 1/3
=====================================
```

**Lägg till egna golden-cases:**

```jsonl
# evaluation/data/rag_golden.jsonl
{"id": "test1", "query": "Din fråga?", "must_have_keywords": ["svar", "korrekt"]}
```

Varje rad är ett JSON-objekt med t.ex.:

- `id`, `query`, `workspace`, `doc_ids`
- `expected_sources`
- `must_have_keywords`, `nice_to_have_keywords`, `forbidden_keywords`
- `difficulty`, `tags`

### 2. Performance Test (latens)

```powershell
# 100 requests mot golden-queries
python -m evaluation.perf_eval --runs 100
```

**Exempeloutput:**

```
========== RAG PERFORMANCE ==========
Antal mätta requests: 100
Medel-latens:   1243.0 ms
p50-latens:     1140.9 ms
p95-latens:     1692.5 ms
p99-latens:     2135.2 ms
Max-latens:     2176.8 ms
=====================================
[PASS] p95 latency inom tröskeln 2000ms
[FAIL] Medel-latens över tröskeln 1000ms
```

### 3. Stress Test (robusthet)

```powershell
# 500 requests
python -m evaluation.perf_eval --runs 500
```

---

## ⚙️ Konfiguration

### `config/rag_config.yaml`

**Modeller:**

```yaml
models:
  embeddings: text-embedding-3-large
  llm:
    answer: gpt-4o
    answer_premium: gpt-4.1
    summary: gpt-4o-mini
    extract: gpt-4o-mini
```

**Retrieval:**

```yaml
retrieval:
  mode: hybrid   # hybrid | bm25 | embeddings
  top_k: 8
  hybrid:
    alpha: 0.35   # BM25-vikt
    beta: 0.65    # Embeddings-vikt
```

**Chunking:**

```yaml
chunking:
  target_tokens: 600
  overlap_tokens: 120
```

**Cache:**

```yaml
storage:
  index_dir: ./index_cache
```

---

## 🏗️ Arkitektur

### Flöde

```
Dokument
  ↓
Text Extraction (TXT/MD/PDF/DOCX)
  ↓
Chunking (600 tokens, 120 overlap)
  ↓
Embeddings (OpenAI)
  ↓
Index (numpy + BM25) → Disk-cache (MTIME)
  ↓
Fråga
  ↓
Query Embedding + BM25 → Hybrid Retrieval (BM25 + Embeddings)
  ↓
Top-K chunks
  ↓
LLM (GPT-4o / 4o-mini)
  ↓
Svar + Källhänvisningar
```

### Filstruktur (förenklad)

```
RAG/
├── config/
│   └── rag_config.yaml          # Modeller, chunking, retrieval, cache
├── rag/
│   ├── embeddings_client.py     # OpenAI embeddings
│   ├── llm_client.py            # GPT-4o/4o-mini
│   ├── index.py                 # InMemoryIndex (numpy)
│   ├── index_store.py           # Disk-cache (MTIME-guards)
│   ├── retriever.py             # Hybrid (BM25 + embeddings)
│   ├── engine.py                # RAG-orkestrering
│   └── store.py                 # SQLite persistens
├── ingest/
│   ├── text_extractor.py        # TXT/MD/PDF/DOCX
│   └── chunker.py               # Chunking med overlap
├── cli/
│   └── chat_cli.py              # CLI
├── evaluation/
│   ├── golden_eval.py           # Kvalitet (tier-system)
│   ├── perf_eval.py             # Latens & stress
│   └── data/
│       └── rag_golden.jsonl     # Golden-cases
└── .env                         # OPENAI_API_KEY
```

---

## 📊 Metrics & Quality Gates

### Golden Evaluation – tier-system

- **Diamond**: recall ≥ 0.90, must ≥ 0.95, nice ≥ 0.70, 0 forbidden
- **Platinum**: recall ≥ 0.80, must ≥ 0.90, nice ≥ 0.50, 0 forbidden
- **Gold**: recall ≥ 0.70, must ≥ 0.85, nice ≥ 0.30, 0 forbidden
- **Silver**: source_hit & must ≥ 0.70, 0 forbidden
- **Bronze**: allt annat

**Nyckelmetriker:**

- `source_hit_rate` – Träffar rätt dokument?
- `source_recall` – Hur många expected sources hämtas?
- `must_coverage` – Andel must-keywords som finns i svaret
- `nice_coverage` – Andel nice-keywords i svaret
- `forbidden_hits` – Borde vara 0 (annars hårt rött kort)

### Performance – latens

- **p50** – Median
- **p95** – 95% av requests under detta värde
- **p99** – Extrem-svans
- **max** – Långsammaste request

**Standardgates (kan justeras):**

- p95 ≤ 2000 ms
- avg ≤ 1000 ms

**Exit code:**

- `0` = alla gates passerade
- `1` = minst en gate failade → kan blocka deploy i CI

---

## 🔧 Troubleshooting

### `ModuleNotFoundError: No module named 'rag'`

**Kör alltid från projektroten:**

```powershell
cd "C:\...\RAG"
python -m cli.chat_cli ...
```

### `Missing OPENAI_API_KEY`

**Se till att .env finns i projektroten:**

```powershell
echo OPENAI_API_KEY=sk-your-key > .env
python -m rag.check
```

### Indexerar 0 filer

**Kolla sökväg och filformat:**

```powershell
Test-Path "./my_docs"
Get-ChildItem "./my_docs" -Include *.txt,*.md,*.pdf,*.docx
```

---

## 🎯 Roadmap

### Kort sikt

- [ ] Bygga ut golden-filen till 50+ testfall
- [ ] Sätta upp CI/CD med quality gates (golden + performance)
- [ ] A/B-testa olika prompts och LLM-modeller

### Medellång sikt

- [x] HTTP API (FastAPI) ✅
- [ ] Frontend (React/Svelte eller liknande) – Integration-guide klar
- [ ] Multi-user auth & separata workspaces
- [ ] Alternativa index-backends (Chroma/Faiss/pgvector)

### Lång sikt

- [x] Cross-encoder re-ranker ✅
- [ ] Multimodal RAG (bilder, tabeller, bilagor)
- [ ] Real-time indexering (webhooks / event-drivet)
- [ ] Dashboard för metrics & analytics

---

## 📚 Dependencies

**Core:**

- `openai` – Embeddings & LLM
- `numpy` – Vektoroperationer
- `rank-bm25` – BM25-sökning

**Ingest:**

- `pypdf` – PDF-extraktion
- `python-docx` – DOCX-extraktion

**Config:**

- `pyyaml` – YAML-konfiguration
- `python-dotenv` – .env-hantering

Se även `requirements.txt` för full lista.

---

## 📝 Licens

MIT License – se LICENSE för detaljer.

---

## 🤝 Bidra

1. Forka projektet
2. Skapa feature-branch: `git checkout -b feature/amazing`
3. Commit:a ändringar: `git commit -m "Add amazing feature"`
4. Push:a: `git push origin feature/amazing`
5. Öppna en Pull Request

---

## 📧 Kontakt

- Öppna ett issue för buggar/frågor
- För enterprise/anpassningar: kontakta oss via e-post

---

**Built with ❤️ for Swedish AI applications**
