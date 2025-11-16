from __future__ import annotations

from typing import List, Dict, Any


def chunk_text(text: str, target_tokens: int = 600, overlap_tokens: int = 120) -> List[Dict[str, Any]]:
    """
    Simple word-based chunker approximating tokens by words.
    Returns list of chunks with metadata: chunk_index, is_first, is_last, text.
    """
    words = text.split()
    if not words:
        return []

    step = max(1, target_tokens - overlap_tokens)
    chunks: List[Dict[str, Any]] = []
    i = 0
    chunk_index = 0
    total_words = len(words)

    while i < total_words:
        segment = words[i : i + target_tokens]
        chunk_text_value = " ".join(segment)
        chunk_index += 1
        chunks.append(
            {
                "chunk_index": chunk_index,
                "is_first": (i == 0),
                "is_last": (i + target_tokens >= total_words),
                "text": chunk_text_value,
            }
        )
        if i + target_tokens >= total_words:
            break
        i += step

    return chunks

