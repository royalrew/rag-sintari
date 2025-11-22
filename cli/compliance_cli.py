"""
Compliance CLI - Kör GDPR-scan, audit och compliance-score på ett dokument.
"""

from __future__ import annotations

import argparse
import json
import sys
import os
from typing import Optional

# Fix Windows terminal encoding för emojis
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

from rag.engine import RAGEngine
from rag.retriever import Retriever
from rag.embeddings_client import EmbeddingsClient
from rag.index import InMemoryIndex, IndexItem
from rag.config_loader import load_config
from rag.index_store import load_index
from agents.gdpr_agent import GDPRAgent
from agents.audit_agent import AuditAgent
from rag.compliance_score import ComplianceScoreEngine


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Compliance CLI - Kör GDPR-scan, audit och compliance-score på ett dokument"
    )
    parser.add_argument("--workspace", default="default", help="Workspace ID")
    parser.add_argument("--doc", required=True, help="Dokumentnamn att analysera")
    parser.add_argument("--verbose", action="store_true", help="Visa debug-output")
    parser.add_argument("--json", action="store_true", help="Output som JSON")
    args = parser.parse_args()

    # Ladda config
    cfg = load_config()
    storage_cfg = cfg.get("storage", {})
    cache_dir = storage_cfg.get("index_dir", "index_cache")

    # Ladda index från cache
    cache = load_index(args.workspace, cache_dir)
    if not cache:
        print(f"[ERROR] Ingen cache för workspace '{args.workspace}'. Kör indexering först.")
        return 1

    # Bygg InMemoryIndex från cache
    idx = InMemoryIndex()
    items: list[IndexItem] = []
    for i, meta in enumerate(cache["chunks_meta"]):
        items.append(
            IndexItem(
                id=meta["chunk_id"],
                embedding=cache["embeddings"][i],
                metadata=meta,
            )
        )
    idx.add(items)

    # Bygg retriever
    emb = EmbeddingsClient()
    retriever = Retriever(index=idx, embeddings_client=emb)

    # Initiera agenter
    gdpr_agent = GDPRAgent(retriever=retriever)
    audit_agent = AuditAgent(retriever=retriever)
    score_engine = ComplianceScoreEngine()

    print(f"[Compliance CLI] Analyserar dokument: {args.doc}")
    print(f"[Compliance CLI] Workspace: {args.workspace}")
    print("=" * 60)

    try:
        # Kör GDPR-scan
        print("\n[1/3] GDPR-skanning...")
        gdpr_report = gdpr_agent.scan_document(
            document_name=args.doc,
            workspace_id=args.workspace,
            verbose=args.verbose,
        )

        # Kör audit
        print("[2/3] Dokumentaudit...")
        audit_report = audit_agent.audit_document(
            document_name=args.doc,
            workspace_id=args.workspace,
            verbose=args.verbose,
        )

        # Beräkna compliance-score
        print("[3/3] Beräknar compliance-score...")
        compliance_score = score_engine.calculate_compliance_score(
            gdpr_report=gdpr_report,
            audit_report=audit_report,
            document_name=args.doc,
        )

    except Exception as e:
        print(f"[ERROR] Compliance-analys misslyckades: {e}", file=sys.stderr)
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1

    # Output
    if args.json:
        # JSON-output
        output = {
            "document": args.doc,
            "scores": {
                "gdpr_risk": compliance_score.gdpr_risk_score,
                "audit_quality": compliance_score.audit_quality_score,
                "overall": compliance_score.overall_compliance_score,
                "completeness": compliance_score.completeness_score,
                "status": score_engine._get_status_level(compliance_score.overall_compliance_score),
            },
            "gdpr": {
                "risk_score": gdpr_report.risk_score,
                "risk_level": gdpr_report.risk_level,
                "findings_count": len(gdpr_report.findings),
            },
            "audit": {
                "findings_count": len(audit_report.findings),
                "high_priority": audit_report.high_priority_count,
                "medium_priority": audit_report.medium_priority_count,
                "low_priority": audit_report.low_priority_count,
            },
        }
        print(json.dumps(output, indent=2, ensure_ascii=False))
    else:
        # Human-readable output
        print("\n" + "=" * 60)
        print("COMPLIANCE-ANALYS RESULTAT")
        print("=" * 60)

        # Scores
        print(f"\n📊 SCORES:")
        print(f"  GDPR Risk:        {compliance_score.gdpr_risk_score:.1f}/100")
        print(f"  Audit Quality:    {compliance_score.audit_quality_score:.1f}/100")
        print(f"  Overall:          {compliance_score.overall_compliance_score:.1f}/100")
        print(f"  Completeness:     {compliance_score.completeness_score:.1f}/100")
        
        status = score_engine._get_status_level(compliance_score.overall_compliance_score)
        status_emoji = "🟢" if status == "green" else "🟡" if status == "yellow" else "🔴"
        print(f"  Status:           {status_emoji} {status.upper()}")

        # GDPR Top 3 risker
        if gdpr_report.findings:
            print(f"\n🔴 TOP 3 GDPR-RISKER:")
            high_findings = [f for f in gdpr_report.findings if f.severity == "high"]
            medium_findings = [f for f in gdpr_report.findings if f.severity == "medium"]
            top_findings = (high_findings + medium_findings)[:3]
            
            for i, finding in enumerate(top_findings, 1):
                print(f"\n  {i}. {finding.category.upper()} ({finding.severity})")
                print(f"     Plats: {finding.location}")
                print(f"     {finding.description}")
                print(f"     💡 {finding.recommendation[:100]}...")
        
        # Audit Top 3 förbättringsförslag
        if audit_report.findings:
            print(f"\n💡 TOP 3 FÖRBÄTTRINGSFÖRSLAG:")
            high_findings = [f for f in audit_report.findings if f.priority == "high"]
            medium_findings = [f for f in audit_report.findings if f.priority == "medium"]
            top_findings = (high_findings + medium_findings)[:3]
            
            for i, finding in enumerate(top_findings, 1):
                print(f"\n  {i}. {finding.category.upper()} ({finding.priority} prioritet)")
                print(f"     Problem: {finding.problem}")
                print(f"     💡 {finding.suggestion[:100]}...")

        # Sammanfattning
        print(f"\n📋 SAMMANFATTNING:")
        print(f"  {compliance_score.summary}")

    return 0


if __name__ == "__main__":
    sys.exit(main())

