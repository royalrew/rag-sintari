"""
Audit-Agent (Brister & Förbättringar)

Identifierar logiska brister, otydligheter, inkonsekvenser och förbättringsförslag.
"""

from __future__ import annotations

from typing import Dict, Any, List, Optional
from dataclasses import dataclass

from rag.llm_client import LLMClient
from rag.retriever import Retriever
from rag.index import VectorIndex


@dataclass
class AuditFinding:
    """En audit-finding (brist eller förbättringsmöjlighet)."""
    category: str  # "logisk_brist", "otydlighet", "saknad_definition", "motstridighet", etc.
    priority: str  # "high", "medium", "low"
    location: str  # "sida 5", "chunk 3", etc.
    problem: str
    explanation: str
    suggestion: str


@dataclass
class AuditReport:
    """Audit-rapport för ett dokument."""
    document_name: str
    findings: List[AuditFinding]
    high_priority_count: int
    medium_priority_count: int
    low_priority_count: int
    summary: str


class AuditAgent:
    """Agent för dokumentaudit och kvalitetskontroll."""
    
    def __init__(self, retriever: Retriever, llm: Optional[LLMClient] = None):
        self.retriever = retriever
        self.llm = llm or LLMClient()
    
    def _is_system_document(self, document_name: str) -> bool:
        """Identifierar om ett dokument är ett system-dokument (intro, demo, etc)."""
        system_indicators = ["intro", "demo", "system", "test", "example", "readme"]
        name_lower = document_name.lower()
        return any(indicator in name_lower for indicator in system_indicators)
    
    def audit_document(self, document_name: str, workspace_id: Optional[str] = None, verbose: bool = False) -> AuditReport:
        """
        Granskar ett dokument för brister och förbättringsmöjligheter.
        
        Args:
            document_name: Namnet på dokumentet att granska
            workspace_id: Workspace-ID (optional)
            verbose: Om debug-output ska visas
            
        Returns:
            AuditReport med alla findings
        """
        # Hämta alla chunks för dokumentet
        chunks = self._get_document_chunks(document_name, workspace_id)
        
        if not chunks:
            return AuditReport(
                document_name=document_name,
                findings=[],
                high_priority_count=0,
                medium_priority_count=0,
                low_priority_count=0,
                summary="Inga chunks hittades för detta dokument.",
            )
        
        # Identifiera om det är ett system-dokument
        is_system = self._is_system_document(document_name)
        
        # LLM-baserad audit
        findings = self._llm_audit(chunks, document_name, verbose, is_system_document=is_system)
        
        # Räkna priorities
        high_priority_count = sum(1 for f in findings if f.priority == "high")
        medium_priority_count = sum(1 for f in findings if f.priority == "medium")
        low_priority_count = sum(1 for f in findings if f.priority == "low")
        
        # Sammanfattning
        summary = self._generate_summary(findings, high_priority_count, medium_priority_count, low_priority_count)
        
        return AuditReport(
            document_name=document_name,
            findings=findings,
            high_priority_count=high_priority_count,
            medium_priority_count=medium_priority_count,
            low_priority_count=low_priority_count,
            summary=summary,
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
    
    def _llm_audit(self, chunks: List[Dict[str, Any]], document_name: str, verbose: bool = False, is_system_document: bool = False) -> List[AuditFinding]:
        """LLM-baserad audit för brister och förbättringar."""
        # Kombinera chunks till en text för analys
        combined_text = "\n\n---\n\n".join([
            f"Chunk {i+1} (sida {ch.get('metadata', {}).get('page_number', i+1)}):\n{ch.get('text', '')}"
            for i, ch in enumerate(chunks[:15])  # Max 15 chunks
        ])
        
        system_prompt = """Du är en expert på dokumentgranskning och kvalitetskontroll. Analysera dokumentet och identifiera:

1. **Logiska brister**: Saknade steg, ofullständiga processer, hål i logiken
2. **Otydligheter**: Oklara formuleringar, tvetydiga termer, otydliga instruktioner
3. **Saknade definitioner**: Begrepp som används men inte definieras
4. **Motstridigheter**: Två delar av dokumentet säger motsatta saker
5. **Förbättringsförslag**: Saker som kan göras tydligare, mer professionellt eller mer användbart

Returnera JSON med findings:
{
  "findings": [
    {
      "category": "logisk_brist",
      "priority": "high",
      "problem": "Kort beskrivning av problemet",
      "explanation": "Detaljerad förklaring",
      "suggestion": "Konkret förbättringsförslag"
    }
  ]
}"""
        
        # Anpassa prompt baserat på om det är system-dokument
        if is_system_document:
            context_note = "OBS: Detta är ett system-dokument (intro/demo). Var mild i bedömningen - fokusera på konstruktiva förbättringsförslag snarare än kritiska brister."
        else:
            context_note = "Detta är ett kunddokument. Var grundlig i granskningen och identifiera alla brister."
        
        user_prompt = f"""Granska följande dokument ({document_name}) för brister och förbättringsmöjligheter:

{combined_text}

{context_note}

Identifiera alla brister, otydligheter och förbättringsmöjligheter. Prioritera: high = kritiskt, medium = viktigt, low = förbättringsmöjlighet.

Returnera endast JSON."""
        
        try:
            response = self.llm.extract(user_prompt, system_prompt)
            findings = self._parse_llm_findings(response, chunks, is_system_document=is_system_document)
            return findings
        except Exception as e:
            if verbose:
                print(f"[Audit Agent] LLM-audit misslyckades: {e}")
            return []
    
    def _parse_llm_findings(self, response: str, chunks: List[Dict[str, Any]], is_system_document: bool = False) -> List[AuditFinding]:
        """Parse LLM-response till AuditFindings."""
        # TODO: Implementera JSON-parsing från LLM-response
        # För nu använder vi heuristik baserat på nyckelord
        findings = []
        
        # För system-dokument: var mildare och använd lägre prioritet
        base_priority = "low" if is_system_document else "medium"
        high_priority_threshold = "medium" if is_system_document else "high"
        
        # Enkel heuristik baserat på response-innehåll
        if "otydlig" in response.lower() or "unclear" in response.lower():
            findings.append(AuditFinding(
                category="otydlighet",
                priority=base_priority,
                location="dokumentet",
                problem="Otydliga formuleringar identifierade",
                explanation="LLM-analysen indikerar att vissa delar av dokumentet kan vara otydliga eller tvetydiga." if not is_system_document else "Några formuleringar kan göras tydligare för bättre läsbarhet.",
                suggestion="Överväg att förtydliga formuleringar och använda mer konkreta exempel." if not is_system_document else "Förbättra läsbarheten genom tydligare formuleringar."
            ))
        
        if "saknas" in response.lower() or "missing" in response.lower():
            findings.append(AuditFinding(
                category="saknad_definition",
                priority=base_priority,
                location="dokumentet",
                problem="Saknade definitioner eller information",
                explanation="LLM-analysen indikerar att vissa begrepp eller steg kan saknas." if not is_system_document else "Några definitioner kan läggas till för bättre förståelse.",
                suggestion="Lägg till definitioner för alla viktiga begrepp och se till att alla processer är kompletta." if not is_system_document else "Överväg att lägga till definitioner för viktiga begrepp."
            ))
        
        # Motstridigheter: hoppa över för system-dokument eller gör det till low priority
        if "motstridig" in response.lower() or "contradict" in response.lower():
            if not is_system_document:
                findings.append(AuditFinding(
                    category="motstridighet",
                    priority="high",
                    location="dokumentet",
                    problem="Motstridigheter identifierade",
                    explanation="LLM-analysen indikerar att olika delar av dokumentet kan säga motsatta saker.",
                    suggestion="Granska dokumentet noggrant och ta bort eller förtydliga motstridigheter."
                ))
            # För system-dokument: ignorera eller gör till mycket mildare "inkonsekvens"
            elif "inkonsekvent" in response.lower() or "inconsistent" in response.lower():
                findings.append(AuditFinding(
                    category="inkonsekvens",
                    priority="low",
                    location="dokumentet",
                    problem="Möjliga inkonsekvenser",
                    explanation="Några delar av dokumentet kan vara inkonsekventa.",
                    suggestion="Överväg att standardisera formuleringar för bättre konsistens."
                ))
        
        return findings
    
    def _generate_summary(self, findings: List[AuditFinding], high: int, medium: int, low: int) -> str:
        """Genererar sammanfattning av audit-findings."""
        if not findings:
            return "Inga brister identifierade. Dokumentet verkar vara välstrukturerat och tydligt."
        
        summary = f"Audit hittade {len(findings)} brister/förbättringsmöjligheter: {high} hög prioritet, {medium} medel prioritet, {low} låg prioritet. "
        
        if high > 0:
            summary += f"{high} kritiska brister bör åtgärdas omedelbart. "
        
        if medium > 0:
            summary += f"{medium} viktiga förbättringar rekommenderas. "
        
        if low > 0:
            summary += f"{low} förbättringsmöjligheter kan göras för att ytterligare öka kvaliteten."
        
        return summary
    
    def get_findings_table(self, report: AuditReport) -> List[Dict[str, str]]:
        """Konverterar audit-findings till tabellformat för UI."""
        return [
            {
                "priority": f.priority,
                "category": f.category,
                "problem": f.problem,
                "explanation": f.explanation,
                "suggestion": f.suggestion,
                "location": f.location,
            }
            for f in report.findings
        ]

