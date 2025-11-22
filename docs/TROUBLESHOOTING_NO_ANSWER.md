# Felsöka "Jag hittar inte svaret i källorna"

Guide för att felsöka när systemet säger "Jag hittar inte svaret i källorna" men svaret faktiskt finns.

## Två olika fall

### Fall 1: Riktigt fall (systemet gör rätt) ✅

Exempel: Frågan är "test" eller något som inte finns i dokumenten.

**Detta är korrekt beteende** - systemet ska säga "Jag hittar inte..." när inget relevant finns.

### Fall 2: Felet - svaret finns men systemet säger ändå "jag hittar inte" ❌

När svaret faktiskt finns i dokumenten men systemet ändå säger "jag hittar inte...".

## Debug-steg

### Steg 1: Aktivera verbose debug

Kör queryn med `--verbose` flaggan:

```bash
python -m cli.chat_cli --workspace default --mode answer --verbose "din fråga här"
```

Eller via API med `verbose: true` i request body.

### Steg 2: Kolla [DEBUG]-raderna

Titta på outputen:

```
[DEBUG] Retrieved 3 chunks for question: din fråga här...
[DEBUG] Chunk 1: score=0.85
[DEBUG]   Doc=intro.txt page=1
[DEBUG]   Text=Den relevanta texten där svaret står...
----
```

**Frågor att ställa:**

1. **Ser du exakt den text där svaret står?**
   - ✅ Ja → Retrieval fungerar, problemet är i prompt/LLM
   - ❌ Nej → Problem i ingest/index/retrieval

2. **Har du chunks överhuvudtaget?**
   - ❌ Nej chunks → Dokumentet är inte indexerat eller fel workspace
   - ✅ Ja chunks → Fortsätt nedan

### Steg 3: Om retrieval ser rätt ut men LLM säger ändå "jag hittar inte"

Detta är ofta ett prompt-problem. Modellen är för försiktig.

**Kontrollera:**
1. Är prompten för strikt? (Se `rag/engine.py` - prompten är uppdaterad för att vara mjukare)
2. Innehåller chunks faktiskt svaret? (Kolla DEBUG-output)
3. Är chunks för korta/brutna? (Kolla chunking-konfig)

## Vanliga problem och lösningar

### Problem: Dokumentet är inte indexerat

**Symptom:** `[DEBUG] Retrieved 0 chunks`

**Lösning:**
```bash
# Indexera dokumentet
python -m cli.chat_cli --docs_dir "./my_docs" --workspace default --mode answer "test"

# Eller indexera specifik workspace
python -m cli.chat_cli --docs_dir "./policy_docs" --workspace policy --mode answer "test"
```

### Problem: Fel workspace

**Symptom:** Dokumentet finns men retrieval hittar inget

**Lösning:**
- Kontrollera att du använder samma workspace i CLI och backend
- Verifiera workspace i config/index_cache

### Problem: Chunking-problem

**Symptom:** Retrieval hittar chunks men texten är brutet/inkomplett

**Lösning:**
- Kolla `config/rag_config.yaml`:
  - `chunking.target_tokens: 600`
  - `chunking.overlap_tokens: 120`
- Dokument med konstig layout kan behöva justering

### Problem: Prompt för strikt

**Symptom:** Retrieval hittar rätt chunk, men LLM säger ändå "jag hittar inte"

**Lösning:**
- Prompten i `rag/engine.py` är redan uppdaterad för att vara mjukare
- BASE_STYLE_INSTRUCTIONS har "SÄKERHET I SVAR"-sektion som uppmuntrar att svara när relevant info finns
- Om problemet kvarstår, granska prompten och mjuka upp den ytterligare

## Mätning av "no answer"-frekvens

Systemet loggar nu automatiskt när "jag hittar inte..." används:

```bash
# Kolla loggarna för no_answer frequency
grep '"no_answer":true' logs/rag_queries.jsonl | wc -l

# Se alla no_answer cases
grep '"no_answer":true' logs/rag_queries.jsonl
```

**KPI:**
- **10% av frågor → no_answer** är rimligt om många frågor faktiskt inte finns i dokumenten
- **>20% no_answer** kan indikera att prompten är för strikt eller retrieval fungerar dåligt

## Verklighetstest

### Steg 1: Förbered ett riktigt dokument

Lägg ett policy/avtal/manual i `my_docs/`:

```bash
# Skapa policy workspace
mkdir -p my_docs/policy
cp ditt_policy.pdf my_docs/policy/
```

### Steg 2: Indexera dokumentet

```bash
python -m cli.chat_cli --docs_dir "./my_docs/policy" --workspace policy --mode answer "test"
```

### Steg 3: Testa med debug

```bash
python -m cli.chat_cli --workspace policy --mode answer --verbose "Vad är uppsägningstiden enligt policyn?"
```

### Steg 4: Analysera output

Titta på:
1. `[DEBUG]`-raderna → Ser du exakt den text där svaret står?
2. Svaret → Svarar modellen tydligt, eller säger den "jag hittar inte..."?

Om retrieval träffar rätt chunk + prompt/logik är på plats → ska vara "grönt" ✅

## Golden Tests

Golden tests har nu stöd för `allow_no_answer: true` cases.

Exempel i `evaluation/data/rag_golden.jsonl`:

```json
{"id": "no_answer_policy", "query": "Vad är vår policy för tjänstebilar?", "workspace": "default", "doc_ids": [], "expected_sources": [], "must_have_keywords": [], "nice_to_have_keywords": [], "forbidden_keywords": [], "difficulty": "easy", "tags": ["no_answer", "policy"], "allow_no_answer": true}
```

**Logik:**
- `allow_no_answer: true` → Acceptera "Jag hittar inte..." som korrekt svar (Diamond tier)
- `allow_no_answer: false` (default) → "Jag hittar inte..." är forbidden keyword

Kör golden eval:

```bash
python -m evaluation.golden_eval --workspace default
```

Om något case ger "Jag hittar inte..." trots att svaret finns → du ser det direkt och kan justera prompt/retriever.

## Sammanfattning

**Du har nu:**
- ✅ Debug-logging på retrieval (aktivera med `--verbose`)
- ✅ Mjukare, vettigare "våga svara"-prompt
- ✅ BASE_STYLE_INSTRUCTIONS med säkerhetsdel
- ✅ Mätbar "no answer"-frekvens i loggar
- ✅ Golden tests som testar "no answer" specifikt

**Resultat:**
- Alla "vanliga" fall → "Jag hittar inte..." är forbidden (testas automatiskt)
- Specifika "unknown"-tester → "Jag hittar inte..." är korrekt beteende (testas automatiskt)
- Du kan se om systemet blir för fegt eller för kaxigt via loggar

