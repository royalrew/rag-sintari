# 🔧 Prod Indexering - TODO

## Problemet

**Lokalt:**
- ✅ Dokument indexeras när du kör `scripts/index_workspace.py`
- ✅ Embeddings genereras, BM25-index byggs
- ✅ Index cache sparas till disk
- ✅ CLI funkar 10/10

**Prod (Railway):**
- ❌ `/documents/upload` sparar bara till R2 och DB
- ❌ Ingen indexering sker (extract → chunk → embed → save index)
- ❌ `/health` visar `indexed_chunks: 0`
- ❌ Queries returnerar "Jag hittar inte svaret i källorna" eftersom ingen cache finns

## Lösning: Indexering i Prod

För att få prod att fungera som lokal behöver vi:

### Steg 1: Skapa en indexeringspipeline-funktion

**Skapa:** `rag/index_pipeline.py`

```python
"""Indexering pipeline för dokument från R2."""
from typing import List, Dict, Any
from rag.store import Store
from rag.index_store import save_index
from ingest.text_extractor import extract_text
from ingest.chunker import chunk_text
from rag.embeddings_client import EmbeddingsClient
from rank_bm25 import BM25Okapi
import numpy as np
from api.r2_client import s3_client, R2_BUCKET_NAME
import tempfile
import os

def index_document_from_r2(
    storage_key: str,
    workspace_id: str,
    document_id: str,
    filename: str,
) -> Dict[str, Any]:
    """
    Indexera ett dokument från R2.
    
    1. Läs fil från R2 till temp-fil
    2. Extrahera text
    3. Chunk text
    4. Generera embeddings
    5. Spara till cache
    6. Uppdatera DB med chunks
    """
    # 1. Läs från R2
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as tmp_file:
        s3_client.download_fileobj(R2_BUCKET_NAME, storage_key, tmp_file)
        tmp_path = tmp_file.name
    
    try:
        # 2. Extrahera text
        text, _ = extract_text(tmp_path)
        
        # 3. Chunk text
        chunks = chunk_text(text, target_tokens=512, overlap_tokens=50)
        
        # 4. Generera embeddings
        emb_client = EmbeddingsClient()
        chunk_texts = [c["text"] for c in chunks]
        embeddings = emb_client.embed_texts(chunk_texts)
        
        # 5. Spara till cache (läs befintlig cache och merge)
        from rag.index_store import load_index
        cfg = load_config()
        cache_dir = cfg.get("storage", {}).get("index_dir", "index_cache")
        
        existing_cache = load_index(workspace_id, cache_dir)
        
        if existing_cache:
            # Merge med befintlig cache
            existing_chunks = existing_cache["chunks_meta"]
            existing_embeddings = existing_cache["embeddings"]
            # ... merge logik ...
        else:
            # Ny cache
            chunks_meta = [
                {
                    "chunk_id": f"chunk-{i+1}",
                    "document_id": document_id,
                    "document_name": filename,
                    "text": chunk["text"],
                    "page_number": 1,
                    "workspace_id": workspace_id,
                }
                for i, chunk in enumerate(chunks)
            ]
            
            save_index(
                workspace=workspace_id,
                embeddings=np.vstack([np.array(e, dtype=float) for e in embeddings]),
                chunks_meta=chunks_meta,
                bm25_obj=BM25Okapi([t.split() for t in chunk_texts]),
                base_dir=cache_dir,
            )
        
        # 6. Spara chunks till DB
        store = Store()
        # ... spara chunks ...
        
        return {
            "success": True,
            "chunks": len(chunks),
            "document_id": document_id,
        }
    finally:
        # Rensa temp-fil
        os.unlink(tmp_path)
```

### Steg 2: Integrera i `/documents/upload`

**I `api/main.py` i `upload_document`:**

```python
# Efter att dokument är sparat i R2 och DB:
# TODO: Indexera dokumentet från R2
try:
    from rag.index_pipeline import index_document_from_r2
    index_result = index_document_from_r2(
        storage_key=storage_key,
        workspace_id=str(user_id),  # Eller rätt workspace
        document_id=str(document_data["id"]),
        filename=filename,
    )
    print(f"[upload] Indexerade dokument: {index_result['chunks']} chunks")
except Exception as e:
    print(f"[upload] VARNING: Kunde inte indexera dokument: {e}")
    # Fortsätt ändå, dokumentet är sparat i R2/DB
```

### Steg 3: Alternativ: Async indexing

Om indexering tar för lång tid kan vi köra det asynkront:

```python
# I upload_document, efter att dokument är sparat:
import asyncio
asyncio.create_task(index_document_async(storage_key, workspace_id, document_id, filename))
```

### Steg 4: Invalidera cached engine

Efter indexering måste vi invalidera cached engine så den laddas om:

```python
# I api/main.py, efter indexering:
global _engines
if workspace_id in _engines:
    del _engines[workspace_id]  # Force reload nästa query
```

## Nästa steg

1. ✅ Fixa `verbose_mode`-buggen (gjort!)
2. ⏳ Skapa `rag/index_pipeline.py` med indexeringslogik
3. ⏳ Integrera i `/documents/upload`
4. ⏳ Testa i prod
5. ⏳ Verifiera att `/health` visar `indexed_chunks > 0`

## Test

Efter implementation:

1. Ladda upp ett dokument via sintari.se
2. Kolla Railway logs för `[upload] Indexerade dokument: X chunks`
3. Testa `/health` - ska visa `indexed_chunks > 0`
4. Ställ en fråga i chatten - ska hitta dokumentet!

## Status

- ✅ `verbose_mode`-bug fixad
- ⏳ Indexering i prod - TODO (se ovan)

