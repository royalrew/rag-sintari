# Compliance AI – Automatiserad Dokumentanalys

## Översikt

Compliance AI är en kraftfull funktion som automatiserar analys av dokument för GDPR-compliance, kvalitetsgranskning och förbättringsförslag. Ladda upp ett dokument och få en färdig analys med risk-score, identifierade brister och konkreta rekommendationer på några sekunder.

## Funktioner

### 📊 Komplett Compliance-analys

- **GDPR-skanning**: Identifierar riskzoner (personnummer, hälsodata, känsliga kategorier)
- **Dokumentaudit**: Hittar logiska brister, otydligheter och förbättringsmöjligheter
- **Compliance-score**: Sammanfattande bedömning (0–100) med status-indikator (🟢 Grön / 🟡 Gul / 🔴 Röd)

### 🎯 Vad du får

Varje analys innehåller:

1. **Compliance-scores**:
   - Overall compliance (0–100)
   - GDPR-risk score
   - Audit quality score
   - Completeness score

2. **Top findings**:
   - Prioriterade GDPR-risker (High/Medium/Low)
   - Förbättringsförslag från audit
   - Konkreta rekommendationer

3. **Sammanfattning**:
   - En tydlig bedömning av dokumentets compliance-nivå
   - Antal kritiska problem och rekommendationer

### 💼 Användningsfall

**Idealisk för:**
- HR-policies och uppförandekoder
- IT-säkerhetspolicys
- Dataskyddsdokument (GDPR)
- Internt regelverk och riktlinjer
- Kundavtal och villkor

**Typisk workflow:**
1. Ladda upp dokumentet till systemet
2. Kör compliance-analys (via API eller CLI)
3. Få omedelbart:
   - Risk-score och status
   - Top 3 GDPR-risker
   - Top 3–5 förbättringsförslag
   - PDF-rapport (optional)

### 🔧 Tekniska detaljer

**API:**
```bash
POST /compliance/analyze
{
  "document_name": "HR_Policy.pdf",
  "workspace": "default"
}
```

**CLI:**
```bash
python -m cli.compliance_cli --workspace default --doc "HR_Policy.pdf"
```

**Output:**
- JSON-format för integration
- Human-readable output för demo
- PDF-rapport (V1, superenkel)

### 📈 Fördelar

- **Snabbt**: Analys på sekunder istället för timmar
- **Konsekvent**: Samma bedömningskriterier varje gång
- **Konstruktivt**: Konkreta förbättringsförslag, inte bara problem
- **Automatiserat**: Inga manuella checklistor eller sökningar

### 🎯 Demo-potential

Detta är redan demo-klart. Du kan visa kunder:

> "Så här ser det ut när vi kör en compliance-analys på era dokument – ni får risk-score, top findings, förbättringsförslag och en sammanfattning direkt."

Exempel-output:
```
📊 SCORES:
  GDPR Risk:        32.0/100
  Audit Quality:    78.0/100
  Overall:          71.0/100
  Status:           🟡 YELLOW

🔴 TOP 3 GDPR-RISKER:
  1. PERSONNUMMER (high)
     💡 Överväg att pseudonymisera...

💡 TOP 3 FÖRBÄTTRINGSFÖRSLAG:
  1. OTYDLIGHET (high prioritet)
     💡 Överväg att förtydliga...
```

## Nästa steg

- **Frontend-integration**: Visa compliance-scores i dashboard
- **PDF-export**: Automatiska rapporter (V1 klar, förbättras)
- **Golden tests**: Säkerställ kvalitet som RAG-hjärnan (Diamond-tänk)
- **Fler agenter**: Rewrite-agent för förbättring, PDF-agent för rapporter

