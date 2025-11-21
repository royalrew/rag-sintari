# Felsökning - Online/Produktion

## Problem: RAG-systemet ger felaktiga svar eller hittar inte dokument

### Snabbdiagnos

#### 1. Kontrollera att dokument är indexerat

**Via API:**
```bash
# Lista alla dokument
GET /documents
Authorization: Bearer YOUR_TOKEN
```

**Kontrollera:**
- Är dokumentet med i listan?
- Har dokumentet rätt filnamn?
- När laddades det upp?

#### 2. Testa query med verbose mode

```bash
POST /query
{
  "query": "Sammanfatta ROADMAP.md",
  "workspace": "default",
  "verbose": true
}
```

**Kontrollera i response:**
- Vilka dokument hittades?
- Vilka chunks användes?
- Vilka scores fick chunks?

#### 3. Verifiera workspace

**Problem:** Varje workspace har sitt eget index.

**Lösning:**
- Kontrollera att du söker i rätt workspace
- Standard workspace är "default"
- Dokument måste vara i samma workspace som query

### Vanliga problem och lösningar

#### Problem 1: "Jag hittar inte svaret i källorna"

**Orsak:** Dokumentet är inte indexerat eller är i fel workspace.

**Lösning:**
1. Ladda upp dokumentet igen via `/documents/upload`
2. Vänta på att indexering är klar
3. Testa query igen

#### Problem 2: Systemet hittar fel dokument

**Orsak:** 
- Flera dokument med liknande innehåll
- Retrieval hittar fel dokument baserat på similarity

**Lösning:**
1. Använd `doc_ids` parameter för att filtrera:
```json
{
  "query": "Sammanfatta T100",
  "doc_ids": ["T100.docx"]
}
```

2. Använd mer specifika frågor:
   - ❌ "Sammanfatta dokumentet"
   - ✅ "Sammanfatta T100.docx innehåll om personer och belopp"

#### Problem 3: Systemet ger svar om fel projekt (t.ex. "DataCleaner Pro")

**Orsak:** 
- Indexet innehåller dokument från flera projekt
- Retrieval hittar fel dokument baserat på keyword matching

**Lösning:**
1. **Använd workspace-separation:**
   - Skapa separata workspaces för olika projekt
   - Ladda upp dokument till rätt workspace

2. **Använd document filtering:**
   - Använd `doc_ids` för att begränsa sökningen
   - Lista dokument först: `GET /documents`
   - Använd specifika document IDs i query

3. **Förbättra frågan:**
   - Inkludera projektnamn i frågan
   - T.ex: "Sammanfatta RAG-systemets roadmap" istället för "Sammanfatta roadmap"

### Best Practices för Online-system

#### 1. Workspace-organisering

**Rekommendation:**
- Använd separata workspaces för olika projekt/klienter
- T.ex: `workspace: "rag-project"` för RAG-dokument
- T.ex: `workspace: "client-abc"` för kunddokument

#### 2. Dokumentnamn

**Rekommendation:**
- Använd beskrivande, unika filnamn
- T.ex: `RAG_ROADMAP.md` istället för `ROADMAP.md`
- Undvik generiska namn som kan matcha flera projekt

#### 3. Query-formulering

**Bra frågor:**
- ✅ "Vad står i RAG-systemets roadmap om MVP-fasen?"
- ✅ "Sammanfatta T100.docx innehåll om personer"
- ✅ "Vilka filformat stöder RAG-systemet enligt dokumentationen?"

**Dåliga frågor:**
- ❌ "Sammanfatta roadmap"
- ❌ "Vad står i dokumentet?"
- ❌ "Sammanfatta T100"

#### 4. Verifiera indexering

**Efter upload:**
1. Vänta några sekunder för indexering
2. Kontrollera `/documents` att dokumentet finns
3. Testa en enkel query först
4. Använd `verbose: true` för att se vad som hittas

### Debugging i produktion

#### Aktivera verbose mode

```json
POST /query
{
  "query": "din fråga",
  "workspace": "default",
  "verbose": true
}
```

**Response innehåller:**
- Vilka chunks som hittades
- Deras similarity scores
- Vilka dokument de kommer från

#### Kontrollera health

```bash
GET /health
```

**Kontrollera:**
- `indexed_chunks` - hur många chunks finns i indexet?
- `workspace` - vilket workspace är aktivt?

### Exempel: Korrekt användning

```bash
# 1. Ladda upp dokument
POST /documents/upload
Content-Type: multipart/form-data
Authorization: Bearer TOKEN
file: T100.docx

# 2. Verifiera att dokument är indexerat
GET /documents
Authorization: Bearer TOKEN
# Kontrollera att T100.docx finns i listan

# 3. Ställ specifik fråga
POST /query
{
  "query": "Vilka personer finns i T100.docx och vilka belopp är kopplade till dem?",
  "workspace": "default",
  "doc_ids": ["T100.docx"],
  "verbose": true
}
```

### Om problemet kvarstår

1. **Kontrollera server logs:**
   - Se om det finns fel vid indexering
   - Kontrollera om retrieval fungerar

2. **Testa med CLI lokalt:**
   ```bash
   python -m cli.chat_cli "din fråga" --workspace default --verbose
   ```

3. **Re-indexera:**
   - Ta bort dokumentet
   - Ladda upp igen
   - Vänta på indexering

4. **Kontakta support:**
   - Inkludera query, workspace, och dokumentnamn
   - Inkludera verbose response om möjligt

