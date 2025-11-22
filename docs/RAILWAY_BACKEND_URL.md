# 🚂 Railway Backend URL Reference

## Backend URL

Din FastAPI-backend kör på:
```
https://rag-sintari-production.up.railway.app
```

## ⚠️ Viktigt: Sintari.se vs Railway

### sintari.se → Frontend (Vercel/Next.js)
- Detta är din frontend-applikation
- `/api/*` är Next.js API routes, inte FastAPI-endpoints
- Om ingen route matchar → returnerar `index.html` (SPA fallback)

### Railway → Backend (FastAPI)
- Detta är din FastAPI-backend
- Alla `/debug-workspace`, `/query`, `/health` etc. finns här
- Returnerar JSON direkt

## 🔧 Testa API-endpoints

### Testa /debug-workspace

**PowerShell:**
```powershell
# Korrekt: Använd Railway-URL direkt (publikt, ingen auth krävs)
$response = Invoke-WebRequest -Uri "https://rag-sintari-production.up.railway.app/debug-workspace?workspace=default"
$response.Content | ConvertFrom-Json

# Med API key (om RAG_DEBUG_API_KEY är satt i Railway)
$apiKey = "YOUR_API_KEY"
$response = Invoke-WebRequest -Uri "https://rag-sintari-production.up.railway.app/debug-workspace?workspace=default&api_key=$apiKey"
$response.Content | ConvertFrom-Json
```

**cURL:**
```bash
# Publikt (ingen auth)
curl "https://rag-sintari-production.up.railway.app/debug-workspace?workspace=default"

# Med API key (om RAG_DEBUG_API_KEY är satt)
curl "https://rag-sintari-production.up.railway.app/debug-workspace?workspace=default&api_key=YOUR_API_KEY"
```

**OBS:** `/debug-workspace` är nu **publikt** för debugging (ingen auth krävs). 

För säkerhet i produktion (optional):
- Sätt env var `RAG_DEBUG_API_KEY` i Railway
- Använd `?api_key=YOUR_KEY` i URL:en för att skydda endpointen

Om `RAG_DEBUG_API_KEY` inte är satt → endpointen är helt publikt tillgänglig.
Om `RAG_DEBUG_API_KEY` är satt → måste `api_key` param matcha.

**Förväntat resultat (JSON):**
```json
{
  "workspace": "default",
  "documents": [
    {
      "id": "...",
      "name": "7.54-IT-och-informationssakerhetspolicy-1.pdf",
      "version": 1234567890,
      "chunk_count": 8
    }
  ],
  "chunks": 8,
  "last_indexed": "2025-01-15 14:30:00",
  "index_source": "cached"
}
```

**Fel resultat (om du använder sintari.se):**
```html
<!doctype html>
<html lang="sv">
  <head>
    <title>RAG Frontend</title>
    ...
```
→ Detta betyder att du använder fel URL (sintari.se istället för Railway-URL).

### Testa /health

```powershell
# PowerShell
iwr "https://rag-sintari-production.up.railway.app/health"

# cURL
curl "https://rag-sintari-production.up.railway.app/health"
```

**Förväntat resultat:**
```json
{
  "status": "healthy",
  "workspace": "default",
  "indexed_chunks": 8,
  "version": "1.0.0"
}
```

### Testa /query

```powershell
# PowerShell
$body = @{
    query = "Vad är syftet med IT-policyn?"
    workspace = "default"
    mode = "answer"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer YOUR_TOKEN"
}

iwr -Uri "https://rag-sintari-production.up.railway.app/query" `
    -Method POST `
    -Body $body `
    -Headers $headers
```

## 🔄 Frontend använder Railway-URL

Frontend är konfigurerad att använda Railway-URL för API-anrop:

**Konfiguration:**
- `frontend/src/api/client.ts` använder `https://rag-sintari-production.up.railway.app` i produktion
- `VITE_RAG_API_URL` env var kan override:a detta om nödvändigt

**Detta betyder:**
- Frontend → anropar Railway-backend direkt (inte via sintari.se)
- Det fungerar eftersom frontend använder rätt URL
- Men om du testar manuellt från browser → sintari.se/api/... → fungerar INTE

## 🎯 Lösning för framtiden (Optional)

För att kunna använda `sintari.se/api/debug-workspace` kan du sätta upp en Vercel-rewrite:

**vercel.json:**
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://rag-sintari-production.up.railway.app/:path*"
    }
  ]
}
```

Eller i **next.config.js:**
```javascript
module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://rag-sintari-production.up.railway.app/:path*',
      },
    ];
  },
};
```

Då fungerar:
- `sintari.se/api/debug-workspace` → proxys till Railway-backend
- `sintari.se/api/query` → proxys till Railway-backend
- etc.

**Men för nu:**
- Använd Railway-URL direkt för manuella tester
- Frontend använder redan Railway-URL automatiskt

## 📝 Sammanfattning

| URL | Vad det är | Fungerar för API? |
|-----|------------|-------------------|
| `sintari.se` | Frontend (Vercel) | ❌ Nej (returnerar HTML) |
| `rag-sintari-production.up.railway.app` | Backend (Railway) | ✅ Ja (returnerar JSON) |

**Använd alltid Railway-URL för manuella API-tester!**

