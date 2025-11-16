from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Dict, Any, Iterable

import numpy as np


@dataclass
class IndexItem:
    id: str
    embedding: np.ndarray
    metadata: Dict[str, Any]


@dataclass
class IndexHit:
    id: str
    score: float
    metadata: Dict[str, Any]


class VectorIndex:
    """Abstract interface – lätt att byta backend senare."""

    def add(self, items: List[IndexItem]) -> None:
        raise NotImplementedError

    def iter_items(self) -> Iterable[IndexItem]:
        raise NotImplementedError

    def query(
        self,
        embedding: np.ndarray,
        top_k: int = 5,
        filter: Optional[Dict[str, Any]] = None,
    ) -> List[IndexHit]:
        raise NotImplementedError

    def delete(self, ids: List[str]) -> None:
        raise NotImplementedError

    def clear(self) -> None:
        raise NotImplementedError


class InMemoryIndex(VectorIndex):
    def __init__(self, normalize: bool = True) -> None:
        self._items: Dict[str, IndexItem] = {}
        self._normalize = normalize

    def add(self, items: List[IndexItem]) -> None:
        for item in items:
            emb = item.embedding.astype(np.float32)
            if self._normalize:
                norm = float(np.linalg.norm(emb)) or 1.0
                emb = emb / norm
            self._items[item.id] = IndexItem(
                id=item.id,
                embedding=emb,
                metadata=item.metadata,
            )

    def query(
        self,
        embedding: np.ndarray,
        top_k: int = 5,
        filter: Optional[Dict[str, Any]] = None,
    ) -> List[IndexHit]:
        if not self._items:
            return []

        q = embedding.astype(np.float32)
        if self._normalize:
            norm = float(np.linalg.norm(q)) or 1.0
            q = q / norm

        hits: List[IndexHit] = []
        for item in self._items.values():
            if filter and not _match_filter(item.metadata, filter):
                continue
            score = float(np.dot(q, item.embedding))  # cosine om normaliserade
            hits.append(IndexHit(id=item.id, score=score, metadata=item.metadata))

        hits.sort(key=lambda h: h.score, reverse=True)
        return hits[:top_k]

    def delete(self, ids: List[str]) -> None:
        for _id in ids:
            self._items.pop(_id, None)

    def clear(self) -> None:
        self._items.clear()

    def iter_items(self) -> Iterable[IndexItem]:
        return list(self._items.values())


def _match_filter(meta: Dict[str, Any], flt: Dict[str, Any]) -> bool:
    for key, value in flt.items():
        if meta.get(key) != value:
            return False
    return True



