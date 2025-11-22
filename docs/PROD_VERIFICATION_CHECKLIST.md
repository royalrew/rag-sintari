# ✅ Prod Verification Checklist

Kontrollera att sintari.se använder exakt samma RAG-hjärna som lokalt fungerar perfekt.

## 🎯 Snabbcheck (5 minuter)

- [ ] Prod kör senaste commit (verifiera i Railway)
- [ ] Samma workspace används (kolla startup-logs)
- [ ] Antal dokument matchar lokalt (kolla startup-logs)
- [ ] Samma config används (ingen env-override)
- [ ] IT-policy golden test passerar (CI/CD)

---

## 📋 Detaljerad Checklista

### 1. Commit-Verifiering

```powershell
# Lokalt
git log -1 --oneline

# I Railway Dashboard
# Gå till: Din backend → Deploys → Senaste deploy
# Verifiera att commit-hash matchar lokal
```

**✅ Verifierat:** Prod kör commit `[hash]` vilket är samma som lokal

---

### 2. Workspace-Verifiering

**Vid startup loggar API:t:**
```
[API][STARTUP] Workspace-översikt:
[API][STARTUP]   Workspace 'default': 6 dokument, 8 chunks
[API][STARTUP]     Dokument: 7.54-IT-och-informationssakerhetspolicy-1.pdf, ...
```

**Verifiera i Railway-loggarna:**
1. Gå till Railway → din backend → Logs
2. Leta efter `[API][STARTUP]` efter senaste deploy
3. Kontrollera:
   - [ ] Workspace "default" finns
   - [ ] Antal dokument matchar lokalt (lokalt: 6, prod: ___)
   - [ ] IT-policy PDF finns i listan
   - [ ] Antal chunks matchar lokalt (lokalt: 8, prod: ___)

**✅ Verifierat:** Workspace 'default' har [X] dokument inkl. IT-policy PDF

---

### 3. Config-Verifiering

**I Railway Dashboard → Environment Variables:**

Kontrollera att du INTE har:
- [ ] `RAG_RETRIEVAL_TOP_K` (skulle override config)
- [ ] `RAG_HYBRID_ALPHA`
- [ ] `RAG_HYBRID_BETA`
- [ ] `RAG_RERANK_ENABLED`

**Verifiera config i Railway Shell:**
```bash
cat config/rag_config.yaml | grep -A 10 "retrieval:"
```

Förväntat:
```yaml
retrieval:
  mode: hybrid
  top_k: 8  # INTE 1!
  hybrid:
    alpha: 0.35
    beta: 0.65
```

**✅ Verifierat:** Prod använder samma config som lokal (top_k=8, hybrid mode)

---

### 4. Dokument-Verifiering

**Testa samma CLI-kommando i Railway-containern:**

```bash
# I Railway Shell
python -m cli.chat_cli --workspace default --mode answer --verbose "Vad är syftet med IT- och informationssäkerhetspolicyn?"
```

**Jämför resultat lokalt vs prod:**

| | Lokalt | Prod | Matchar? |
|---|---|---|---|
| Hittar PDF? | ✅ Ja | ___ | ___ |
| Antal chunks | 8 | ___ | ___ |
| Top scorer | 1.0 | ___ | ___ |
| no_answer | false | ___ | ___ |

**✅ Verifierat:** Samma resultat i prod-containern som lokalt

---

### 5. Query-Verifiering

**Gör en query från sintari.se och kolla Railway-loggarna:**

Query: "Vad är syftet med IT- och informationssäkerhetspolicyn?"

**I Railway-loggarna leta efter:**
```
[API][QUERY] workspace=default docs_in_ws=6 query='Vad är syftet...' user_id=1
```

Kontrollera:
- [ ] workspace är "default" (inte "user-123" eller annat)
- [ ] docs_in_ws matchar lokalt (6 dokument)
- [ ] query-texten är exakt samma

**Med verbose (sätt `RAG_VERBOSE_PROD=true` temporärt):**
```
[API][QUERY][VERBOSE] Dokument i workspace 'default': ['7.54-IT-och-informationssakerhetspolicy-1.pdf', ...]
[DEBUG] Retrieved 8 chunks for question: ...
[DEBUG] Chunk 1: score=1.0
[DEBUG]   Doc=7.54-IT-och-informationssakerhetspolicy-1.pdf page=1
```

**✅ Verifierat:** Samma workspace, samma dokument, samma chunks som lokalt

---

### 6. Golden Test-Verifiering

**Lokalt:**
```powershell
python -m evaluation.golden_eval --workspace default
```

**Förväntat för IT-policy:**
```
it_policy_syfte [easy] => tier=Diamond/Platinum | sources=['7.54-IT-och-informationssakerhetspolicy-1.pdf'] | must>0.5 | forbidden_hits=0
```

**✅ Verifierat:** IT-policy golden test passerar lokalt

**I CI/CD (GitHub Actions):**
- Gå till: GitHub → Actions → Senaste workflow run
- Kolla att compliance golden tests passerar

**✅ Verifierat:** CI/CD golden tests passerar

---

## 🚨 Om något inte matchar

### Problem: Prod har färre dokument än lokal

**Orsak:** Dokumenten är inte indexerade i prod

**Fix:**
1. Öppna Railway Shell
2. Kör: `python scripts/index_workspace.py --workspace default --path my_docs --force`
3. Verifiera i startup-logs att dokumenten finns

---

### Problem: Prod använder annat workspace

**Orsak:** Frontend skickar fel workspace

**Fix:**
1. Kolla frontend-koden som skickar query
2. Verifiera att `workspace: "default"` skickas (eller rätt workspace)
3. Testa med Postman/curl för att verifiera workspace

---

### Problem: Prod har annan config (top_k=1 eller rerank av)

**Orsak:** Config override via env vars eller annan config-fil

**Fix:**
1. Ta bort env vars som override config
2. Verifiera att `config/rag_config.yaml` är samma i prod
3. Redeploy för att säkerställa att ändringar laddas

---

### Problem: Prod ger "Jag hittar inte..." även med verbose

**Orsak:** Äldre commit eller fel i retrieval

**Fix:**
1. Verifiera att prod kör senaste commit
2. Kolla verbose-loggarna för att se vilka chunks som hittas
3. Jämför med lokalt CLI-resultat
4. Om chunks hittas men LLM svarar fel → prompt-problem (kolla commit)

---

## ✅ När allt matchar

När alla checkpoints är gröna:
- ✅ Prod kör samma commit
- ✅ Samma config används
- ✅ Samma dokument indexerade
- ✅ Samma workspace används
- ✅ Samma query ger samma resultat

Då är prod garanterat identisk med lokal!

---

## 📞 Quick Reference

**Kolla startup-logs:**
```bash
# I Railway → Logs → Sök efter "[API][STARTUP]"
```

**Kolla query-logs:**
```bash
# I Railway → Logs → Sök efter "[API][QUERY]"
```

**Aktivera verbose logging:**
```
# I Railway → Environment Variables
RAG_VERBOSE_PROD=true
```

**Kolla commit i prod:**
```
# I Railway → Deploys → Senaste deploy → Commit hash
```

**Testa CLI i prod:**
```
# I Railway → Shell
python -m cli.chat_cli --workspace default --verbose "Din fråga"
```

