# Debug: Dokument sparas inte i R2 på Railway

## Snabbdiagnos

### 1. Kontrollera Railway Logs

Efter att ha laddat upp ett dokument, kolla Railway logs:

**Du ska se:**
```
[r2_client] Connected to R2 bucket: sintari-docs
[upload] Upload till Cloudflare R2 lyckades
```

**Om du ser:**
```
[r2_client] VARNING: R2-miljövariabler saknas
```
→ Variablerna är inte korrekt laddade på Railway

**Om du ser:**
```
[upload] Error: Kunde inte ladda upp fil: ...
```
→ Kolla felmeddelandet för detaljer

### 2. Verifiera Variabelvärden

I Railway Dashboard → Variables, kontrollera:

- **R2_ENDPOINT_URL**: Ska vara `https://<account-id>.r2.cloudflarestorage.com`
  - Format: `https://6f418aec5dc253d04a44273ef028d044.r2.cloudflarestorage.com`
  - INTE: `https://sintari-docs.r2...` (bucket-namnet ska INTE vara i URL:en)

- **R2_BUCKET_NAME**: Ska vara bara `sintari-docs` (utan path eller URL)

- **R2_ACCESS_KEY_ID** och **R2_SECRET_ACCESS_KEY**: Ska matcha dina Cloudflare credentials

### 3. Testa Upload via API

```bash
# 1. Logga in
curl -X POST https://rag-sintari-production.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"din@email.com","password":"ditt-lösenord"}'

# 2. Ladda upp dokument (använd token från steg 1)
curl -X POST https://rag-sintari-production.up.railway.app/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.pdf"
```

**Kontrollera response:**
- Ska innehålla `"storage_key": "user_1/xxxxx_test.pdf"`
- Om du får `503: R2 storage är inte tillgängligt` → R2 är inte konfigurerat

### 4. Kontrollera Cloudflare R2 Dashboard

1. Gå till Cloudflare Dashboard → R2 → sintari-docs
2. Kolla i `user_1/` mappen
3. Nya dokument ska synas där

### 5. Om Dokument Fortfarande Inte Syns i R2

**Möjliga orsaker:**

1. **R2-credentials är felaktiga**
   - Skapa ny API token i Cloudflare
   - Uppdatera R2_ACCESS_KEY_ID och R2_SECRET_ACCESS_KEY på Railway
   - Redeploy

2. **R2_ENDPOINT_URL är fel**
   - Kontrollera att det är rätt account-id
   - Format: `https://<account-id>.r2.cloudflarestorage.com`

3. **Bucket-namnet är fel**
   - Ska vara exakt: `sintari-docs`
   - Kontrollera i Cloudflare Dashboard

4. **Service inte redeployad**
   - Variabler laddas bara vid start
   - Redeploy service efter variabel-ändringar

### 6. Verifiera att R2 Faktiskt Används

Kontrollera API-response vid upload:
```json
{
  "ok": true,
  "document": {
    "storage_key": "user_1/xxxxx_filename.pdf"  // <-- Detta betyder att filen är i R2
  }
}
```

Om `storage_key` börjar med `user_1/` → Filen är i R2 ✅

### Checklista

- [ ] R2-variabler är satta på Railway
- [ ] R2_ENDPOINT_URL har rätt format (med account-id)
- [ ] R2_BUCKET_NAME är exakt `sintari-docs`
- [ ] Service redeployad efter variabel-ändringar
- [ ] Railway logs visar "[r2_client] Connected to R2 bucket"
- [ ] API-response innehåller `storage_key` med `user_1/` prefix
- [ ] Dokument syns i Cloudflare R2 Dashboard → sintari-docs → user_1/

