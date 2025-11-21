# Fix: Dokument sparas inte i Cloudflare R2

## Problem
Nya dokument som laddas upp sparas på Railway istället för i Cloudflare R2.

## Orsak
R2-miljövariabler är inte konfigurerade på Railway, så systemet kan inte ansluta till R2.

## Lösning

### Steg 1: Hämta R2-credentials från Cloudflare

1. Gå till [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Välj **R2** → **sintari-docs** bucket
3. Gå till **Manage R2 API Tokens**
4. Skapa ny token eller använd befintlig
5. Kopiera:
   - **Access Key ID**
   - **Secret Access Key**
   - **Endpoint URL** (t.ex. `https://<account-id>.r2.cloudflarestorage.com`)

### Steg 2: Sätt miljövariabler på Railway

**Via Railway Dashboard:**

1. Gå till ditt Railway-projekt
2. Välj din backend-service
3. Gå till **Variables** tab
4. Lägg till dessa 4 variabler:

```
R2_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<din-access-key-id>
R2_SECRET_ACCESS_KEY=<din-secret-access-key>
R2_BUCKET_NAME=sintari-docs
```

**Viktigt:**
- Variabelnamnen måste vara exakt rätt (case-sensitive)
- `R2_BUCKET_NAME` ska vara `sintari-docs` (utan https:// eller path)

### Steg 3: Redeploy

Efter att ha satt variablerna:

1. **Redeploy service** på Railway (variabler laddas vid start)
2. Vänta på att deployment är klar

### Steg 4: Verifiera

**Kontrollera server logs:**
Du ska se:
```
[r2_client] Connected to R2 bucket: sintari-docs
```

**Om du ser:**
```
[r2_client] VARNING: R2-miljövariabler saknas. R2-funktionalitet är inaktiverad.
```
→ Variablerna är inte korrekt satta. Kontrollera igen.

**Testa upload:**
1. Ladda upp ett dokument via UI
2. Kontrollera Cloudflare R2 Dashboard → `sintari-docs` → `user_1/`
3. Dokumentet ska synas där

### Felsökning

#### "R2 är inte konfigurerat" i API-response
- Kontrollera att alla 4 variabler är satta
- Kontrollera att variabelnamnen är exakt rätt
- Redeploy service

#### "Kunde inte ladda upp fil" error
- Kontrollera R2-credentials (Access Key ID, Secret Access Key)
- Kontrollera att bucket-namnet är korrekt: `sintari-docs`
- Kontrollera att API token har rätt permissions (Object Read & Write)

#### Dokument syns inte i R2 Dashboard
- Kontrollera server logs för fel
- Verifiera att `storage_key` returneras i API-response
- Kontrollera R2 Dashboard → `sintari-docs` → `user_1/` mappen

### Verifiering

Efter fix, testa:

```bash
# 1. Ladda upp dokument via UI
# 2. Kontrollera API response - ska innehålla storage_key som "user_1/xxxxx_filename.pdf"
# 3. Kontrollera Cloudflare R2 Dashboard
# 4. Dokumentet ska synas i user_1/ mappen
```

### Checklista

- [ ] R2_ENDPOINT_URL satt på Railway
- [ ] R2_ACCESS_KEY_ID satt på Railway  
- [ ] R2_SECRET_ACCESS_KEY satt på Railway
- [ ] R2_BUCKET_NAME=sintari-docs satt på Railway
- [ ] Service redeployad
- [ ] Server logs visar "[r2_client] Connected to R2 bucket"
- [ ] Test-upload fungerar
- [ ] Dokument syns i Cloudflare R2 Dashboard

