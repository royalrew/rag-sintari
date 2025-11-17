# Lokal Utvecklingsmiljö Setup

## Snabbstart

### 1. Backend (FastAPI)

```powershell
# I projektroten
cd "C:\Users\royal\OneDrive\Skrivbord\Mitt foretag\RAG"

# Installera dependencies (om inte redan gjort)
python -m pip install -r requirements.txt

# Starta backend
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

Backend körs nu på: `http://localhost:8000`

**Verifiera:**
- Öppna `http://localhost:8000/docs` i browser (Swagger UI)
- Eller testa: `curl http://localhost:8000/health`

### 2. Frontend (Vite + React)

```powershell
# I frontend-mappen
cd frontend

# Skapa .env.local (första gången)
# Kopiera från .env.local.example eller skapa manuellt:
echo VITE_RAG_API_URL=http://localhost:8000 > .env.local

# Installera dependencies (om inte redan gjort)
npm install

# Starta dev server
npm run dev
```

Frontend körs nu på: `http://localhost:8080` (eller annan port om 8080 är upptagen)

### 3. Testa Upload

1. Öppna `http://localhost:8080` i browser
2. Logga in (eller skapa konto)
3. Gå till Chat-sidan
4. Klicka på import-knappen och välj ett dokument (PDF, TXT, MD, DOCX)
5. Vänta på "Dokument uppladdat och indexerat!"
6. Ställ en fråga om dokumentet

## Felsökning

### Backend startar inte

**Problem:** `ModuleNotFoundError: No module named 'rag'`
- **Lösning:** Kör alltid från projektroten, inte från `api/` mappen

**Problem:** `[Errno 48] Address already in use`
- **Lösning:** Port 8000 är upptagen. Stäng andra processer eller ändra port:
  ```powershell
  python -m uvicorn api.main:app --reload --port 8001
  ```
  (Glöm inte att uppdatera `VITE_RAG_API_URL` i `.env.local`)

### Frontend kan inte ansluta till backend

**Problem:** CORS-fel i browser console
- **Lösning:** Backend tillåter alla origins i dev (`allow_origins=["*"]`), så detta borde inte hända. Om det gör det:
  1. Kontrollera att backend körs på rätt port
  2. Verifiera `VITE_RAG_API_URL` i `.env.local`
  3. Starta om frontend efter ändringar i `.env.local`

**Problem:** `Failed to fetch` eller `Network error`
- **Lösning:** 
  1. Kontrollera att backend körs: `curl http://localhost:8000/health`
  2. Verifiera att `VITE_RAG_API_URL` är korrekt i `.env.local`
  3. Kolla browser console för detaljerade fel

### Upload fungerar inte

**Problem:** "Laddar upp dokument..." snurrar för evigt
- **Lösning:**
  1. Öppna browser console (F12) och kolla för fel
  2. Kontrollera backend logs för felmeddelanden
  3. Verifiera att filen är ett stött format (PDF, TXT, MD, DOCX)
  4. Testa med en mindre fil först

**Problem:** Upload lyckas men källor visas inte
- **Lösning:**
  1. Kontrollera att workspace-namnet matchar (använd "default" för första testet)
  2. Kolla backend logs för indexeringsfel
  3. Testa med test-knappen (🧪) för att verifiera API-anslutning
  4. Ställ en fråga direkt efter upload (engine laddas om automatiskt)

## Verifiera att allt fungerar

### 1. Backend Health Check
```powershell
curl http://localhost:8000/health
```

Förväntat svar:
```json
{
  "status": "healthy",
  "workspace": "default",
  "indexed_chunks": 0,
  "version": "1.0.0"
}
```

### 2. Frontend API Test
1. Öppna frontend i browser
2. Gå till Chat-sidan
3. Klicka på test-knappen (🧪) i header
4. Kolla browser console (F12) för resultat

### 3. Upload Test
1. Ladda upp ett testdokument (t.ex. en `.txt` fil med lite text)
2. Vänta på success-meddelande
3. Ställ en fråga om innehållet i dokumentet
4. Källorna ska visas i sidebar

## Nästa steg

När allt fungerar lokalt:
1. Commit och push ändringar
2. Railway deployar automatiskt backend
3. Vercel deployar automatiskt frontend
4. Uppdatera `VITE_RAG_API_URL` i Vercel environment variables till Railway URL

## Tips

- **Hot Reload:** Både backend (`--reload`) och frontend (`npm run dev`) har hot reload
- **Logs:** Backend logs visas i terminalen där du startade uvicorn
- **Browser DevTools:** Använd F12 för att se network requests och console logs
- **API Docs:** Besök `http://localhost:8000/docs` för interaktiv API-dokumentation

