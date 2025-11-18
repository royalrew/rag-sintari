# Debugging API på mobil (via internet)

## Problem: API-test fungerar på desktop men inte på mobil

### Möjliga orsaker

1. **BASE_URL är fel i production**
   - Frontend använder `localhost:8000` istället för Railway-URL
   - Lösning: Sätt `VITE_RAG_API_URL` i Vercel environment variables

2. **CORS-problem**
   - Railway-backend tillåter inte din frontend-domän
   - Lösning: Uppdatera `CORS_ALLOWED_ORIGINS` på Railway

3. **Nätverksfel**
   - Mobilnätverk har längre latens eller timeout
   - Lösning: Timeout-hantering är redan implementerad (30s GET, 60s POST)

---

## Steg 1: Sätt VITE_RAG_API_URL i Vercel

1. Gå till Vercel Dashboard → Ditt projekt → Settings → Environment Variables
2. Lägg till:
   - **Name**: `VITE_RAG_API_URL`
   - **Value**: `https://rag-sintari-production.up.railway.app`
   - **Environment**: Production (och Preview om du vill)
3. **Viktigt**: Efter att du lagt till variabeln, måste du **redeploy** projektet!
   - Gå till Deployments → Klicka på "..." → Redeploy

### Verifiera att det fungerar

Efter redeploy, öppna konsolen på mobilen och kolla:
```
[API Client] Using VITE_RAG_API_URL: https://rag-sintari-production.up.railway.app
```

Om du ser `auto-detected` istället, så är variabeln inte satt korrekt.

---

## Steg 2: Kontrollera CORS på Railway

1. Gå till Railway Dashboard → Ditt projekt → Variables
2. Kontrollera `CORS_ALLOWED_ORIGINS`:
   - Om den är `*` → ska fungera för alla domäner
   - Om den är specifik → lägg till din Vercel-domän

### Exempel CORS-inställningar

**För utveckling (tillåter alla):**
```
CORS_ALLOWED_ORIGINS=*
```

**För production (specifika domäner):**
```
CORS_ALLOWED_ORIGINS=https://din-app.vercel.app,https://www.din-domän.se
```

**Viktigt**: Efter att du ändrat CORS, måste Railway **redeploy**!

---

## Steg 3: Debugga på mobil

### Öppna konsolen på mobilen

**Android (Chrome):**
1. Anslut telefonen via USB
2. Öppna Chrome på datorn → `chrome://inspect`
3. Klicka på "inspect" under din telefon
4. Öppna Console-fliken

**iOS (Safari):**
1. På iPhone: Settings → Safari → Advanced → Web Inspector (ON)
2. Anslut iPhone via USB till Mac
3. Öppna Safari på Mac → Develop → [Din iPhone] → [Din webbsida]
4. Öppna Console

### Vad ska du leta efter?

När du klickar på testknappen, kolla konsolen för:

1. **BASE_URL:**
   ```
   [API Client] Using VITE_RAG_API_URL: https://rag-sintari-production.up.railway.app
   ```
   Om du ser `localhost:8000` → VITE_RAG_API_URL är inte satt i Vercel

2. **Error messages:**
   ```
   ❌ API test failed: ...
   ❌ Error details: { message: ..., status: ..., data: ... }
   ```

3. **CORS-fel:**
   ```
   Access to fetch at 'https://...' from origin 'https://...' has been blocked by CORS policy
   ```
   → CORS är inte korrekt konfigurerad på Railway

4. **Timeout:**
   ```
   Request timeout - servern svarade inte i tid
   ```
   → Backend svarar för långsamt eller är offline

5. **Nätverksfel:**
   ```
   Nätverksfel - kontrollera din internetanslutning
   ```
   → Mobilnätverk eller backend är offline

---

## Steg 4: Testa backend direkt från mobilen

Öppna webbläsaren på mobilen och gå till:
```
https://rag-sintari-production.up.railway.app/health
```

Du ska se:
```json
{
  "status": "ok",
  "workspace": "default",
  "indexed_chunks": 0,
  "version": "1.0.0"
}
```

Om detta inte fungerar → Backend är offline eller nätverksproblem.

---

## Checklista

- [ ] `VITE_RAG_API_URL` är satt i Vercel environment variables
- [ ] Vercel-projektet är redeployat efter att variabeln lades till
- [ ] `CORS_ALLOWED_ORIGINS` är korrekt på Railway (eller `*`)
- [ ] Railway-backend är online (testa `/health` direkt)
- [ ] Konsolen på mobilen visar rätt BASE_URL
- [ ] Inga CORS-fel i konsolen
- [ ] Backend svarar inom timeout (30s för GET, 60s för POST)

---

## Vanliga fel och lösningar

### Fel: "Failed to fetch"
**Orsak**: CORS-problem eller backend offline
**Lösning**: 
- Kontrollera CORS på Railway
- Testa `/health` direkt från mobilen

### Fel: "Request timeout"
**Orsak**: Backend svarar för långsamt
**Lösning**: 
- Kontrollera att Railway-backend är online
- Kolla Railway logs för fel

### Fel: BASE_URL är localhost
**Orsak**: VITE_RAG_API_URL är inte satt i Vercel
**Lösning**: 
- Sätt variabeln i Vercel
- Redeploy projektet

### Fel: CORS policy blocked
**Orsak**: Railway tillåter inte din frontend-domän
**Lösning**: 
- Uppdatera `CORS_ALLOWED_ORIGINS` på Railway
- Inkludera din Vercel-domän
- Redeploy Railway

---

## Ytterligare debugging

Om problemet kvarstår, samla in denna information:

1. **Konsol-logg från mobilen:**
   - BASE_URL som används
   - Exakt felmeddelande
   - Stack trace (om finns)

2. **Network tab i DevTools:**
   - Vilken URL som anropas
   - HTTP status code
   - Response headers (särskilt CORS-headers)

3. **Railway logs:**
   - Ser du requesten komma in?
   - Vilket fel returneras?

4. **Vercel deployment:**
   - Vilken domän används?
   - Är `VITE_RAG_API_URL` satt i environment variables?

