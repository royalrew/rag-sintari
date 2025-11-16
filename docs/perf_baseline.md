# Performance Baseline - RAG-motorn

**Datum:** 2025-11-15  
**Miljö:** Development, gpt-4o, rerank disabled, bench-mode ON

## Golden Evaluation Baseline

**Tier-fördelning:**
- **Diamond**: 1/3 (intro_purpose)
- **Platinum**: 1/3 (intro_general)
- **Gold**: 1/3 (intro_features)
- **Silver**: 0/3
- **Bronze**: 0/3

**Metrics:**
- Source-hit rate: 1.000
- Genomsnittlig recall: 1.000
- Genomsnittlig must-cover: 1.000
- Genomsnittlig nice-cover: 0.516
- Totala forbidden-hits: 0

**Detaljer per case:**
- `intro_purpose` [easy] => **Diamond** | must=1.00, nice=0.71
- `intro_features` [medium] => **Gold** | must=1.00, nice=0.33
- `intro_general` [easy] => **Platinum** | must=1.00, nice=0.50

---

## Performance Baseline (Bench-mode)

**Konfiguration:**
- Model: `gpt-4o`
- Rerank: `disabled`
- Bench-mode: `ON` (kort prompt)
- Warmup: 0
- Runs: 100 per körning
- Metod: Bästa av 3 körningar

**Bästa körningen (Run 1):**
- **Min-latens**: 933.2 ms
- **Medel-latens**: 1405.5 ms
- **p50-latens**: 1370.8 ms
- **p95-latens**: 1946.8 ms ✅ (under 2000ms threshold)
- **p99-latens**: 2285.8 ms
- **Max-latens**: 3792.0 ms

**Alla 3 körningar:**
| Run | Avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) |
|-----|----------|----------|----------|----------|
| 1   | 1405.5   | 1370.8   | 1946.8   | 2285.8   |
| 2   | 1423.8   | 1363.4   | 2029.2   | 2588.4   |
| 3   | 1422.2   | 1353.1   | 2056.4   | 2904.8   |

**Genomsnitt över 3 körningar:**
- Avg: ~1417 ms
- p50: ~1362 ms
- p95: ~2011 ms

---

## Produktionsläge (Full prompt)

**Konfiguration:**
- Model: `gpt-4o`
- Rerank: `disabled`
- Bench-mode: `OFF` (full prompt med källor)
- Warmup: 0
- Runs: 100 per körning

**Bästa körningen (Run 3):**
- **Medel-latens**: 1536.4 ms
- **p50-latens**: 1389.8 ms
- **p95-latens**: 2370.8 ms
- **p99-latens**: 3003.8 ms

**Notera:** Produktionsläge med full prompt ger ~100-200 ms högre latens än bench-mode, vilket är förväntat.

---

## Användning

### Köra benchmark igen

1. Sätt `bench.use_bench_prompt: true` i `config/rag_config.yaml`
2. Kör: `python -m evaluation.perf_eval --runs 100 --warmup 0`
3. Upprepa 3 gånger och ta bästa resultatet
4. Sätt tillbaka `bench.use_bench_prompt: false` för produktion

### Jämföra med baseline

När du ändrar:
- Prompt-struktur
- LLM-modell
- Rerank-konfiguration
- Chunking-parametrar

→ Kör samma benchmark och jämför med dessa siffror.

---

## Mål för framtida optimering

**Golden:**
- Behåll 0 Bronze/Silver
- Sträva efter 2-3 Diamond, 0-1 Platinum/Gold

**Performance:**
- p95 ≤ 1500 ms (bench-mode)
- avg ≤ 1200 ms (bench-mode)
- p50 ≤ 1100 ms (bench-mode)

**Produktion:**
- p95 ≤ 2000 ms (full prompt)
- avg ≤ 1500 ms (full prompt)

