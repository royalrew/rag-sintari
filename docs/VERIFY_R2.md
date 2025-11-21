# Verifiera R2-konfiguration

## Problem: Dokument sparas inte i R2 trots att variabler är satta

### Steg 1: Kontrollera Railway Logs

Efter att ha redeployat service, kontrollera logs:

**Kör:**
```bash
railway logs
```

**Du ska se:**
```
[r2_client] Connected to R2 bucket: sintari-docs
```

**Om du ser:**
```
[r2_client] VARNING: R2-miljövariabler saknas
```
→ Variablerna är inte korrekt laddade. Kontrollera:
- Är variabelnamnen exakt rätt? (case-sensitive)
- Har du redeployat efter att ha satt variabler?

**Om du ser:**
```
[r2_client] VARNING: Kunde inte initiera R2-klient: <error>
```
→ R2-credentials är felaktiga. Kontrollera:
- R2_ACCESS_KEY_ID är korrekt
- R2_SECRET_ACCESS_KEY är korrekt
- R2_ENDPOINT_URL är korrekt format

### Steg 2: Testa R2-upload direkt

**Via API:**
```bash
# 1. Logga in och få token
POST /auth/login
{
  "email": "din@email.com",
  "password": "ditt-lösenord"
}

# 2. Ladda upp dokument
POST /documents/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
file: <din-fil>
```

**Kontrollera response:**
```json
{
  "ok": true,
  "document": {
    "storage_key": "user_1/xxxxx_filename.pdf"
  }
}
```

**Om du får fel:**
- `503: R2 storage är inte tillgängligt` → R2 är inte konfigurerat
- `500: Kunde inte ladda upp fil` → Kolla server logs för detaljer

### Steg 3: Verifiera i Cloudflare R2 Dashboard

1. Gå till Cloudflare Dashboard → R2 → sintari-docs
2. Kolla i `user_1/` mappen
3. Dokumentet ska synas där med format: `user_1/<uuid>_filename.pdf`

### Steg 4: Kontrollera variabelvärden

**Viktigt:** Kontrollera att variablerna har rätt format:

- `R2_ENDPOINT_URL`: Ska vara `https://<account-id>.r2.cloudflarestorage.com`
  - ❌ INTE: `https://sintari-docs.r2.cloudflarestorage.com`
  - ✅ RÄTT: `https://<ditt-account-id>.r2.cloudflarestorage.com`

- `R2_BUCKET_NAME`: Ska vara bara bucket-namnet
  - ✅ `sintari-docs`
  - ❌ INTE: `https://...` eller med path

- `R2_ACCESS_KEY_ID`: Ska vara din Access Key ID från Cloudflare
- `R2_SECRET_ACCESS_KEY`: Ska vara din Secret Access Key från Cloudflare

### Steg 5: Testa R2-anslutning manuellt

Om du har tillgång till Railway shell:

```python
import os
import boto3
from botocore.client import Config

R2_ENDPOINT_URL = os.getenv("R2_ENDPOINT_URL")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME")

print(f"Endpoint: {R2_ENDPOINT_URL}")
print(f"Bucket: {R2_BUCKET_NAME}")
print(f"Access Key ID: {R2_ACCESS_KEY_ID[:10]}..." if R2_ACCESS_KEY_ID else "MISSING")

# Test connection
try:
    session = boto3.session.Session()
    s3_client = session.client(
        "s3",
        endpoint_url=R2_ENDPOINT_URL,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )
    # List buckets to test connection
    response = s3_client.list_buckets()
    print("✅ R2 connection successful!")
    print(f"Buckets: {[b['Name'] for b in response.get('Buckets', [])]}")
except Exception as e:
    print(f"❌ R2 connection failed: {e}")
```

### Vanliga problem

#### Problem: Variabler är satta men R2 fungerar inte

**Kontrollera:**
1. Har du redeployat service efter att ha satt variabler?
2. Är variabelnamnen exakt rätt? (R2_ENDPOINT_URL, inte R2_ENDPOINT_URLS)
3. Har variablerna rätt värden? (inte tomma strängar)

#### Problem: "Kunde inte initiera R2-klient"

**Orsak:** R2-credentials är felaktiga eller endpoint URL är fel.

**Lösning:**
1. Verifiera Access Key ID och Secret Access Key i Cloudflare Dashboard
2. Kontrollera att Endpoint URL är korrekt format
3. Testa med ny API token om problemet kvarstår

#### Problem: Upload lyckas men fil syns inte i R2

**Kontrollera:**
1. Kolla server logs för felmeddelanden
2. Verifiera att `storage_key` returneras i API-response
3. Kontrollera rätt mapp i R2 Dashboard (`user_1/`)

### Debugging Tips

1. **Aktivera verbose logging:**
   - Kolla Railway logs efter `[r2_client]` meddelanden
   - Kolla efter `[upload]` meddelanden

2. **Testa med curl:**
   ```bash
   curl -X POST https://rag-sintari-production.up.railway.app/documents/upload \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "file=@test.pdf"
   ```

3. **Kontrollera R2 Dashboard:**
   - Gå till Cloudflare → R2 → sintari-docs
   - Kolla `user_1/` mappen
   - Filerna ska ha format: `user_1/<uuid>_filename.pdf`

