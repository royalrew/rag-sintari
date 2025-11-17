# 🚀 Snabbstart - Lokal Utveckling

## Steg 1: Starta Backend

Öppna en terminal i projektroten:

```powershell
# Verifiera att du är i rätt mapp
cd "C:\Users\royal\OneDrive\Skrivbord\Mitt foretag\RAG"

# Starta backend (port 8000)
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

✅ Du ser: `Uvicorn running on http://0.0.0.0:8000`

**Testa:** Öppna `http://localhost:8000/docs` i browser → Swagger UI ska visas

---

## Steg 2: Starta Frontend

Öppna en **ny** terminal:

```powershell
# Gå till frontend-mappen
cd frontend

# Starta dev server
npm run dev
```

✅ Du ser: `Local: http://localhost:8080/`

**Testa:** Öppna `http://localhost:8080` i browser → Frontend ska laddas

---

## Steg 3: Testa Upload

1. **Logga in** i frontend (eller skapa konto)
2. **Gå till Chat-sidan**
3. **Klicka på import-knappen** (📎)
4. **Välj ett dokument** (PDF, TXT, MD, eller DOCX)
5. **Vänta** på "Dokument uppladdat och indexerat!"
6. **Ställ en fråga** om dokumentet
7. **Källor ska visas** i sidebar

---

## ✅ Verifiering

### Backend fungerar?
```powershell
curl http://localhost:8000/health
```

Förväntat:
```json
{"status":"healthy","workspace":"default","indexed_chunks":0,"version":"1.0.0"}
```

### Frontend kan ansluta?
1. Klicka på **test-knappen (🧪)** i Chat-sidan header
2. Öppna **browser console** (F12)
3. Du ska se: `✅ Health check passed` och `✅ Query test passed`

---

## 🔧 Om något inte fungerar

### Backend startar inte
- **Fel:** `ModuleNotFoundError: No module named 'rag'`
  - **Fix:** Kör från projektroten, inte från `api/` mappen
- **Fel:** Port 8000 upptagen
  - **Fix:** Stäng andra processer eller ändra port:
    ```powershell
    python -m uvicorn api.main:app --reload --port 8001
    ```

### Frontend kan inte ansluta
- **Kontrollera:** Backend körs på port 8000
- **Kontrollera:** Browser console för CORS-fel
- **Fix:** Frontend använder automatiskt `localhost:8000` i dev-mode

### Upload snurrar för evigt
- **Kontrollera:** Browser console (F12) för fel
- **Kontrollera:** Backend terminal för felmeddelanden
- **Testa:** Med en mindre fil först (t.ex. en `.txt` fil)

---

## 📝 Tips

- **Hot Reload:** Både backend och frontend har hot reload (starta om behövs inte)
- **Logs:** Backend logs visas i terminalen där du startade uvicorn
- **API Docs:** Besök `http://localhost:8000/docs` för interaktiv dokumentation
- **Browser DevTools:** Använd F12 för att se network requests och fel

---

## 🎯 Nästa steg

När allt fungerar lokalt:
1. Testa upload med olika filtyper
2. Testa queries med olika workspaces
3. När du är nöjd → commit och push
4. Railway och Vercel deployar automatiskt

