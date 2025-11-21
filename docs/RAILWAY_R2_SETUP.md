# Railway + Cloudflare R2 Setup

## Problem: Dokument sparas inte i R2 på Railway

### Orsak
R2-miljövariabler är inte konfigurerade på Railway, så dokument sparas lokalt på Railway istället för i Cloudflare R2.

### Lösning: Sätt R2-miljövariabler på Railway

#### 1. Hämta R2-credentials från Cloudflare Dashboard

1. Gå till Cloudflare Dashboard → R2
2. Välj din bucket: `sintari-docs`
3. Gå till "Manage R2 API Tokens"
4. Skapa en ny API token med:
   - **Permissions**: Object Read & Write
   - **Bucket**: `sintari-docs`
   - **TTL**: Anpassa efter behov

5. Kopiera:
   - **Access Key ID**
   - **Secret Access Key**

#### 2. Hämta R2 Endpoint URL

R2 Endpoint URL är:
```
https://<account-id>.r2.cloudflarestorage.com
```

Eller hitta den i Cloudflare Dashboard → R2 → din bucket → Settings.

#### 3. Sätt miljövariabler på Railway

**Via Railway Dashboard:**

1. Gå till ditt Railway-projekt
2. Välj din service (backend)
3. Gå till "Variables" tab
4. Lägg till följande variabler:

```
R2_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<din-access-key-id>
R2_SECRET_ACCESS_KEY=<din-secret-access-key>
R2_BUCKET_NAME=sintari-docs
```

**Via Railway CLI:**

```bash
railway variables set R2_ENDPOINT_URL="https://<account-id>.r2.cloudflarestorage.com"
railway variables set R2_ACCESS_KEY_ID="<din-access-key-id>"
railway variables set R2_SECRET_ACCESS_KEY="<din-secret-access-key>"
railway variables set R2_BUCKET_NAME="sintari-docs"
```

#### 4. Verifiera konfiguration

Efter att ha satt variablerna:

1. **Redeploy service på Railway** (variabler laddas vid start)
2. **Kontrollera server logs** - du ska se:
   ```
   [r2_client] Connected to R2 bucket: sintari-docs
   ```
3. **Testa upload** - ladda upp ett dokument
4. **Kontrollera Cloudflare R2 Dashboard** - dokumentet ska synas i `user_1/` mappen

### Felsökning

#### Problem: "R2 är inte konfigurerat" i logs

**Orsak:** Miljövariabler är inte satta eller laddas inte.

**Lösning:**
1. Kontrollera att alla 4 variabler är satta på Railway
2. Kontrollera att variabelnamnen är exakt rätt (case-sensitive)
3. Redeploy service efter att ha satt variabler

#### Problem: "Kunde inte ladda upp fil" error

**Orsak:** R2-credentials är felaktiga eller bucket finns inte.

**Lösning:**
1. Verifiera Access Key ID och Secret Access Key
2. Kontrollera att bucket-namnet är korrekt: `sintari-docs`
3. Kontrollera att API token har rätt permissions

#### Problem: Dokument syns inte i R2 Dashboard

**Orsak:** Upload misslyckades tyst eller filen sparas på fel plats.

**Lösning:**
1. Kontrollera server logs för felmeddelanden
2. Verifiera att `storage_key` returneras i API-response
3. Kontrollera R2 Dashboard → `sintari-docs` → `user_1/` mappen

### Verifiering

Efter setup, testa:

```bash
# 1. Ladda upp ett dokument via UI
# 2. Kontrollera API response - ska innehålla storage_key
# 3. Kontrollera Cloudflare R2 Dashboard
# 4. Dokumentet ska synas i user_1/ mappen
```

### Checklista

- [ ] R2_ENDPOINT_URL satt på Railway
- [ ] R2_ACCESS_KEY_ID satt på Railway
- [ ] R2_SECRET_ACCESS_KEY satt på Railway
- [ ] R2_BUCKET_NAME satt på Railway (sintari-docs)
- [ ] Service redeployad efter variabel-ändringar
- [ ] Server logs visar "[r2_client] Connected to R2 bucket"
- [ ] Test-upload fungerar
- [ ] Dokument syns i Cloudflare R2 Dashboard

