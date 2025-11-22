from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

from rag.llm_client import LLMClient
from rag.retriever import Retriever
from rag.config_loader import load_config
from rag.reranker import CrossEncoderReranker
from rag.query_logger import log_query
from rag.output_formatter import OutputFormatter, format_answer

# Base style instructions to ensure consistent, clean output
BASE_STYLE_INSTRUCTIONS = """
STIL:
- Använd punktlistor med '•' när du listar saker.
- Håll svaren korta och strukturerade.
- Använd rubriker när du delar upp längre svar.
- Undvik att visa intern metadata eller tekniska regler.
"""


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
        
        # Initialize output formatter and settings
        output_cfg = self.cfg.get("output", {}) or {}
        self.formatter = OutputFormatter(output_cfg)
        self.include_sources_in_answer = output_cfg.get("include_sources_in_answer", True)
        self.presentation_mode = output_cfg.get("presentation_mode", "consulting")  # consulting | chat | raw

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

            # Adjust prompt based on presentation mode
            presentation_hint = ""
            if self.presentation_mode == "consulting":
                presentation_hint = " Var mer 'rapportig' med tydliga rubriker och strukturerad text."
            elif self.presentation_mode == "chat":
                presentation_hint = " Var mer 'chattig' och konversationell."
            elif self.presentation_mode == "raw":
                presentation_hint = " Var direkt och kortfattad utan extra formatering."
            
            if mode == "answer":
                if self.use_bench_prompt:
                    try:
                        with open("my_docs/bench_prompt.txt", "r", encoding="utf-8") as f:
                            system_prompt = f.read().strip()
                    except Exception:
                        system_prompt = "Du är en komprimerad RAG-assistent. Svara kort utan metadata."
                else:
                    base_system_prompt = (
                        "Du är en hjälpmotor som svarar på frågor utifrån givna källtexter.\n\n"
                        "REGLER:\n"
                        "1) Läs källtexterna noggrant.\n"
                        "2) Om svaret finns uttryckligen: svara kort och tydligt på svenska (1–2 meningar).\n"
                        "3) Om svaret inte står ordagrant men rimligen kan utläsas av funktioner/beskrivning:\n"
                        "   - resonera försiktigt och formulera ett troligt syfte eller sammanfattning,\n"
                        "   - markera gärna att du tolkar (t.ex. 'Utifrån beskrivningen verkar syftet vara ...').\n"
                        "4) Om svaret varken står uttryckligen eller går att tolka: skriv exakt 'Jag hittar inte svaret i källorna.'\n"
                        "5) Hitta inte på externa fakta utanför källorna.\n\n"
                        "FORMATERING:\n"
                        "- Presentera alltid listor som punktlistor med enhetlig formatering.\n"
                        "- Använd korta, tydliga rubriker med kolon (t.ex. 'Fördelar:', 'Nackdelar:').\n"
                        "- Ge max 3–7 punkter per lista för bäst läsbarhet.\n"
                        "- Undvik bindestreck-listor; använd konsekvent punktlistor.\n"
                        "- Håll radlängden rimlig (max ~100 tecken).\n"
                        "- Använd konsekvent whitespace och radbrytningar.\n"
                    )
                    sources_instruction = ""
                    if self.include_sources_in_answer:
                        sources_instruction = "\nAvsluta svaret med raden 'Källor:' följt av en punktlista med dokument och sidor från kontexten."
                    system_prompt = base_system_prompt + BASE_STYLE_INSTRUCTIONS + presentation_hint + sources_instruction
            elif mode == "summary":
                base_summary_prompt = (
                    "Sammanfatta kontexten nedan i 2–3 meningar, endast baserat på innehållet.\n\n"
                    "FORMATERING:\n"
                    "- Presentera alltid listor som punktlistor.\n"
                    "- Använd korta, tydliga rubriker.\n"
                    "- Ge max 3–7 punkter per lista.\n"
                    "- Undvik bindestreck-listor.\n"
                )
                system_prompt = base_summary_prompt + BASE_STYLE_INSTRUCTIONS + "\nAvsluta med 'Källor:' och lista dokument och sidor du använde."
            else:  # extract
                base_extract_prompt = (
                    "Extrahera relevanta nyckelpunkter ur kontexten nedan.\n\n"
                    "FORMATERING:\n"
                    "- Presentera alltid listor som punktlistor.\n"
                    "- Använd korta, tydliga rubriker.\n"
                    "- Ge max 3–7 punkter per lista.\n"
                    "- Undvik bindestreck-listor.\n"
                )
                system_prompt = base_extract_prompt + BASE_STYLE_INSTRUCTIONS + "\nAvsluta med 'Källor:' och lista dokument och sidor du använde."
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

            # Format output for enterprise-ready presentation (use format_answer for consistency)
            answer = format_answer(answer)
            
            # Add sources programmatically if configured to do so and not already in answer
            if self.include_sources_in_answer and sources and "Källor:" not in answer:
                source_lines = []
                for s in sources:
                    dn = s.get("document_name") or "Okänt dokument"
                    pg = s.get("page_number") or "?"
                    source_lines.append(f"• {dn} s.{pg}")
                if source_lines:
                    answer += "\n\nKällor:\n" + "\n".join(source_lines)

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

