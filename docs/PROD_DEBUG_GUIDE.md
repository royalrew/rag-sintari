# 🔍 Prod Debug Guide - Säkerställ samma hjärna i prod som lokalt

Denna guide hjälper dig att verifiera att sintari.se använder exakt samma RAG-hjärna som fungerar perfekt lokalt.

## ⚠️ Problemet

Lokalt fungerar AI:n perfekt:
- ✅ Hittar rätt dokument (IT-policy PDF)
- ✅ Ger bra svar med källor
- ✅ `no_answer = false`

På sintari.se kan du ibland få:
- ❌ "Jag hittar inte svaret i källorna"
- ❌ Felaktiga källor
- ❌ Felaktiga svar

## 🎯 Root Cause: Tre möjliga skillnader

Det kan bara skilja på tre saker mellan lokal och prod:

1. **Koden** (olika versioner/commits)
2. **Configen** (t.ex. rag_config.yaml / env vars)
3. **Datan** (vilka dokument som är indexerade i workspacet)

---

## 🔧 Steg-för-steg Debugging

### Steg 1: Säkerställ att prod kör exakt samma commit

**Kontrollera lokalt:**
```powershell
git status
git log -1
```

**Se till att alla ändringar är committade:**
- `engine.py` (no_answer-logik, BASE_STYLE_INSTRUCTIONS)
- `output_formatter.py`
- `config/rag_config.yaml`
- Alla compliance-agenter

**Pusha:**
```powershell
git add -A
git commit -m "feat: [ditt meddelande]"
git push origin main
```

**Verifiera i Railway:**
1. Gå till Railway Dashboard → din backend-service
2. Fliken "Deploys" eller "Activity"
3. Bekräfta att senaste deployn bygger på commit du just pushade
4. Kolla deploy-loggarna för att se commit-hash

**Om prod kör äldre image:**
→ Då kör den gamla no_answer-logiken och gamla prompten
→ **Lösning:** Vänta på ny deploy eller trigga manuell redeploy

---

### Steg 2: Kör samma CLI-kommando inne i Railway-containern

Det här är det mest kraftfulla testet.

**Öppna Railway Shell:**
1. Railway Dashboard → din backend-service
2. Fliken "Shell" eller "Terminal" (eller `railway shell` via CLI)
3. Du är nu inne i containern

**Indexera testdokument (om my_docs finns i imagen):**
```bash
# Om my_docs är inkluderad i Dockerfile
python scripts/index_workspace.py --workspace default --path my_docs --force
```

**Kör samma CLI-test som lokalt:**
```bash
python -m cli.chat_cli --workspace default --mode answer --verbose "Vad är syftet med IT- och informationssäkerhetspolicyn?"
```

**Två utfall:**

**🔹 Utfall A: Svaret är bra (som lokalt)**
```
✅ AI:n hittar rätt dokument
✅ Ger bra svar
✅ no_answer = false
```
**Slutsats:** Din RAG-hjärna funkar i prod!  
**Nästa steg:** Buggen sitter i `/query`-endpointen eller frontend-parametrar:
- Fel workspace (frontend skickar annat workspace än "default")
- Fel mode
- `no_answer`-flagga sätts fel
- Annan fråga än du tror skickas

**🔹 Utfall B: Svaret blir "Jag hittar inte..." även i containern**
```
❌ "Jag hittar inte svaret i källorna"
❌ Inga eller felaktiga källor
```
**Slutsats:** Prod-koden/configen skiljer sig från lokal:
- Äldre commit (inte deployad än)
- Annan `rag_config.yaml` (t.ex. fel retrieval-top_k)
- Andra env-flaggor
- Dokumentet är inte indexerat i containern

---

### Steg 3: Stäm av config – prod måste använda samma rag_config.yaml

Du har nu ett config som ger 10/10 lokalt. Se till att prod inte sabbar det.

**Kontrollera i repo:**
```powershell
# Config ska vara incheckad
git ls-files config/rag_config.yaml

# INGEN separat prod-config
git ls-files config/*.prod.yaml
git ls-files config/*.production.yaml
```

