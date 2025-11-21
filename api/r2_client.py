"""Cloudflare R2 client for file storage."""
import os
import uuid
from typing import BinaryIO, Optional

from dotenv import load_dotenv
import boto3
from botocore.client import Config

# Ladda .env-fil lokalt
load_dotenv()

R2_ENDPOINT_URL = os.getenv("R2_ENDPOINT_URL")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME")

# Validera att alla R2-variabler finns
R2_CONFIGURED = all([
    R2_ENDPOINT_URL,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME
])

s3_client: Optional[object] = None

if R2_CONFIGURED:
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
        print(f"[r2_client] Connected to R2 bucket: {R2_BUCKET_NAME}")
    except Exception as e:
        print(f"[r2_client] VARNING: Kunde inte initiera R2-klient: {e}")
        s3_client = None
else:
    print("[r2_client] VARNING: R2-miljövariabler saknas. R2-funktionalitet är inaktiverad.")


def build_object_key(user_id: int, filename: str) -> str:
    safe_name = filename.replace(" ", "_")
    uid = uuid.uuid4().hex
    return f"user_{user_id}/{uid}_{safe_name}"


def upload_fileobj(fileobj: BinaryIO, user_id: int, filename: str, content_type: str) -> str:
    if not R2_CONFIGURED or s3_client is None:
        raise RuntimeError(
            "R2 är inte konfigurerat. Kontrollera att följande miljövariabler är satta: "
            "R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME"
        )
    
    key = build_object_key(user_id, filename)
    s3_client.upload_fileobj(
        Fileobj=fileobj,
        Bucket=R2_BUCKET_NAME,
        Key=key,
        ExtraArgs={"ContentType": content_type},
    )
    return key


def generate_presigned_url(key: str, expires_in: int = 3600) -> str:
    if not R2_CONFIGURED or s3_client is None:
        raise RuntimeError(
            "R2 är inte konfigurerat. Kontrollera att följande miljövariabler är satta: "
            "R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME"
        )
    
    return s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": R2_BUCKET_NAME, "Key": key},
        ExpiresIn=expires_in,
    )


def object_exists(key: str) -> bool:
    """Check if an object exists in R2."""
    if not R2_CONFIGURED or s3_client is None:
        return False
    
    try:
        s3_client.head_object(Bucket=R2_BUCKET_NAME, Key=key)
        return True
    except Exception as e:
        # Object doesn't exist or other error
        print(f"[r2_client] Object check failed for key '{key}': {str(e)}")
        return False


def delete_object(key: str) -> None:
    """Delete an object from R2."""
    if not R2_CONFIGURED or s3_client is None:
        raise RuntimeError(
            "R2 är inte konfigurerat. Kontrollera att följande miljövariabler är satta: "
            "R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME"
        )
    
    s3_client.delete_object(Bucket=R2_BUCKET_NAME, Key=key)

