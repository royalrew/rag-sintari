from __future__ import annotations

from typing import Iterable, List, Dict, Any

from openai import OpenAI

from rag.config_loader import load_config, get_openai_api_key


class EmbeddingsClient:
    def __init__(self, model: str | None = None, batch_size: int | None = None) -> None:
        cfg = load_config()
        models_cfg = cfg.get("models", {})
        embeddings_model = model or models_cfg.get("embeddings", "text-embedding-3-large")

        emb_cfg = cfg.get("embeddings", {})
        self.batch_size = batch_size or emb_cfg.get("batch_size", 128)

        self.model = embeddings_model
        self._client = OpenAI(api_key=get_openai_api_key())

    def embed_texts(self, texts: Iterable[str]) -> List[List[float]]:
        """Embeds a sequence of texts in batches and returns vectors in the same order."""
        texts_list = list(texts)
        vectors: List[List[float]] = []

        for i in range(0, len(texts_list), self.batch_size):
            batch = texts_list[i : i + self.batch_size]
            resp = self._client.embeddings.create(model=self.model, input=batch)
            # Preserve order
            vectors.extend([d.embedding for d in resp.data])

        return vectors