**Verifiera att prod inte override:ar via env vars:**
- I Railway Dashboard → Environment Variables
- Kolla att du INTE har:
  - `RAG_RETRIEVAL_TOP_K`
  - `RAG_HYBRID_ALPHA`
  - `RAG_HYBRID_BETA`
  - `RAG_RERANK_ENABLED`

**Rätt config (samma som lokal):**
```yaml
retrieval:
  mode: hybrid
  top_k: 8  # Inte 1!
  hybrid:
    alpha: 0.35  # BM25 weight
    beta: 0.65   # Embeddings weight

rerank:
  enabled: false  # Eller true, men samma som lokal

output:
  include_sources_in_answer: true
  presentation_mode: "consulting"
```

**Om prod har `top_k: 1` eller `rerank: false` när lokal har `true`:**
→ Då kan den lätt missa rätt chunk  
→ **Lösning:** Se till att prod använder exakt samma config

---

### Steg 4: Säkerställ att rätt dokument verkligen är indexerat i prod-workspacet

Lokalt ser vi:
```
Loaded cached index for workspace 'default' (8 chunks)
Doc=7.54-IT-och-informationssakerhetspolicy-1.pdf page=1
```

**På sintari.se kan det vara:**
- Att frontend skickar `workspace: "user-123"` och det workspacet har bara andra dokument
- Att policyn ligger i ett annat workspace i databasen
- Att indexeringen av PDF:en inte har körts efter upload

**Kolla workspace-info vid startup:**
API:t loggar nu automatiskt vid startup:
```
[API][STARTUP] Workspace-översikt:
[API][STARTUP]   Workspace 'default': 6 dokument, 8 chunks
[API][STARTUP]     Dokument: 7.54-IT-och-informationssakerhetspolicy-1.pdf, anstallningsvillkor_lund_2022.txt, ...
```

**Kolla i Railway-loggarna (efter deploy):**
1. Railway Dashboard → din backend → "Logs"
2. Leta efter `[API][STARTUP]`-loggar
3. Verifiera att:
   - Workspacet du använder från frontend faktiskt innehåller policyn
   - Antal dokument/chunks är korrekt
   - Dokumentnamnet matchar exakt

**Kolla workspace-info vid varje query:**
API:t loggar nu också vid varje query:
```
[API][QUERY] workspace=default docs_in_ws=6 query='Vad är syftet med IT...' user_id=1
```

**Verifiera i Railway-loggarna:**
- Kolla att samma workspace används som lokalt
- Kolla att antal dokument matchar
- Kolla att query-texten är exakt samma

**Med verbose (kan aktiveras via env):**
Sätt env var i Railway:
```
RAG_VERBOSE_PROD=true
```

Då loggas:
```
[API][QUERY][VERBOSE] Dokument i workspace 'default': ['7.54-IT-och-informationssakerhetspolicy-1.pdf', ...]
[DEBUG] Retrieved 8 chunks for question: ...
[DEBUG] Chunk 1: score=1.0
[DEBUG]   Doc=7.54-IT-och-informationssakerhetspolicy-1.pdf page=1
```

---

### Steg 5: Lägg in IT-policy-frågan som golden-case och kör i CI

Det här gör att du aldrig mer behöver gissa.

**Golden test finns redan:**
- `evaluation/data/rag_golden.jsonl` innehåller `it_policy_syfte`
- GitHub Actions workflow kör golden tests automatiskt
- Build failar om testet misslyckas

**Testa lokalt:**
```powershell
python -m evaluation.golden_eval --workspace default
```

**Förväntat:**
```
it_policy_syfte [easy] => tier=Diamond/Platinum | sources=['7.54-IT-och-informationssakerhetspolicy-1.pdf'] | must=1.00 | forbidden_hits=0
```

**I CI/CD:**
- Körs automatiskt vid PR och push
- Failar build om IT-policy-testet misslyckas
- Säkerställer att hjärnan aldrig börjar svara "Jag hittar inte..." på den här frågan igen

---

### Steg 6: Snabb prod-debug just nu

**Aktivera verbose logging i prod (tillfälligt):**

I Railway Dashboard → Environment Variables:
```
RAG_VERBOSE_PROD=true
```

