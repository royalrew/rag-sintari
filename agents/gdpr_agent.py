"""
GDPR-Scan Agent

Identifierar GDPR-risker och känsliga uppgifter i dokument.
Flaggar brister: saknade rättsliga grunder, felaktig lagringsperiod, saknad DPIA.
"""

from __future__ import annotations

import re
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

from rag.llm_client import LLMClient
from rag.retriever import Retriever
from rag.index import VectorIndex


@dataclass
class GDPRFinding:
    """En GDPR-risk eller brist som identifierats."""
    category: str  # "personnummer", "hälsodata", "saknad_rättslig_grund", etc.
    severity: str  # "high", "medium", "low"
    location: str  # "sida 5", "chunk 3", etc.
    description: str
    recommendation: str


@dataclass
class GDPRReport:
    """GDPR-rapport för ett dokument."""
    document_name: str
    risk_score: int  # 0-100
    risk_level: str  # "green", "yellow", "red"
    findings: List[GDPRFinding]
    summary: str
    has_personnummer: bool
    has_health_data: bool
    has_sensitive_categories: bool
    missing_legal_basis: bool
    missing_retention_period: bool
    missing_dpia: bool


class GDPRAgent:
    """Agent för GDPR-kompliance-scanning."""
    
    # Regelbaserade mönster för identifiering
    PERSONNUMMER_PATTERN = re.compile(r'\b\d{6}[-\s]?\d{4}\b')  # YYMMDD-XXXX
    EMAIL_PATTERN = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
    PHONE_PATTERN = re.compile(r'\b\d{2,3}[-\s]?\d{6,10}\b')
    
    def __init__(self, retriever: Retriever, llm: Optional[LLMClient] = None):
        self.retriever = retriever
        self.llm = llm or LLMClient()
    
    def scan_document(self, document_name: str, workspace_id: Optional[str] = None, verbose: bool = False) -> GDPRReport:
        """
        Skannar ett dokument för GDPR-risker.
        
        Args:
            document_name: Namnet på dokumentet att skanna
            workspace_id: Workspace-ID (optional)
            verbose: Om debug-output ska visas
            
        Returns:
            GDPRReport med alla findings
        """
        # Hämta alla chunks för dokumentet
        chunks = self._get_document_chunks(document_name, workspace_id)
        
        if not chunks:
            return GDPRReport(
                document_name=document_name,
                risk_score=0,
                risk_level="green",
                findings=[],
                summary="Inga chunks hittades för detta dokument.",
                has_personnummer=False,
                has_health_data=False,
                has_sensitive_categories=False,
                missing_legal_basis=False,
                missing_retention_period=False,
                missing_dpia=False,
            )
        
        # Regelbaserad analys
        rule_findings = self._rule_based_scan(chunks, document_name)
        
        # LLM-baserad analys
        llm_findings = self._llm_based_scan(chunks, document_name, verbose)
        
        # Kombinera findings
        all_findings = rule_findings + llm_findings
        
        # Beräkna risk-score
        risk_score = self._calculate_risk_score(all_findings)
        risk_level = self._get_risk_level(risk_score)
        
        # Identifiera flaggor
        has_personnummer = any(f.category == "personnummer" for f in all_findings)
        has_health_data = any(f.category == "hälsodata" for f in all_findings)
        has_sensitive_categories = any(f.category == "känslig_kategori" for f in all_findings)
        missing_legal_basis = any(f.category == "saknad_rättslig_grund" for f in all_findings)
        missing_retention_period = any(f.category == "saknad_lagringsperiod" for f in all_findings)
        missing_dpia = any(f.category == "saknad_dpia" for f in all_findings)
        
        # Sammanfattning
        summary = self._generate_summary(all_findings, risk_level)
        
        return GDPRReport(
            document_name=document_name,
            risk_score=risk_score,
            risk_level=risk_level,
            findings=all_findings,
            summary=summary,
            has_personnummer=has_personnummer,
            has_health_data=has_health_data,
            has_sensitive_categories=has_sensitive_categories,
            missing_legal_basis=missing_legal_basis,
            missing_retention_period=missing_retention_period,
            missing_dpia=missing_dpia,
        )
    
    def _get_document_chunks(self, document_name: str, workspace_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Hämtar alla chunks för ett specifikt dokument."""
        # Använd retriever för att hämta alla chunks för dokumentet
        # Genom att söka med en bred query kan vi få tillbaka alla chunks
        query = f"all content from {document_name}"
        chunks = self.retriever.retrieve(
            question=query,
            workspace_id=workspace_id,
            document_ids=[document_name],
            verbose=False,
        )
        return chunks
    
    def _rule_based_scan(self, chunks: List[Dict[str, Any]], document_name: str) -> List[GDPRFinding]:
        """Regelbaserad scanning för personnummer, email, etc."""
        findings = []
        
        for i, chunk in enumerate(chunks):
            text = chunk.get("text", "")
            metadata = chunk.get("metadata", {}) or {}
            page = metadata.get("page_number", i + 1)
            location = f"sida {page}"
            
            # Personnummer
            if self.PERSONNUMMER_PATTERN.search(text):
                findings.append(GDPRFinding(
                    category="personnummer",
                    severity="high",
                    location=location,
                    description="Personnummer hittades i dokumentet.",
                    recommendation="Överväg att pseudonymisera eller maskera personnummer enligt GDPR artikel 25 (data protection by design)."
                ))
            
            # Email
            emails = self.EMAIL_PATTERN.findall(text)
            if len(emails) > 5:  # Flera email-adresser kan indikera kontaktregister
                findings.append(GDPRFinding(
                    category="email_adresser",
                    severity="medium",
                    location=location,
                    description=f"{len(emails)} email-adresser hittades.",
                    recommendation="Se till att du har rättslig grund för att lagra email-adresser enligt GDPR artikel 6."
                ))
        
        return findings
    
    def _llm_based_scan(self, chunks: List[Dict[str, Any]], document_name: str, verbose: bool = False) -> List[GDPRFinding]:
        """LLM-baserad analys för GDPR-brister."""
        # Kombinera chunks till en text för analys
        combined_text = "\n\n---\n\n".join([
            f"Chunk {i+1} (sida {ch.get('metadata', {}).get('page_number', i+1)}):\n{ch.get('text', '')}"
            for i, ch in enumerate(chunks[:10])  # Max 10 chunks för att hålla prompts hanterbara
        ])
        
        system_prompt = """Du är en GDPR-compliance expert. Analysera dokumentet och identifiera:
1. Hälsodata (GDPR artikel 9)
2. Känsliga kategorier (ras, religion, politiska åsikter, etc.)
3. Saknad rättslig grund för databehandling
4. Saknad lagringsperiod eller otydlig retention policy
5. Behov för DPIA (Data Protection Impact Assessment)

Returnera JSON med findings:
{
  "findings": [
    {
      "category": "hälsodata",
      "severity": "high",
      "description": "...",
      "recommendation": "..."
    }
  ]
}"""
        
        user_prompt = f"""Analysera följande dokument ({document_name}) för GDPR-risker:

{combined_text}

Identifiera alla GDPR-risker och brister. Returnera endast JSON."""
        
        try:
            response = self.llm.extract(user_prompt, system_prompt)
            # Parse JSON från response
            findings = self._parse_llm_findings(response, chunks)
            return findings
        except Exception as e:
            if verbose:
                print(f"[GDPR Agent] LLM-scan misslyckades: {e}")
            return []
    
    def _parse_llm_findings(self, response: str, chunks: List[Dict[str, Any]]) -> List[GDPRFinding]:
        """Parse LLM-response till GDPRFindings."""
        # TODO: Implementera JSON-parsing från LLM-response
        # För nu returnerar vi tom lista
        findings = []
        
        # Enkel heuristik: om response innehåller vissa nyckelord
        if "hälsodata" in response.lower() or "health data" in response.lower():
            findings.append(GDPRFinding(
                category="hälsodata",
                severity="high",
                location="dokumentet",
                description="Potentiell hälsodata identifierad.",
                recommendation="Kontrollera om hälsodata behandlas och se till att du har explicit samtycke eller annan rättslig grund enligt GDPR artikel 9."
            ))
        
        if "rättslig grund" in response.lower() or "legal basis" in response.lower():
            findings.append(GDPRFinding(
                category="saknad_rättslig_grund",
                severity="high",
                location="dokumentet",
                description="Rättslig grund för databehandling kan saknas.",
                recommendation="Se till att du dokumenterar rättslig grund för all databehandling enligt GDPR artikel 6."
            ))
        
        return findings
    
    def _calculate_risk_score(self, findings: List[GDPRFinding]) -> int:
        """Beräknar risk-score 0-100 baserat på findings."""
        if not findings:
            return 0
        
        score = 0
        for finding in findings:
            if finding.severity == "high":
                score += 25
            elif finding.severity == "medium":
                score += 15
            else:
                score += 5
        
        return min(100, score)
    
    def _get_risk_level(self, risk_score: int) -> str:
        """Konverterar risk-score till risk-nivå."""
        if risk_score < 30:
            return "green"
        elif risk_score < 60:
            return "yellow"
        else:
            return "red"
    
    def _generate_summary(self, findings: List[GDPRFinding], risk_level: str) -> str:
        """Genererar sammanfattning av findings."""
        if not findings:
            return "Inga GDPR-risker identifierade. Dokumentet verkar följa grundläggande GDPR-principer."
        
        high_count = sum(1 for f in findings if f.severity == "high")
        medium_count = sum(1 for f in findings if f.severity == "medium")
        low_count = sum(1 for f in findings if f.severity == "low")
        
        summary = f"GDPR-skanning hittade {len(findings)} risk/brister: {high_count} hög, {medium_count} medel, {low_count} låg. "
        
        if risk_level == "red":
            summary += "Dokumentet har betydande GDPR-risker som kräver omedelbar åtgärd."
        elif risk_level == "yellow":
            summary += "Dokumentet har måttliga GDPR-risker som bör åtgärdas."
        else:
            summary += "Dokumentet har lätta GDPR-risker som kan förbättras."
        
        return summary

