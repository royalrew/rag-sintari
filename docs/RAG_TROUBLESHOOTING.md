# RAG System - Felsökning

## Problem: Systemet hittar fel dokument eller ger felaktiga svar

### Vanliga orsaker:

1. **Dokument inte indexerat**
   - Dokument måste laddas upp via `/documents/upload` endpoint
   - Indexering sker automatiskt vid upload
   - Kontrollera att dokument faktiskt är indexerat i databasen

2. **Fel workspace**
   - Varje workspace har sitt eget index
   - Standard workspace är "default"
   - Kontrollera att du söker i rätt workspace

3. **Dokument inte i index**
   - Indexet är in-memory och måste byggas om vid varje server-start
   - Dokument måste laddas upp igen efter server-restart
   - Kontrollera `index_cache/` mappen för cached indexes

4. **Felaktig retrieval**
   - Hybrid retrieval kan ge olika resultat beroende på fråga
   - Testa med `verbose=true` för att se vilka chunks som hittas

### Lösningar:

#### 1. Kontrollera indexerade dokument
```bash
# Via API
GET /documents
# Returnerar lista på alla dokument för användaren
```

#### 2. Re-indexera dokument
```bash
# Ladda upp dokument igen via UI eller API
POST /documents/upload
```

#### 3. Testa retrieval direkt
```python
# Via CLI
python -m cli.chat_cli "din fråga" --workspace default --verbose
```

#### 4. Kontrollera workspace
- Standard workspace är "default"
- Varje workspace har sitt eget index
- Kontrollera att dokument är i rätt workspace

### Debugging tips:

1. **Aktivera verbose mode**
   - Lägg till `verbose=true` i query-request
   - Se vilka chunks som hittas och deras scores

2. **Kontrollera källor**
   - Varje svar inkluderar källhänvisningar
   - Kontrollera att källorna är korrekta

3. **Testa med enkla frågor**
   - Börja med enkla, specifika frågor
   - Öka komplexitet gradvis

4. **Kontrollera dokumentformat**
   - PDF, DOCX, TXT, MD stöds
   - CSV/XLSX kräver Pro-plan eller högre

### Exempel på korrekt användning:

```bash
# 1. Ladda upp dokument
curl -X POST http://localhost:8000/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@T100.docx"

# 2. Ställ fråga
curl -X POST http://localhost:8000/query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Sammanfatta T100 dokumentet",
    "workspace": "default",
    "verbose": true
  }'
```

### Om systemet hittar fel dokument:

1. **Kontrollera dokumentnamn**
   - Systemet använder filnamn som identifierare
   - Se till att dokumentnamn är unika

2. **Kontrollera workspace**
   - Varje workspace är isolerad
   - Se till att du söker i rätt workspace

3. **Re-indexera**
   - Ta bort och ladda upp dokument igen
   - Detta bygger om indexet

