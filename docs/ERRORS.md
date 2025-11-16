# RAG Error Model

Detta dokument beskriver hur RAG-motorn exponerar fel mot klienter via JSON. Alla fel svarar med samma grundstruktur.

## Grundformat

Alla fel returneras som JSON med följande form:

```json
{
  "error": true,
  "type": "LlmError",
  "code": "LLM_ERROR",
  "message": "Kunde inte generera svar just nu.",
  "request_id": "2025-11-16-abc123",
  "details": {
    "stage": "llm"
  }
}
```

### Fält

- **error (bool)**: Alltid true för fel.
- **type (string)**: Klassnamnet för felet (t.ex. ValidationError, RetrievalError, LlmError).
- **code (string, stabil)**: Maskinläsbar felkod. Används för UI-logik, monitoring och klienter.
- **message (string)**: Mänskligt läsbar text. Säker att visa för användare (inga interna stacktraces).
- **request_id (string, optional)**: Koppling mellan klient, API-logg och query_logger. Används för felsökning.
- **details (object, optional)**: Extra metadata för logg/diagnostik (t.ex. {"stage": "retriever"}). Behöver inte visas i UI, men är värdefullt i admin/debug.

---

## Felklasser och koder

### 1) ValidationError
- Klass: ValidationError
- code: VALIDATION_ERROR
- http_status: 400

Används vid fel i input, t.ex. tom fråga, för lång query, ogiltiga parametrar.

Exempel:
```json
{
  "error": true,
  "type": "ValidationError",
  "code": "VALIDATION_ERROR",
  "message": "Frågan får inte vara tom.",
  "request_id": "2025-11-16-req-001",
  "details": { "field": "query" }
}
```

Rekommenderat UI-beteende:
- Visa tydligt felmeddelande nära fältet
- Markera inputfält
- Ingen retry – användaren korrigerar input

### 2) RetrievalError
- Klass: RetrievalError
- code: RETRIEVAL_ERROR
- http_status: 502

Problem i retrieval-lagret (index, databas, filsystem, BM25/embeddings osv).

Exempel:
```json
{
  "error": true,
  "type": "RetrievalError",
  "code": "RETRIEVAL_ERROR",
  "message": "Kunde inte hämta källor just nu.",
  "request_id": "2025-11-16-req-002",
  "details": { "stage": "retriever", "workspace_id": "default" }
}
```

Rekommenderat UI-beteende:
- Visa neutral text: "Vi kunde inte hämta underlaget just nu. Prova igen om en stund."
- Visa "Försök igen"-knapp
- Logga internt på code + details

### 3) LlmError
- Klass: LlmError
- code: LLM_ERROR
- http_status: 502

Problem när modellen ska generera svar (timeout, API-fel etc.).

Exempel:
```json
{
  "error": true,
  "type": "LlmError",
  "code": "LLM_ERROR",
  "message": "Kunde inte generera svar just nu.",
  "request_id": "2025-11-16-req-003",
  "details": { "stage": "llm" }
}
```

Rekommenderat UI-beteende:
- Visa: "Vi kunde inte generera ett svar just nu. Prova igen."
- Retry + ev. hint om belastning vid frekventa fel
- I admin: gruppera LLM_ERROR för driftanalys

### 4) RateLimitError
- Klass: RateLimitError
- code: RATE_LIMITED
- http_status: 429

Används när motorn/APIn begränsar antalet anrop.

Exempel:
```json
{
  "error": true,
  "type": "RateLimitError",
  "code": "RATE_LIMITED",
  "message": "För många förfrågningar. Vänta en stund och försök igen.",
  "request_id": "2025-11-16-req-004",
  "details": { "limit": "user_per_minute" }
}
```

Rekommenderat UI-beteende:
- Vänlig text om att vänta
- Disable "Skicka" en kort stund (ev. countdown)
- I admin: använd details.limit för analys

### 5) InternalRagError
- Klass: InternalRagError
- code: INTERNAL_ERROR
- http_status: 500

Används när du explicit vill markera ett internt fel i RAG-lagret.

Exempel:
```json
{
  "error": true,
  "type": "InternalRagError",
  "code": "INTERNAL_ERROR",
  "message": "Ett internt fel uppstod i RAG-motorn.",
  "request_id": "2025-11-16-req-005",
  "details": { "stage": "answer_pipeline" }
}
```

Rekommenderat UI-beteende:
- Visa generellt tekniskt fel
- Ingen teknisk detalj till användare
- Använd request_id + loggar för felsökning

### 6) Oväntade fel (Exception)
Alla andra exceptions (ej RagError) hanteras som:
- code: INTERNAL_ERROR, http_status: 500, type: UnexpectedError

Exempel:
```json
{
  "error": true,
  "type": "UnexpectedError",
  "code": "INTERNAL_ERROR",
  "message": "Ett internt fel uppstod. Försök igen senare.",
  "request_id": "2025-11-16-req-006"
}
```

Detaljer loggas via query_logger/serverlogg men skickas inte till klient.

UI-beteende: samma som InternalRagError.

---

## Samspel med query_logger

Alla fel går igenom både:
- `rag/error_handling.py` → JSON-respons
- `rag/query_logger.py` → JSONL-logg

`request_id` länkar samman klient, API-respons och loggfil (`logs/rag_queries.jsonl`).

Felsökning:
1. Ta `request_id` från UI
2. Sök i `logs/rag_queries.jsonl`
3. Analysera `code`, `type`, `details`

---

## Rekommenderad UI-nivå

| code            | Visa för användare? | Typ av meddelande                   |
|-----------------|---------------------|-------------------------------------|
| VALIDATION_ERROR| Ja                  | Konkreta fel vid input              |
| RETRIEVAL_ERROR | Ja                  | Neutral: "kunde inte hämta data"    |
| LLM_ERROR       | Ja                  | Neutral: "kunde inte generera svar" |
| RATE_LIMITED    | Ja                  | För många anrop, vänlig timeout     |
| INTERNAL_ERROR  | Ja (generellt)      | Allmänt fel, inga tekniska detaljer |

Admin/dev läser `details` + loggar för exakt diagnos.