**Gör en query från sintari.se och kolla Railway-loggarna:**
1. Gå till sintari.se
2. Ställ frågan: "Vad är syftet med IT- och informationssäkerhetspolicyn?"
3. Gå till Railway → Logs
4. Leta efter `[API][QUERY]` och `[DEBUG]`-loggar

**Jämför med lokalt CLI-resultat:**
- Samma antal chunks?
- Samma topp-scorer?
- Samma dokument?
- Samma workspace?

**Om loggarna skiljer sig:**
→ Du vet exakt vad som är fel (workspace, config, dokument, etc.)

**Stäng av verbose efter debugging:**
```
RAG_VERBOSE_PROD=false
```
(eller ta bort env var)

---

## 📋 Checklista för Prod-Verifiering

För att säkerställa att prod använder samma hjärna som lokalt:

- [ ] Prod kör samma commit som lokal (verifierat i Railway)
- [ ] Samma CLI-test fungerar inne i Railway-containern
- [ ] Samma `config/rag_config.yaml` används (ingen prod-override)
- [ ] Rätt workspace har policydokumentet indexerat (verifierat via startup-logs)
- [ ] IT-policy golden test passerar i CI
- [ ] Verbose logging visar samma chunks i prod som lokalt

---

## 🎯 Sammanfattning

För att få samma beteende på sintari.se som lokalt:

1. **Se till att prod kör samma commit** (kolla Railway deploy)
2. **Kör samma CLI-test inne i Railway-containern** (mest kraftfullt)
3. **Se till att samma `rag_config.yaml` används** (inga env-overrides)
4. **Verifiera att rätt workspace verkligen har policydokumentet indexerat** (startup-logs)
5. **Lägg golden-case på "syfte"-frågan** (redan gjort!)
6. **Använd verbose logging för prod-debug** (env var `RAG_VERBOSE_PROD=true`)

Gör du de här stegen är det i princip omöjligt för prod att "glömma bort" syftet med policyn igen.

---

## 🚨 Vanliga Problem

### Problem: "Jag hittar inte..." i prod men fungerar lokalt

**Möjliga orsaker:**
1. **Workspace-skillnad**: Frontend skickar annat workspace än "default"
   - **Fix:** Kolla frontend-koden som skickar query, verifiera workspace-param
   
2. **Dokument inte indexerat**: PDF:en finns inte i prod-workspacet
   - **Fix:** Kör `index_workspace.py` i Railway-containern
   
3. **Config-skillnad**: Prod har `top_k: 1` eller `rerank: false`
   - **Fix:** Verifiera att prod använder samma `rag_config.yaml`

4. **Äldre commit**: Prod kör gammal kod innan no_answer-fixarna
   - **Fix:** Vänta på deploy eller trigga manuell redeploy

### Problem: Olika svar lokalt vs prod

**Kolla:**
1. Samma config? (`retrieval.top_k`, `rerank.enabled`)
2. Samma dokument indexerat? (startup-logs)
3. Samma workspace? (query-logs)
4. Samma query-text? (query-logs)

---

## 📝 Ytterligare Debugging

### Kolla exakt vad som händer i prod

**Via API /health endpoint:**
```bash
curl https://rag-sintari.up.railway.app/health
```

Förväntat:
```json
{
  "status": "healthy",
  "workspace": "default",
  "indexed_chunks": 8,
  "version": "1.0.0"
}
```

**Via Railway Shell:**
```bash
# Kolla config
cat config/rag_config.yaml

# Kolla workspace-info
python -c "from rag.store import Store; s = Store(); print(s.list_workspaces_with_stats())"

# Kolla dokument i workspace
python -c "from rag.store import Store; s = Store(); docs = s.list_documents_in_workspace('default'); print([d['name'] for d in docs])"
```

---

## ✅ När allt fungerar

När prod fungerar som lokal:
- ✅ Samma commit
- ✅ Samma config
- ✅ Samma dokument indexerade
- ✅ Samma workspace används
- ✅ Golden tests passerar i CI

Då har du:
- 🎯 Reproducerbar hjärna
- 🔒 CI/CD-kvalitetssäkring
- 📊 Tydlig debug-information
- 🚀 Produktionsklar deployment

