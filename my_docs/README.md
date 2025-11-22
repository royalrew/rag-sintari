# Testdokument för RAG-systemet

Denna mapp innehåller testdokument för att verifiera att AI:n kan läsa källor korrekt och ge bra svar.

## 📁 Nuvarande testdokument

### Systemdokument
- `intro.txt` - Systemdokumentation om RAG-motorn (används i golden tests)

### Real-world kunddokument
- `anstallningsvillkor_lund_2022.txt` - Anställningsvillkor från Lunds universitet (golden test + compliance test)
- `7.54-IT-och-informationssakerhetspolicy-1.pdf` - IT-säkerhetspolicy från Karlshamns kommun (golden test)

### Compliance test-cases
- `gdpr_simple_case.txt` - GDPR-test med personnummer + email
- `audit_simple_case.txt` - Audit-test med uppenbara hål i dokumentet

### Andra
- `bench_prompt.txt` - Benchmark prompt (används i performance-tester)

## 🚀 Så här använder du mappen

### 1. Lägg dina testfiler här

Du kan lägga vilka filer som helst:
- `.txt` - Textdokument
- `.md` - Markdown
- `.pdf` - PDF-filer
- `.docx` - Word-dokument

### 2. Indexera dokumenten

```powershell
# Indexera alla filer i my_docs/ till workspace "default"
python scripts/index_workspace.py --workspace default --path my_docs

# Med force för att alltid indexera om
python scripts/index_workspace.py --workspace default --path my_docs --force
```

### 3. Testa att AI:n läser källorna korrekt

**Via CLI:**
```powershell
# Ställ en fråga
python -m cli.chat_cli --workspace default --mode answer "Vad står i dokumentet om X?"

# Med verbose för att se vad som hittas
python -m cli.chat_cli --workspace default --verbose "Vad säger dokumentet om Y?"

# Testa specifikt dokument
python -m cli.chat_cli --workspace default --doc_ids "dokumentnamn.pdf" "Fråga om dokumentet"
```

**Via API (om backend körs):**
```powershell
curl -X POST http://localhost:8000/query `
  -H "Content-Type: application/json" `
  -d '{"query": "Vad står i dokumentet om X?", "workspace": "default"}'
```

**Via Frontend:**
1. Starta backend: `python -m uvicorn api.main:app --reload`
2. Starta frontend: `cd frontend && npm run dev`
3. Logga in och ställ frågor i chatten

## 🧪 Exempel-testflöde

```powershell
# 1. Lägg ett testdokument
echo "Vår policy säger att semester är 25 dagar per år." > my_docs/policy_test.txt

# 2. Indexera det
python scripts/index_workspace.py --workspace default --path my_docs --force

# 3. Testa att AI:n hittar det
python -m cli.chat_cli --workspace default "Hur många semesterdagar har vi?"

# Förväntat: AI:n ska hitta "25 dagar" och svara med källhänvisning
```

## ✅ Verifiering att det fungerar

Kolla att dokumentet är indexerat:
```powershell
# Kolla cache
ls index_cache/default/

# Kolla chunks
python -c "from rag.index_store import load_index; cache = load_index('default', 'index_cache'); print(f'Chunks: {len(cache[\"chunks_meta\"])}')"
```

Kolla att retrieval fungerar:
```powershell
# Med verbose ser du exakt vilka chunks som hittas
python -m cli.chat_cli --workspace default --verbose "Din fråga"
```

## 📝 Tips

- Använd `--verbose` för att se vilka chunks som hittas och deras scores
- Använd `--doc_ids` för att testa specifika dokument
- Kolla `logs/rag_queries.jsonl` för att se vad som loggas
- Varje gång du ändrar ett dokument måste du indexera om (eller använd `--force`)

## 🎯 Golden Test-cases

Dessa dokument används i golden tests:
- `it_policy_syfte` - Testar IT-policy retrieval (golden test)
- `intro_purpose`, `intro_features`, `intro_general` - Testar RAG-motorn grundläggande funktionalitet
- `anstallningsvillkor_lund` - Testar compliance-analys

## ⚠️ Viktigt för produktion

När du deployar till sintari.se:

1. **Säkerställ att samma workspace används:**
   - Frontend ska skicka `workspace: "default"` (eller rätt workspace-namn)
   - Kontrollera i API: `/health` visar workspace och antal chunks

2. **Säkerställ att dokumenten är indexerade i prod:**
   - Kör `index_workspace.py` i Railway-miljön
   - Eller logga i API:t hur många dokument/chunks som finns vid första query

3. **Testa med golden tests innan deploy:**
   ```powershell
   python -m evaluation.golden_eval --workspace default
   ```

## 🔍 Felsökning

**AI:n svarar "Jag hittar inte svaret i källorna":**
- Kontrollera att dokumentet är indexerat: `ls index_cache/default/`
- Kontrollera att rätt workspace används
- Testa med `--verbose` för att se vilka chunks som hittas

**Felaktiga chunks hittas:**
- Kontrollera att retrieval-mode är rätt i `config/rag_config.yaml`
- Testa med `--doc_ids` för att filtrera till specifikt dokument

**Dokumentet är inte indexerat:**
- Kontrollera filtypen (TXT, MD, PDF, DOCX stöds)
- Kontrollera att filen inte är tom
- Testa att extrahera text manuellt: `python -c "from ingest.text_extractor import extract_text; print(extract_text('my_docs/fil.txt'))"`

