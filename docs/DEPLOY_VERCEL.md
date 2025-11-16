# Deploy Frontend to Vercel (sintari.se)

## Prerequisites
- Vercel account
- Repo with `frontend/` (Vite + index.html + package.json)
- Custom domain: `sintari.se`

## 1) Import project
1. Go to https://vercel.com → New Project → Import your repo
2. Set **Root Directory**: `frontend/`
3. Framework: **Vite**
4. Build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. (Optional, later) Environment Variables:
   - `VITE_RAG_API_URL=https://<your-railway-app>.up.railway.app`
6. Deploy

## 2) Add custom domain
1. Project → Settings → **Domains** → Add `sintari.se` (and `www.sintari.se`)
2. DNS records (if using your current DNS registrar):
   - Apex (root): `A` record → `76.76.21.21`
   - `www`: `CNAME` → `cname.vercel-dns.com.`
3. Wait 5–15 minutes until SSL shows **Active**

## 3) Verify
- Open `https://sintari.se` (and `https://www.sintari.se`)
- Hard refresh (Ctrl+F5) if needed

## 4) (Later) Connect to backend
- In Vercel → Project → Settings → **Environment Variables**:
  - `VITE_RAG_API_URL=https://<your-railway-app>.up.railway.app`
- Re-deploy the project

## Notes
- `frontend/vercel.json` includes SPA rewrite and security headers
- For local dev, run:
  ```powershell
  cd frontend
  $env:VITE_RAG_API_URL = "http://127.0.0.1:8000"
  npm run dev
  ```
