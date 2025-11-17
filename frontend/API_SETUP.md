# RAG API Setup Guide

## Konfiguration

### 1. Skapa `.env.local` fil

Skapa en `.env.local` fil i `frontend/` mappen med följande innehåll:

```env
# RAG API Base URL
# För lokal utveckling: http://localhost:8000
# För produktion (Railway): https://rag-sintari-production.up.railway.app
VITE_RAG_API_URL=https://rag-sintari-production.up.railway.app
```

### 2. Verifiera att API-klienten fungerar

1. Starta frontend: `npm run dev`
2. Gå till Chat-sidan
3. Klicka på test-knappen (🧪) i header
4. Öppna browser console (F12) för att se test-resultat

### 3. API Endpoints

Backend exponerar följande endpoints:

- **GET `/health`** - Health check
- **POST `/query`** - Ställ frågor till RAG-motorn

### 4. CORS-inställningar

Backend är konfigurerad med CORS som tillåter alla origins (`*`) som default. För produktion kan du sätta:

```env
CORS_ALLOWED_ORIGINS=https://din-frontend-domain.com,https://www.din-frontend-domain.com
```

## Användning

### I kod

```typescript
import { queryRAG, checkRAGHealth } from '@/api/ragClient';

// Health check
const health = await checkRAGHealth();
console.log(health);

// Query
const response = await queryRAG({
  query: 'Vad stöder RAG-motorn?',
  workspace: 'default',
  mode: 'answer',
});
console.log(response.answer, response.sources);
```

### Via chat.ts

```typescript
import { askQuestion } from '@/api/chat';

const { answer } = await askQuestion({
  question: 'Min fråga',
  workspaceId: 'default',
});
```

## Felsökning

### CORS-fel

Om du får CORS-fel:

1. Kontrollera att backend körs och är tillgänglig
2. Verifiera att `CORS_ALLOWED_ORIGINS` är korrekt konfigurerad
3. Kontrollera browser console för detaljerade felmeddelanden

### Connection errors

- Verifiera att `VITE_RAG_API_URL` är korrekt i `.env.local`
- Kontrollera att Railway-backend är online
- Testa `/health` endpoint direkt i browser eller curl

### Exempel curl-kommando

```bash
curl https://rag-sintari-production.up.railway.app/health
```

