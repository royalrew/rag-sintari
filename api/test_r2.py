"""Test script to verify R2 configuration."""
import os
from dotenv import load_dotenv

load_dotenv()

print("=== R2 Configuration Check ===\n")

R2_ENDPOINT_URL = os.getenv("R2_ENDPOINT_URL")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME")

print(f"R2_ENDPOINT_URL: {R2_ENDPOINT_URL[:50] + '...' if R2_ENDPOINT_URL and len(R2_ENDPOINT_URL) > 50 else R2_ENDPOINT_URL}")
print(f"R2_ACCESS_KEY_ID: {'SET' if R2_ACCESS_KEY_ID else 'MISSING'} ({len(R2_ACCESS_KEY_ID) if R2_ACCESS_KEY_ID else 0} chars)")
print(f"R2_SECRET_ACCESS_KEY: {'SET' if R2_SECRET_ACCESS_KEY else 'MISSING'} ({len(R2_SECRET_ACCESS_KEY) if R2_SECRET_ACCESS_KEY else 0} chars)")
print(f"R2_BUCKET_NAME: {R2_BUCKET_NAME}\n")

R2_CONFIGURED = all([
    R2_ENDPOINT_URL,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME
])

if not R2_CONFIGURED:
    print("[ERROR] R2 ar INTE konfigurerat - nagra variabler saknas")
    missing = []
    if not R2_ENDPOINT_URL: missing.append("R2_ENDPOINT_URL")
    if not R2_ACCESS_KEY_ID: missing.append("R2_ACCESS_KEY_ID")
    if not R2_SECRET_ACCESS_KEY: missing.append("R2_SECRET_ACCESS_KEY")
    if not R2_BUCKET_NAME: missing.append("R2_BUCKET_NAME")
    print(f"   Saknade: {', '.join(missing)}")
else:
    print("[OK] Alla R2-variabler ar satta")
    
    # Test connection
    try:
        import boto3
        from botocore.client import Config
        
        session = boto3.session.Session()
        s3_client = session.client(
            "s3",
            endpoint_url=R2_ENDPOINT_URL,
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_ACCESS_KEY,
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )
        
        # Test: Try to upload a small test file
        import io
        test_content = b"Test file for R2 verification"
        test_key = "test/verification.txt"
        
        try:
            s3_client.upload_fileobj(
                Fileobj=io.BytesIO(test_content),
                Bucket=R2_BUCKET_NAME,
                Key=test_key,
                ExtraArgs={"ContentType": "text/plain"},
            )
            print(f"[OK] R2-anslutning fungerar!")
            print(f"   Test-fil uppladdad till: {test_key}")
            
            # Clean up: Delete test file
            try:
                s3_client.delete_object(Bucket=R2_BUCKET_NAME, Key=test_key)
                print(f"   Test-fil raderad")
            except:
                pass
                
        except Exception as upload_error:
            print(f"[ERROR] R2-upload misslyckades: {upload_error}")
            print(f"   Detta betyder att R2 INTE fungerar korrekt")
            
    except Exception as e:
        print(f"[ERROR] R2-anslutning misslyckades: {e}")

