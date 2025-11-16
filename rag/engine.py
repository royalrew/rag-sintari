from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

from rag.llm_client import LLMClient
from rag.retriever import Retriever
from rag.config_loader import load_config
from rag.reranker import CrossEncoderReranker
from rag.query_logger import log_query


class RAGEngine:
    def __init__(self, retriever: Retriever, llm: Optional[LLMClient] = None) -> None:
        self.retriever = retriever
        self.llm = llm or LLMClient()
        self.cfg = load_config()
        self.rerank_cfg = self.cfg.get("rerank", {}) or {}
        self.reranker: Optional[CrossEncoderReranker] = None
        if self.rerank_cfg.get("enabled", False):
            self.reranker = CrossEncoderReranker(model=self.rerank_cfg.get("model"))
        bench_cfg = self.cfg.get("bench", {}) or {}
        self.use_bench_prompt: bool = bool(bench_cfg.get("use_bench_prompt", False))

    def answer_question(self, question: str, workspace_id: Optional[str] = None, document_ids: Optional[List[str]] = None, mode: str = "answer", verbose: bool = False, request_id: Optional[str] = None) -> Dict[str, Any]:
        total_start = time.perf_counter()
        retrieval_start = time.perf_counter()
        
        try:
            chunks = self.retriever.retrieve(question=question, workspace_id=workspace_id, document_ids=document_ids, verbose=verbose)
            retrieval_latency_ms = (time.perf_counter() - retrieval_start) * 1000

            # Optional rerank step
            if self.reranker and len(chunks) > 1:
                input_top_k = int(self.rerank_cfg.get("input_top_k", len(chunks)))
                output_top_k = int(self.rerank_cfg.get("output_top_k", min(5, len(chunks))))
                candidates = chunks[:input_top_k]
                if verbose:
                    print(f"[engine] Rerank aktiverad – input_top_k={input_top_k}, output_top_k={output_top_k}")
                reranked = self.reranker.rerank(query=question, candidates=candidates, top_k_out=output_top_k, verbose=verbose)
                chunks = reranked

            # Build context block for the prompt
            context_parts: List[str] = []
            sources: List[Dict[str, Any]] = []
            seen_sources: set[str] = set()
            for ch in chunks:
                text = ch.get("text", "")
                meta = ch.get("metadata", {}) or {}
                context_parts.append(text)
                key = f"{meta.get('document_name')}|{meta.get('page_number')}"
                if key not in seen_sources:
                    seen_sources.add(key)
                    sources.append({
                        "document_name": meta.get("document_name"),
                        "page_number": meta.get("page_number"),
                        "snippet": text[:200],
                    })
            context = "\n\n---\n\n".join(context_parts)

            # Build explicit source list to encourage citation
            source_lines = []
            for s in sources:
                dn = s.get("document_name") or "Okänt dokument"
                pg = s.get("page_number") or "?"
                source_lines.append(f"- {dn} s.{pg}")
            sources_list = "\n".join(source_lines) if source_lines else "- (inga)"

            if mode == "answer":
                if self.use_bench_prompt:
                    try:
                        with open("my_docs/bench_prompt.txt", "r", encoding="utf-8") as f:
                            system_prompt = f.read().strip()
                    except Exception:
                        system_prompt = "Du är en komprimerad RAG-assistent. Svara kort utan metadata."
                else:
                    system_prompt = (
                        "Du är en hjälpmotor som svarar på frågor utifrån givna källtexter.\n\n"
                        "REGLER:\n"
                        "1) Läs källtexterna noggrant.\n"
                        "2) Om svaret finns uttryckligen: svara kort och tydligt på svenska (1–2 meningar).\n"
                        "3) Om svaret inte står ordagrant men rimligen kan utläsas av funktioner/beskrivning:\n"
                        "   - resonera försiktigt och formulera ett troligt syfte eller sammanfattning,\n"
                        "   - markera gärna att du tolkar (t.ex. 'Utifrån beskrivningen verkar syftet vara ...').\n"
                        "4) Om svaret varken står uttryckligen eller går att tolka: skriv exakt 'Jag hittar inte svaret i källorna.'\n"
                        "5) Hitta inte på externa fakta utanför källorna.\n\n"
                        "Avsluta svaret med raden 'Källor:' följt av en punktlista med dokument och sidor från kontexten."
                    )
            elif mode == "summary":
                system_prompt = (
                    "Sammanfatta kontexten nedan i 2–3 meningar, endast baserat på innehållet. "
                    "Avsluta med 'Källor:' och lista dokument och sidor du använde."
                )
            else:  # extract
                system_prompt = (
                    "Extrahera relevanta nyckelpunkter ur kontexten nedan. "
                    "Avsluta med 'Källor:' och lista dokument och sidor du använde."
                )
            # Använd kort prompt i bench-mode för lägre latens
            if self.use_bench_prompt:
                user_prompt = f"Fråga: {question}\n\nKONTEKST:\n{context}"
            else:
                user_prompt = f"Fråga: {question}\n\nKONTEKST:\n{context}\n\nTillgängliga källor:\n{sources_list}"

            llm_start = time.perf_counter()
            if not chunks:
                answer = "Jag hittar inte svaret i källorna."
            elif mode == "summary":
                answer = self.llm.summarize(user_prompt=user_prompt, system_prompt=system_prompt)
            elif mode == "extract":
                answer = self.llm.extract(user_prompt=user_prompt, system_prompt=system_prompt)
            else:
                answer = self.llm.answer(user_prompt=user_prompt, system_prompt=system_prompt)
            llm_latency_ms = (time.perf_counter() - llm_start) * 1000

            total_latency_ms = (time.perf_counter() - total_start) * 1000

            # Samla retrieval stats för logging
            retrieval_stats: Dict[str, Any] = {
                "strategy": self.retriever.mode,
                "num_candidates": len(chunks),
                "top_k": self.retriever.top_k,
                "sources": [
                    {
                        "id": ch.get("chunk_id") or ch.get("metadata", {}).get("chunk_id"),
                        "score": ch.get("score") or ch.get("hybrid_score"),
                        "document_name": ch.get("metadata", {}).get("document_name"),
                        "page_number": ch.get("metadata", {}).get("page_number"),
                    }
                    for ch in chunks
                ],
            }

            # Bestäm modell baserat på mode
            model_name = self.llm.model_answer
            if mode == "summary":
                model_name = self.llm.model_summary
            elif mode == "extract":
                model_name = self.llm.model_extract

            # Logga successful query
            log_query(
                query=question,
                request_id=request_id,
                mode=mode,
                model=model_name,
                latency_ms=total_latency_ms,
                retrieval_latency_ms=retrieval_latency_ms,
                llm_latency_ms=llm_latency_ms,
                success=True,
                retrieval_stats=retrieval_stats,
                meta={
                    "source_count": len(sources),
                    "workspace_id": workspace_id,
                    "document_ids": document_ids,
                },
            )

            return {
                "answer": answer,
                "sources": sources,
                "mode": mode,
            }

        except Exception as exc:
            total_latency_ms = (time.perf_counter() - total_start) * 1000
            retrieval_latency_ms = (time.perf_counter() - retrieval_start) * 1000 if 'retrieval_latency_ms' not in locals() else None

            # Bestäm modell baserat på mode
            model_name = self.llm.model_answer
            if mode == "summary":
                model_name = self.llm.model_summary
            elif mode == "extract":
                model_name = self.llm.model_extract

            # Logga failed query
            log_query(
                query=question,
                request_id=request_id,
                mode=mode,
                model=model_name,
                latency_ms=total_latency_ms,
                retrieval_latency_ms=retrieval_latency_ms,
                success=False,
                error=exc,
                meta={
                    "workspace_id": workspace_id,
                    "document_ids": document_ids,
                    "stage": "engine.answer_question",
                },
            )
            raise

