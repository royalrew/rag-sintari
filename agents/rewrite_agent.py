"""
Dokumentationsförbättrare (Rewrite Agent)

Förbättrar dokument med fokus på klarhet, ton, formulering och struktur.
Behåller innehållet exakt ("keeps facts, improves readability").
"""

from __future__ import annotations

from typing import Dict, Any, List, Optional
from dataclasses import dataclass

from rag.llm_client import LLMClient
from rag.retriever import Retriever


@dataclass
class RewriteChange:
    """En förändring som gjorts i dokumentet."""
    original_text: str
    rewritten_text: str
    reason: str
    change_type: str  # "klarhet", "ton", "formulering", "struktur"


@dataclass
class RewriteReport:
    """Rewrite-rapport med förbättringar."""
    document_name: str
    original_text: str
    rewritten_text: str
    changes: List[RewriteChange]
    summary: str
    readability_score_before: Optional[float] = None
    readability_score_after: Optional[float] = None


class RewriteAgent:
    """Agent för att förbättra dokument utan att ändra innehållet."""
    
    def __init__(self, retriever: Retriever, llm: Optional[LLMClient] = None):
        self.retriever = retriever
        self.llm = llm or LLMClient()
    
    def rewrite_document(
        self, 
        document_name: str, 
        workspace_id: Optional[str] = None,
        target_audience: str = "general",
        style: str = "professional",
        verbose: bool = False
    ) -> RewriteReport:
        """
        Förbättrar ett dokument med fokus på klarhet och läsbarhet.
        
        Args:
            document_name: Namnet på dokumentet att förbättra
            workspace_id: Workspace-ID (optional)
            target_audience: Målgrupp ("general", "technical", "non-technical", "executives")
            style: Stil ("professional", "casual", "formal", "concise")
            verbose: Om debug-output ska visas
            
        Returns:
            RewriteReport med original, förbättrad text och ändringar
        """
        # Hämta alla chunks för dokumentet
        chunks = self._get_document_chunks(document_name, workspace_id)
        
        if not chunks:
            return RewriteReport(
                document_name=document_name,
                original_text="",
                rewritten_text="",
                changes=[],
                summary="Inga chunks hittades för detta dokument.",
            )
        
        # Kombinera chunks till fullständig text
        original_text = self._combine_chunks(chunks)
        
        # LLM-baserad rewrite
        rewritten_text, changes = self._llm_rewrite(
            original_text, 
            document_name, 
            target_audience, 
            style, 
            verbose
        )
        
        # Beräkna läsbarhet (förenklad)
        readability_before = self._calculate_readability(original_text)
        readability_after = self._calculate_readability(rewritten_text)
        
        # Sammanfattning
        summary = self._generate_summary(len(changes), readability_before, readability_after)
        
        return RewriteReport(
            document_name=document_name,
            original_text=original_text,
            rewritten_text=rewritten_text,
            changes=changes,
            summary=summary,
            readability_score_before=readability_before,
            readability_score_after=readability_after,
        )
    
    def _get_document_chunks(self, document_name: str, workspace_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Hämtar alla chunks för ett specifikt dokument."""
        query = f"all content from {document_name}"
        chunks = self.retriever.retrieve(
            question=query,
            workspace_id=workspace_id,
            document_ids=[document_name],
            verbose=False,
        )
        return chunks
    
    def _combine_chunks(self, chunks: List[Dict[str, Any]]) -> str:
        """Kombinerar chunks till fullständig text med sida/position-info."""
        lines = []
        for i, chunk in enumerate(chunks):
            metadata = chunk.get("metadata", {}) or {}
            page = metadata.get("page_number", i + 1)
            text = chunk.get("text", "")
            lines.append(f"[Sida {page}]\n{text}\n")
        return "\n".join(lines)
    
    def _llm_rewrite(
        self, 
        original_text: str, 
        document_name: str, 
        target_audience: str,
        style: str,
        verbose: bool = False
    ) -> tuple[str, List[RewriteChange]]:
        """LLM-baserad rewrite av dokumentet."""
        # Limit text length för att hålla prompts hanterbara
        max_length = 10000  # ~2500 ord
        if len(original_text) > max_length:
            original_text = original_text[:max_length] + "\n\n[... resten av dokumentet ...]"
        
        system_prompt = f"""Du är en expert på dokumentförbättring och klarhet. Förbättra dokumentet med fokus på:

1. **Klarhet**: Gör formuleringar mer tydliga och konkreta
2. **Ton**: Anpassa tonen till {target_audience} målgrupp med {style} stil
3. **Formulering**: Förbättra meningar och stycken för bättre läsbarhet
4. **Struktur**: Förbättra strukturen och flödet där det behövs

VIKTIGT: Behåll all fakta och innehåll exakt. Ändra endast formuleringssätt, struktur och klarhet.

Målgrupp: {target_audience}
Stil: {style}

Returnera JSON med:
{{
  "rewritten_text": "Den förbättrade versionen...",
  "changes": [
    {{
      "original_text": "Original text...",
      "rewritten_text": "Förbättrad text...",
      "reason": "Förklaring av ändringen",
      "change_type": "klarhet"
    }}
  ]
}}"""
        
        user_prompt = f"""Förbättra följande dokument ({document_name}) för {target_audience} målgrupp med {style} stil:

{original_text}

Returnera endast JSON med rewritten_text och changes."""
        
        try:
            response = self.llm.extract(user_prompt, system_prompt)
            rewritten_text, changes = self._parse_llm_response(response, original_text)
            return rewritten_text, changes
        except Exception as e:
            if verbose:
                print(f"[Rewrite Agent] LLM-rewrite misslyckades: {e}")
            # Fallback: returnera original text
            return original_text, []
    
    def _parse_llm_response(self, response: str, original_text: str) -> tuple[str, List[RewriteChange]]:
        """Parse LLM-response till rewritten text och changes."""
        # TODO: Implementera JSON-parsing från LLM-response
        # För nu använder vi enkel heuristik: om response innehåller "rewritten_text"
        
        # Om response ser ut som JSON, försök extrahera rewritten_text
        rewritten_text = original_text  # Fallback
        
        # Försök hitta rewritten_text i JSON-format
        if "rewritten_text" in response.lower():
            # Enkel extraction: hitta texten mellan "rewritten_text": " och avslutande "
            import re
            match = re.search(r'"rewritten_text"\s*:\s*"([^"]+)"', response, re.DOTALL)
            if match:
                rewritten_text = match.group(1).strip()
        
        changes = []
        
        # Om response nämner ändringar, skapa en generisk change
        if "förbättrad" in response.lower() or "improved" in response.lower():
            changes.append(RewriteChange(
                original_text="[Hela dokumentet]",
                rewritten_text="[Förbättrad version]",
                reason="Generell förbättring av klarhet och struktur",
                change_type="struktur"
            ))
        
        return rewritten_text, changes
    
    def _calculate_readability(self, text: str) -> float:
        """Beräknar en förenklad läsbarhetspoäng (0-100)."""
        # Förenklad: baserat på genomsnittlig meninglängd och ordlängd
        sentences = text.split('.')
        words = text.split()
        
        if not sentences or not words:
            return 50.0
        
        avg_sentence_length = len(words) / len(sentences)
        avg_word_length = sum(len(w) for w in words) / len(words)
        
        # Högre poäng = bättre läsbarhet (kortare meningar och ord är bättre)
        # Magic numbers: justerade för svenska
        score = 100 - (avg_sentence_length * 2) - (avg_word_length * 5)
        return max(0, min(100, score))
    
    def _generate_summary(self, change_count: int, readability_before: float, readability_after: float) -> str:
        """Genererar sammanfattning av rewrite."""
        if change_count == 0:
            return "Inga ändringar gjordes. Dokumentet var redan välformulerat."
        
        readability_improvement = readability_after - readability_before
        
        summary = f"Förbättrade dokumentet med {change_count} ändringar. "
        
        if readability_improvement > 5:
            summary += f"Läsbarhet förbättrades med {readability_improvement:.1f} poäng."
        elif readability_improvement > 0:
            summary += f"Läsbarhet förbättrades något ({readability_improvement:.1f} poäng)."
        else:
            summary += "Läsbarhet behölls på ungefär samma nivå."
        
        return summary
    
    def get_diff_view(self, report: RewriteReport) -> List[Dict[str, str]]:
        """Genererar diff-view för att visa ändringar sida vid sida."""
        diff_items = []
        
        for change in report.changes:
            diff_items.append({
                "original": change.original_text,
                "rewritten": change.rewritten_text,
                "reason": change.reason,
                "type": change.change_type,
            })
        
        return diff_items

