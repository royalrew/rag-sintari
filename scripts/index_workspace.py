"""Auto-indexer: Indexera en hel mapp med dokument till en workspace."""
from __future__ import annotations

import argparse
import os
import sys
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Any

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from rag.config_loader import load_config
from rag.embeddings_client import EmbeddingsClient
from rag.index import InMemoryIndex, IndexItem
from rag.store import Store
from rag.index_store import save_index
from ingest.text_extractor import extract_text
from ingest.chunker import chunk_text
from rank_bm25 import BM25Okapi
import numpy as np


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Indexera en mapp med dokument till en workspace"
    )
    parser.add_argument(
        "--workspace",
        type=str,
        required=True,
        help="Workspace-id (t.ex. 'kund_a', 'production')",
    )
    parser.add_argument(
        "--path",
        type=str,
        required=True,
        help="Sökväg till mapp med dokument",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Visa detaljerad progress",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Tvinga re-indexering även om dokumenten är oförändrade",
    )
    args = parser.parse_args()
    
    # Verifiera sökväg
    docs_path = Path(args.path)
    if not docs_path.exists():
        print(f"[ERROR] Sökvägen finns inte: {args.path}")
        return 1
    
    print(f"[indexer] Workspace: {args.workspace}")
    print(f"[indexer] Sökväg: {args.path}")
    print()
    
    # Load config
    cfg = load_config()
    chunk_cfg = cfg.get("chunking", {}) or {}
    target_tokens = int(chunk_cfg.get("target_tokens", 600))
    overlap_tokens = int(chunk_cfg.get("overlap_tokens", 120))
    
    persistence_cfg = cfg.get("persistence", {}) or {}
    db_path = persistence_cfg.get("sqlite_path", "./.rag_state/rag.sqlite")
    
    storage_cfg = cfg.get("storage", {})
    cache_dir = storage_cfg.get("index_dir", "index_cache")
    
    # Hitta alla dokument
    supported_extensions = {".txt", ".md", ".pdf", ".docx"}
    doc_files: List[Dict[str, Any]] = []
    
    print("[indexer] Söker efter dokument...")
    for root, _, files in os.walk(args.path):
        for filename in files:
            if Path(filename).suffix.lower() in supported_extensions:
                filepath = os.path.join(root, filename)
                try:
                    mtime = str(int(os.path.getmtime(filepath)))
                    size = os.path.getsize(filepath)
                    doc_files.append({
                        "path": filepath,
                        "name": filename,
                        "mtime": mtime,
                        "size": size,
                    })
                except Exception:
                    pass
    
    if not doc_files:
        print(f"[ERROR] Inga dokument hittades i {args.path}")
        print(f"[INFO] Stödda format: {', '.join(supported_extensions)}")
        return 1
    
    print(f"[indexer] Hittade {len(doc_files)} dokument")
    total_size_mb = sum(d["size"] for d in doc_files) / (1024 * 1024)
    print(f"[indexer] Total storlek: {total_size_mb:.1f} MB")
    print()
    
    # Extrahera text från dokument
    print("[indexer] Extraherar text från dokument...")
    extracted_docs: List[Dict[str, Any]] = []
    failed_docs = 0
    
    for i, doc in enumerate(doc_files, 1):
        if args.verbose:
            print(f"[{i}/{len(doc_files)}] {doc['name']}...", end=" ")
        
        try:
            text, _ = extract_text(doc["path"])
            if text.strip():
                extracted_docs.append({
                    "name": doc["name"],
                    "path": doc["path"],
                    "mtime": doc["mtime"],
                    "text": text,
                })
                if args.verbose:
                    print(f"OK ({len(text)} tecken)")
            else:
                if args.verbose:
                    print("SKIP (tom)")
        except Exception as e:
            failed_docs += 1
            if args.verbose:
                print(f"FAIL ({str(e)[:50]})")
    
    if failed_docs > 0:
        print(f"[WARNING] Misslyckades extrahera {failed_docs} dokument")
    
    if not extracted_docs:
        print("[ERROR] Inga dokument kunde extraheras")
        return 1
    
    print(f"[indexer] Extraherade {len(extracted_docs)} dokument")
    print()
    
    # Chunka dokument
    print("[indexer] Chunkar dokument...")
    all_chunks: List[Dict[str, Any]] = []
    chunk_texts: List[str] = []
    
    for doc in extracted_docs:
        chunks = chunk_text(doc["text"], target_tokens, overlap_tokens)
        for chunk in chunks:
            chunk_id = f"chunk-{len(all_chunks)+1}"
            all_chunks.append({
                "chunk_id": chunk_id,
                "document_name": doc["name"],
                "document_path": doc["path"],
                "document_mtime": doc["mtime"],
                "text": chunk["text"],
                "page_number": 1,  # TODO: För PDF kan vi få faktisk sidnummer
                "workspace_id": args.workspace,
            })
            chunk_texts.append(chunk["text"])
    
    print(f"[indexer] Skapade {len(all_chunks)} chunks")
    avg_chunk_len = sum(len(c["text"]) for c in all_chunks) / len(all_chunks)
    print(f"[indexer] Genomsnittlig chunk-längd: {avg_chunk_len:.0f} tecken")
    print()
    
    # Generera embeddings
    print("[indexer] Genererar embeddings (detta kan ta en stund)...")
    emb_client = EmbeddingsClient()
    embeddings = emb_client.embed_texts(chunk_texts)
    
    print(f"[indexer] Genererade {len(embeddings)} embeddings")
    print()
    
    # Spara till SQLite
    print("[indexer] Sparar till SQLite...")
    store = Store(db_path=db_path)
    
    # Spara dokument
    for doc in extracted_docs:
        doc_abs = os.path.abspath(doc["path"])
        doc_id = hashlib.sha1(doc_abs.encode("utf-8")).hexdigest()
        try:
            version = int(os.path.getmtime(doc_abs))
        except Exception:
            version = 1
        
        store.upsert_document(
            doc_id=doc_id,
            name=doc["name"],
            version=version,
            workspace_id=args.workspace,
            mtime=doc["mtime"],
        )
    
    # Spara chunks
    now_iso = datetime.now(timezone.utc).isoformat()
    chunk_rows = []
    for chunk in all_chunks:
        doc_abs = os.path.abspath(chunk["document_path"])
        doc_id = hashlib.sha1(doc_abs.encode("utf-8")).hexdigest()
        chunk_rows.append((
            chunk["chunk_id"],
            doc_id,
            chunk["text"],
            chunk["page_number"],
            now_iso,
        ))
    
    store.upsert_chunks(chunk_rows)
    print(f"[indexer] Sparade {len(extracted_docs)} dokument och {len(all_chunks)} chunks")
    print()
    
    # Bygg BM25-index
    print("[indexer] Bygger BM25-index...")
    tokenized_texts = [t.split() for t in chunk_texts]
    bm25 = BM25Okapi(tokenized_texts)
    
    # Bygg embeddings-matris
    embeddings_array = np.vstack([np.array(e, dtype=float) for e in embeddings])
    
    # Spara till disk-cache
    print("[indexer] Sparar till disk-cache...")
    save_index(
        workspace=args.workspace,
        embeddings=embeddings_array,
        chunks_meta=all_chunks,
        bm25_obj=bm25,
        base_dir=cache_dir,
    )
    
    print()
    print("=" * 60)
    print("[SUCCESS] INDEXERING KLAR!")
    print("=" * 60)
    print(f"Workspace: {args.workspace}")
    print(f"Dokument: {len(extracted_docs)}")
    print(f"Chunks: {len(all_chunks)}")
    print(f"Cache: {cache_dir}/{args.workspace}/")
    print()
    print("Testa med:")
    print(f'  python -m cli.chat_cli --workspace {args.workspace} --mode answer "Din fråga"')
    print()
    print("Eller via API:")
    print(f'  curl -X POST http://localhost:8000/query \\')
    print(f'    -H "Content-Type: application/json" \\')
    print(f'    -d \'{{"query": "Din fråga", "workspace": "{args.workspace}"}}\'')
    print()
    
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

