from __future__ import annotations

from dataclasses import dataclass
from typing import List, Dict, Any, Optional

from openai import OpenAI

from rag.config_loader import load_config, get_openai_api_key


@dataclass
class RerankCandidate:
    id: str
    text: str
    document_name: str
    page_number: Optional[int]
    hybrid_score: float


class CrossEncoderReranker:
    """
    Liten LLM-baserad reranker (cross-encoder).
    Tar query + text, ber modellen ge ett relevans-score 0–1.
    """

    def __init__(self, model: str | None = None) -> None:
        cfg = load_config()
        rr_cfg = cfg.get("rerank", {})
        self.model = model or rr_cfg.get("model", "gpt-4o-mini")
        self.mix_weight: float = float(rr_cfg.get("mix_weight", 0.7))

        self._client = OpenAI(api_key=get_openai_api_key())

    def _score_single(self, query: str, text: str) -> float:
        """
        Anropar LLM och får tillbaka ett score 0–1.
        Håller prompten superenkel för att hålla latensen nere.
        """
        system_msg = (
            "Du är en hjälpmotor som bara bedömer RELEVANS. "
            "Du får en användarfråga och ett textstycke. "
            "Svara ENBART med en siffra mellan 0 och 1 där 0 = helt irrelevant, 1 = extremt relevant."
        )

        user_msg = f"""Fråga:
{query}

Text:
{text}

Svara ENBART med en siffra mellan 0 och 1, t.ex. 0.83"""

        resp = self._client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.0,
            max_tokens=4,
        )

        raw = (resp.choices[0].message.content or "").strip()
        try:
            value = float(raw.replace(",", "."))
        except ValueError:
            value = 0.0

        if value < 0.0:
            value = 0.0
        if value > 1.0:
            value = 1.0
        return value

    def rerank(
        self,
        query: str,
        candidates: List[Dict[str, Any]],
        top_k_out: int,
        verbose: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Tar en lista kandidat-chunks (från retriever) och returnerar
        samma struktur, men sorterad & trim:ad efter final_score.
        Kandidatformat stöder både vårt metadata-upplägg och platta fält.
        """
        if not candidates:
            return candidates

        rerank_candidates: List[RerankCandidate] = []
        for idx, c in enumerate(candidates):
            md = c.get("metadata", {}) or {}
            rerank_candidates.append(
                RerankCandidate(
                    id=str(c.get("chunk_id") or md.get("chunk_id") or idx),
                    text=c.get("text", "") or md.get("text", ""),
                    document_name=c.get("document_name") or md.get("document_name", ""),
                    page_number=c.get("page_number") or md.get("page_number"),
                    hybrid_score=float(c.get("score", 0.0)),
                )
            )

        scored: List[Dict[str, Any]] = []
        for rc in rerank_candidates:
            ce_score = self._score_single(query, rc.text)
            final_score = self.mix_weight * ce_score + (1.0 - self.mix_weight) * rc.hybrid_score

            if verbose:
                preview = rc.text[:80].replace("\n", " ")
                if len(rc.text) > 80:
                    preview += "..."
                print(
                    f"[rerank] {rc.id} | hybrid={rc.hybrid_score:.3f} | ce={ce_score:.3f} "
                    f"| final={final_score:.3f} | doc={rc.document_name} | preview='{preview}'"
                )

            # hitta original-dict; fallback på textmatch
            original = None
            for cand in candidates:
                if str(cand.get("chunk_id") or cand.get("metadata", {}).get("chunk_id") or "") == rc.id or cand.get("text") == rc.text:
                    original = cand
                    break
            original = original or candidates[0]
            enriched = dict(original)
            enriched["ce_score"] = ce_score
            enriched["final_score"] = final_score
            scored.append(enriched)

        scored.sort(key=lambda x: x.get("final_score", x.get("score", 0.0)), reverse=True)
        return scored[:top_k_out]


