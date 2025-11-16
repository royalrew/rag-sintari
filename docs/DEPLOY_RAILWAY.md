# Deploy Backend till Railway

## Snabbstart

1. **Push till GitHub** (om inte redan gjort):
   ```bash
   git add Dockerfile railway.toml .dockerignore
   git commit -m "feat: add Railway deployment config"
   git push
   ```

2. **I Railway Dashboard**:
   - Skapa nytt projekt → "Deploy from GitHub repo"
   - Välj ditt repo
   - Railway kommer automatiskt känna igen Dockerfile

3. **Sätt Environment Variables**:
   - `OPENAI_API_KEY` = din OpenAI-nyckel
   - `PORT` = sätts automatiskt av Railway (behöver inte sättas manuellt)

4. **Vänta på deploy** → Railway ger dig en URL som `https://rag-sintari.up.railway.app`

5. **Testa**:
   ```bash
   curl https://rag-sintari.up.railway.app/health
   ```

## Koppla Frontend (Vercel)

I Vercel Project Settings → Environment Variables:
- `VITE_RAG_API_URL` = `https://rag-sintari.up.railway.app`

## Troubleshooting

**"Error creating build plan"**:
- ✅ Kontrollera att `Dockerfile` finns i root
- ✅ Kontrollera att `railway.toml` finns i root
- ✅ Kontrollera att `requirements.txt` finns i root

**Backend startar inte**:
- Kolla Railway logs → `railway logs`
- Kontrollera att `OPENAI_API_KEY` är satt
- Kontrollera att port matchar: Railway sätter `PORT` env var

**Health check failar**:
- Kontrollera att `/health` endpoint fungerar lokalt
- Kolla Railway logs för fel

## Lokal test av Docker

```bash
# Bygg image
docker build -t rag-backend .

# Kör lokalt
docker run -p 8000:8000 -e OPENAI_API_KEY=sk-... rag-backend

# Testa
curl http://localhost:8000/health
```

