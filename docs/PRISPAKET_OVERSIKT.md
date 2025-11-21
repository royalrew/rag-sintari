# Prispaket - Översikt (Credits-baserat)

## 📊 Snabbjämförelse

| Funktion | Start | Pro | Enterprise | Credits (PAYG) |
|----------|-------|-----|------------|----------------|
| **Pris** | 399 kr/mån | 1 290 kr/mån | 9 900 kr/mån | Ingen månadsavgift |
| **Credits per månad** | 500 credits | 3 000 credits | Obegränsade / SLA | Köp credits när du vill |
| **Arbetsytor** | 3 | 10 | Obegränsat | Obegränsat |
| **Användare** | 1 | 5 | Obegränsat | 1 (tillägg möjligt) |
| **Filformat** | PDF, DOCX, TXT, MD | + CSV, XLSX | Alla | + CSV, XLSX |
| **Retrieval** | Embeddings | Hybrid + Reranking | Hybrid + Reranking | Hybrid + Reranking |
| **Historik** | 30 dagar | 365 dagar | Obegränsat | 365 dagar |
| **API** | ❌ | ❌ | ✅ | ❌ |
| **SSO** | ❌ | ❌ | ✅ | ❌ |
| **Privat instans** | ❌ | ❌ | ✅ | ❌ |

---

## 💳 Credits – Hur det fungerar

**Credits används för:**
- Frågor
- Indexering av dokument
- Embeddings
- Generering av rapporter
- PDF Exporter Agent
- AuditAgent

**Prisexempel:**
- 1 fråga = 1 credit
- 1 dokumentsida vid indexering = 0.2 credits
- 1000 embeddings = 3 credits
- PDF Exporter Agent = 5 credits
- AuditAgent = 10 credits

*(Kan enkelt justeras internt i pricing.py)*

---

## 📦 Start - 399 kr/månad
**För mindre team och SME**

### ✅ Inkluderar:
- **500 credits per månad**
- **3 arbetsytor**
- **1 användare**
- **Stöd: PDF, DOCX, TXT, MD**
- **Embeddings-baserad retrieval**
- **Källhänvisning**
- **Export: TXT & PDF**
- **Historik: 30 dagar**

### ❌ Begränsningar:
- Ingen hybrid retrieval
- Ingen CSV/Excel-support
- Ingen team-funktion
- Ingen API-access
- Långsammare indexering

---

## 🚀 Pro - 1 290 kr/månad ⭐ POPULÄRAST
**För växande företag**

### ✅ Inkluderar:
- **3 000 credits per månad**
  - Förbrukas för: frågor, indexering, rapporter, embeddings
- **10 arbetsytor**
- **5 användare**
- **Stöd: PDF, DOCX, TXT, MD, CSV, XLSX**
- **Hybrid retrieval (BM25 + embeddings + reranking)**
- **Snabb indexering**
- **AI-sök i alla dokument**
- **Historik: 365 dagar**
- **Eval/precision-panel**
- **Riskanalys (beta)**
- **Export: PDF, DOCX, XLSX**
- **AuditAgent – Basversion**
- **PDF Exporter Agent – Bas**

### ❌ Begränsningar:
- Ingen privat instans
- Ingen SSO
- Begränsad audit/prestanda-granskning

---

## 🏢 Enterprise - 9 900 kr/månad
**För stora organisationer**

### 💰 Ytterligare kostnader:
- **Onboarding: 45 000–120 000 kr**
- **Avtalstid: 12 månader**

### ✅ Inkluderar:
- **Oändliga credits med SLA**
  - (Eller kreditpool enligt avtal: 50 000–250 000 credits/månad)
- **Obegränsade användare**
- **Obegränsade arbetsytor**
- **Privat instans / egen databas**
- **SSO (Azure AD / Google Workspace)**
- **Audit log + säkerhetsmoduler**
- **Prioriterad support (SLA & 4h svarstid)**
- **Avancerad eval-suite**
- **Dedikerade embeddings-modeller**
- **API-access**
- **On-prem deployment (valfritt)**
- **Full AuditAgent**
- **Full PDF Exporter Agent (brandad, grafer, AI-analys)**
- **Kundanpassade pipelines**
- **Dedikerad account manager**

### ❌ Begränsningar:
- Kräver offert
- Kräver DPA

---

## 💳 Credits (Pay-as-you-go) - Ingen månadsavgift
**Betala endast för credits du köper**

### ✅ Köppaket:
- **100 credits – 99 kr**
- **500 credits – 399 kr**
- **2 000 credits – 1 299 kr**
- **10 000 credits – 4 990 kr** → + bonus +15%
- **50 000 credits – offert** → För större team

### ✅ Inkluderar:
- **Full Pro-funktionalitet**
- **365 dagar historik**
- **Hybrid retrieval**
- **Snabb indexering**

### ✔ Perfekt för:
- Oregelbunden användning
- Testperioder
- Ad-hoc analyser
- Företag som vill undvika abonnemang

---

## 📝 Allmänna villkor

- Alla priser är **exklusive moms**
- **Credits gäller i 12 månader**
- **Credits återbetalas ej**
- Uppgraderingar görs direkt i Stripe Checkout
- Enterprise kräver undertecknat avtal och DPA

