from __future__ import annotations

import argparse
import json
from typing import Optional, List
import sys

from rag.engine import RAGEngine
from rag.retriever import Retriever
from rag.embeddings_client import EmbeddingsClient
from rag.index import InMemoryIndex, IndexItem
from rag.config_loader import load_config
from ingest.text_extractor import extract_text
from ingest.chunker import chunk_text
from rag.store import Store
from rag.index_store import load_index, save_index, needs_rebuild
import numpy as np
import os
import hashlib
from datetime import datetime, timezone
from rank_bm25 import BM25Okapi


def main() -> int:
    parser = argparse.ArgumentParser(description="RAG CLI - ställ en fråga och få svar + källor")
    parser.add_argument("--workspace", default="default", help="workspace id")
    parser.add_argument("--mode", default="answer", choices=["answer", "summary", "extract"], help="RAG-läge")
    parser.add_argument("--docs_dir", default=None, help="Mapp med .txt/.md att indexera innan frågan körs")
    parser.add_argument("--verbose", action="store_true", help="Visa diagnostik om indexering och chunks")
    parser.add_argument("--doc_ids", default=None, help="Kommaseparerade dokument-id eller namn att filtrera på")
    parser.add_argument("question", nargs="+", help="fråga att ställa till motorn")
    args = parser.parse_args()

    question = " ".join(args.question).strip()

    # Build index and optionally ingest from docs_dir
    cfg = load_config()
    emb = EmbeddingsClient()
    idx = InMemoryIndex()

    ingested_files = 0
    ingested_chunks = 0
    
    # Get cache dir from config
    storage_cfg = cfg.get("storage", {})
    cache_dir = storage_cfg.get("index_dir", "index_cache")

    if args.docs_dir:
        # Collect documents with mtimes
        doc_files: List[dict] = []
        for root, _, files in os.walk(args.docs_dir):
            for fn in files:
                if fn.lower().endswith((".txt", ".md", ".pdf", ".docx")):
                    path = os.path.join(root, fn)
                    try:
                        mtime = str(int(os.path.getmtime(path)))
                        doc_files.append({"path": path, "name": fn, "mtime": mtime})
                    except Exception:
                        pass
        
        # Check if cached index is valid
        if needs_rebuild(args.workspace, doc_files, cache_dir):
            if args.verbose:
                print("[cli] Rebuilding index from docs_dir...", file=sys.stderr)
            
            # Need to rebuild - extract and process documents
            texts: List[tuple[str, str, str, str]] = []  # (doc_name, text, path, mtime)
            for doc in doc_files:
                try:
                    text, _ = extract_text(doc["path"])
                    texts.append((doc["name"], text, doc["path"], doc["mtime"]))
                    ingested_files += 1
                except Exception:
                    pass
            
            # Chunk and embed
            chunk_cfg = cfg.get("chunking", {}) or {}
            target = int(chunk_cfg.get("target_tokens", 600))
            overlap = int(chunk_cfg.get("overlap_tokens", 120))

            all_texts: List[str] = []
            chunk_metas: List[dict] = []
            # persistence
            persistence_cfg = cfg.get("persistence", {}) or {}
            db_path = persistence_cfg.get("sqlite_path", "./.rag_state/rag.sqlite")
            store = Store(db_path=db_path)

            for doc_name, text, doc_path, doc_mtime in texts:
                chunks = chunk_text(text, target, overlap)
                ingested_chunks += len(chunks)
                # derive document id/version
                doc_abs = os.path.abspath(doc_path)
                doc_id = hashlib.sha1(doc_abs.encode("utf-8")).hexdigest()
                try:
                    version = int(os.path.getmtime(doc_abs))
                except Exception:
                    version = 1
                store.upsert_document(doc_id=doc_id, name=doc_name, version=version, workspace_id=args.workspace, mtime=doc_mtime)
                for ch in chunks:
                    all_texts.append(ch["text"])
                    chunk_metas.append({
                        "chunk_id": f"doc-{len(chunk_metas)+1}",
                        "document_name": doc_name,
                        "document_id": doc_id,
                        "document_path": doc_path,
                        "document_mtime": doc_mtime,
                        "page_number": 1,
                        "workspace_id": args.workspace,
                        "text": ch["text"],
                    })

            if all_texts:
                vecs = emb.embed_texts(all_texts)
                items: List[IndexItem] = []
                now_iso = datetime.now(timezone.utc).isoformat()
                chunk_rows_for_store = []
                
                for i, (meta, vec) in enumerate(zip(chunk_metas, vecs)):
                    chunk_id = meta["chunk_id"]
                    items.append(
                        IndexItem(
                            id=chunk_id,
                            embedding=np.array(vec, dtype=float),
                            metadata=meta,
                        )
                    )
                    # store chunk
                    chunk_rows_for_store.append((
                        chunk_id,
                        meta.get("document_id") or "",
                        meta.get("text") or "",
                        int(meta.get("page_number") or 1),
                        now_iso,
                    ))
                idx.add(items)
                if chunk_rows_for_store:
                    store.upsert_chunks(chunk_rows_for_store)
                
                # Build BM25 and save to cache
                tokenized_texts = [t.split() for t in all_texts]
                bm25 = BM25Okapi(tokenized_texts)
                embeddings_array = np.vstack([np.array(v, dtype=float) for v in vecs])
                
                save_index(args.workspace, embeddings_array, chunk_metas, bm25, cache_dir)
            
            if args.verbose:
                print(f"[cli] Indexed files: {ingested_files}, chunks: {ingested_chunks}, vectors: {len(all_texts)}", file=sys.stderr)
        else:
            # Load from cache
            if args.verbose:
                print(f"[cli] Loading cached index for workspace '{args.workspace}'...", file=sys.stderr)
            
            cache = load_index(args.workspace, cache_dir)
            if cache:
                # Rebuild InMemoryIndex from cache
                items: List[IndexItem] = []
                for i, meta in enumerate(cache["chunks_meta"]):
                    items.append(
                        IndexItem(
                            id=meta["chunk_id"],
                            embedding=cache["embeddings"][i],
                            metadata=meta,
                        )
                    )
                idx.add(items)
                ingested_files = len(set(m["document_name"] for m in cache["chunks_meta"]))
                ingested_chunks = len(cache["chunks_meta"])
                
                if args.verbose:
                    print(f"[cli] Loaded from cache: {ingested_files} files, {ingested_chunks} chunks", file=sys.stderr)
            else:
                if args.verbose:
                    print("[cli] No cache found, index is empty", file=sys.stderr)
    else:
        # Fallback demo chunks
        demo_chunks: List[str] = [
            "RAG-motorn syftar till hög precision på svenska med bra latens och rimliga kostnader.",
            "Systemet stödjer Q&A, sammanfattning och extraktion från dokumenttunga källor.",
            "Ingestion pipeline: läs dokument, extrahera text, chunk, embed, indexera.",
        ]
        vectors = emb.embed_texts(demo_chunks)
        items: List[IndexItem] = []
        for i, (text, vec) in enumerate(zip(demo_chunks, vectors)):
            items.append(
                IndexItem(
                    id=f"cli-chunk-{i+1}",
                    embedding=np.array(vec, dtype=float),
                    metadata={
                        "chunk_id": f"cli-chunk-{i+1}",
                        "document_id": "doc-cli",
                        "document_name": "RAG Demo",
                        "page_number": 1,
                        "text": text,
                        "workspace_id": args.workspace,
                    },
                )
            )
        idx.add(items)
        if args.verbose:
            print("[cli] Using built-in demo chunks: 3", file=sys.stderr)

    retriever = Retriever(index=idx, embeddings_client=emb)
    engine = RAGEngine(retriever=retriever)

    doc_ids_list = None
    if args.doc_ids:
        doc_ids_list = [s.strip() for s in args.doc_ids.split(",") if s.strip()]

    result = engine.answer_question(question=question, workspace_id=args.workspace, document_ids=doc_ids_list, mode=args.mode, verbose=args.verbose)

    # Fix Windows console encoding issues
    try:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except UnicodeEncodeError:
        print(json.dumps(result, ensure_ascii=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
