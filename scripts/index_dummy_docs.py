from __future__ import annotations

import os
from typing import List

import numpy as np

from rag.embeddings_client import EmbeddingsClient
from rag.index import InMemoryIndex, IndexItem


def main() -> int:
    # Build tiny demo index in memory
    emb = EmbeddingsClient()
    idx = InMemoryIndex()

    # Dummy chunks
    chunks: List[str] = [
        "RAG-motorn syftar till hög precision på svenska med bra latens och rimliga kostnader.",
        "Systemet stödjer Q&A, sammanfattning och extraktion från dokumenttunga källor.",
        "Ingestion pipeline: läs dokument, extrahera text, chunk, embed, indexera.",
    ]
    vectors = emb.embed_texts(chunks)

    items: List[IndexItem] = []
    for i, (text, vec) in enumerate(zip(chunks, vectors)):
        items.append(
            IndexItem(
                id=f"chunk-{i+1}",
                embedding=np.array(vec, dtype=float),
                metadata={
                    "chunk_id": f"chunk-{i+1}",
                    "document_id": "doc-demo",
                    "document_name": "RAG Vision",
                    "page_number": 1,
                    "text": text,
                    "workspace_id": "default",
                },
            )
        )

    idx.add(items)
    print("Dummy in-memory index created with 3 chunks.")
    print("Obs: Detta script håller indexet i minnet bara under körningen.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

