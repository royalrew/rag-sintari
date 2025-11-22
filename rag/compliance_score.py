"""
Risk & Compliance Score Engine

Beräknar sammanfattande scores från GDPR-agent, Audit-agent och RAG-hjärnan.
Användbart för dashboards och UI.
"""

from __future__ import annotations

from typing import Dict, Any, Optional
from dataclasses import dataclass

from agents.gdpr_agent import GDPRReport
from agents.audit_agent import AuditReport


@dataclass
class ComplianceScore:
    """Sammanfattande compliance-score."""
    document_name: str
    gdpr_risk_score: float  # 0-100 (från GDPR-agent)
    audit_quality_score: float  # 0-100 (beräknas från audit)
    overall_compliance_score: float  # 0-100 (kombinerad)
    completeness_score: float  # 0-100 (baserat på brister)
    recommendations_count: int
    critical_issues_count: int
    summary: str


class ComplianceScoreEngine:
    """Engine för att beräkna compliance-scores från olika rapporter."""
    
    def __init__(self):
        pass
    
    def calculate_compliance_score(
        self,
        gdpr_report: Optional[GDPRReport] = None,
        audit_report: Optional[AuditReport] = None,
        document_name: str = "unknown"
    ) -> ComplianceScore:
        """
        Beräknar sammanfattande compliance-score från GDPR och Audit-rapporter.
        
        Args:
            gdpr_report: GDPR-rapport (optional)
            audit_report: Audit-rapport (optional)
            document_name: Namnet på dokumentet
            
        Returns:
            ComplianceScore med alla beräknade scores
        """
        # GDPR-risk score (högre = sämre, invertera för compliance)
        gdpr_risk = gdpr_report.risk_score if gdpr_report else 0
        gdpr_compliance = 100 - gdpr_risk  # Invertera: 0 risk = 100 compliance
        
        # Audit quality score (högre priority findings = lägre kvalitet)
        audit_quality = self._calculate_audit_quality(audit_report)
        
        # Overall compliance = vägt medelvärde
        weights = {"gdpr": 0.6, "audit": 0.4}  # GDPR väger tyngre
        overall = (
            gdpr_compliance * weights["gdpr"] + 
            audit_quality * weights["audit"]
        )
        
        # Completeness score (baserat på saknade delar)
        completeness = self._calculate_completeness(gdpr_report, audit_report)
        
        # Räkna rekommendationer och kritiska problem
        recommendations_count = self._count_recommendations(gdpr_report, audit_report)
        critical_issues_count = self._count_critical_issues(gdpr_report, audit_report)
        
        # Generera sammanfattning
        summary = self._generate_summary(
            gdpr_compliance, 
            audit_quality, 
            overall, 
            recommendations_count, 
            critical_issues_count
        )
        
        return ComplianceScore(
            document_name=document_name,
            gdpr_risk_score=gdpr_risk,  # Behåll risk-score som är (högre = sämre)
            audit_quality_score=audit_quality,
            overall_compliance_score=overall,
            completeness_score=completeness,
            recommendations_count=recommendations_count,
            critical_issues_count=critical_issues_count,
            summary=summary,
        )
    
    def _calculate_audit_quality(self, audit_report: Optional[AuditReport]) -> float:
        """Beräknar kvalitetspoäng från audit-rapport (0-100, högre = bättre)."""
        if not audit_report or not audit_report.findings:
            return 100.0  # Inga findings = perfekt kvalitet
        
        # Räkna ned för findings: High = -20, Medium = -10, Low = -5
        score = 100.0
        score -= audit_report.high_priority_count * 20
        score -= audit_report.medium_priority_count * 10
        score -= audit_report.low_priority_count * 5
        
        return max(0, min(100, score))
    
    def _calculate_completeness(self, gdpr_report: Optional[GDPRReport], audit_report: Optional[AuditReport]) -> float:
        """Beräknar kompletthetspoäng baserat på saknade delar (0-100, högre = mer komplett)."""
        missing_items = 0
        total_items = 0
        
        # GDPR-checklista
        if gdpr_report:
            total_items += 3  # legal_basis, retention_period, dpia
            
            if gdpr_report.missing_legal_basis:
                missing_items += 1
            if gdpr_report.missing_retention_period:
                missing_items += 1
            if gdpr_report.missing_dpia:
                missing_items += 1
        
        # Audit-checklista (saknade definitioner är indikator på ofullständighet)
        if audit_report:
            missing_definitions = sum(
                1 for f in audit_report.findings 
                if f.category == "saknad_definition"
            )
            missing_items += missing_definitions
            total_items += max(1, len(audit_report.findings))  # Minst 1 item att kolla
        
        if total_items == 0:
            return 100.0  # Inget att bedöma = perfekt
        
        completeness = (1 - (missing_items / total_items)) * 100
        return max(0, min(100, completeness))
    
    def _count_recommendations(
        self, 
        gdpr_report: Optional[GDPRReport], 
        audit_report: Optional[AuditReport]
    ) -> int:
        """Räknar totalt antal rekommendationer."""
        count = 0
        
        if gdpr_report:
            count += len(gdpr_report.findings)
        
        if audit_report:
            count += len(audit_report.findings)
        
        return count
    
    def _count_critical_issues(
        self, 
        gdpr_report: Optional[GDPRReport], 
        audit_report: Optional[AuditReport]
    ) -> int:
        """Räknar kritiska problem (high severity/priority)."""
        count = 0
        
        if gdpr_report:
            count += sum(1 for f in gdpr_report.findings if f.severity == "high")
        
        if audit_report:
            count += sum(1 for f in audit_report.findings if f.priority == "high")
        
        return count
    
    def _generate_summary(
        self,
        gdpr_compliance: float,
        audit_quality: float,
        overall: float,
        recommendations_count: int,
        critical_issues_count: int
    ) -> str:
        """Genererar textsammanfattning av compliance-score."""
        if overall >= 80:
            level = "Utmärkt"
        elif overall >= 60:
            level = "Bra"
        elif overall >= 40:
            level = "Måttlig"
        else:
            level = "Behöver förbättras"
        
        summary = f"Overall compliance: {overall:.1f}/100 ({level}). "
        summary += f"GDPR-compliance: {gdpr_compliance:.1f}/100, "
        summary += f"Kvalitet: {audit_quality:.1f}/100. "
        
        if critical_issues_count > 0:
            summary += f"{critical_issues_count} kritiska problem identifierade. "
        
        if recommendations_count > 0:
            summary += f"{recommendations_count} rekommendationer tillgängliga."
        
        return summary
    
    def get_dashboard_data(self, score: ComplianceScore) -> Dict[str, Any]:
        """Konverterar ComplianceScore till dashboard-vänligt format."""
        return {
            "document_name": score.document_name,
            "scores": {
                "overall": score.overall_compliance_score,
                "gdpr_risk": score.gdpr_risk_score,
                "audit_quality": score.audit_quality_score,
                "completeness": score.completeness_score,
            },
            "metrics": {
                "recommendations": score.recommendations_count,
                "critical_issues": score.critical_issues_count,
            },
            "summary": score.summary,
            "status": self._get_status_level(score.overall_compliance_score),
        }
    
    def _get_status_level(self, score: float) -> str:
        """Konverterar score till status-nivå."""
        if score >= 80:
            return "green"
        elif score >= 60:
            return "yellow"
        else:
            return "red"

