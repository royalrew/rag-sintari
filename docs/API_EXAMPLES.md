# RAG API Exempel

Praktiska exempel för hur man använder RAG-motorn med olika presentation modes och use cases.

---

## Consulting-rapport (Strukturerad)

Perfekt för rapporter, dokumentation och strukturerad output.

### Request
```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "Sammanfatta våra policydokument",
    "workspace": "default",
    "mode": "summary",
    "presentation_mode": "consulting"
  }'
```

### Response
```json
{
  "answer": "### Sammanfattning av policydokument\n\n• Punkt 1 om policy\n• Punkt 2 om policy\n• Punkt 3 om policy\n\nKällor:\n• policy.pdf s.1\n• policy.pdf s.2",
  "sources": [
    {
      "document_name": "policy.pdf",
      "page_number": 1,
      "snippet": "..."
    }
  ],
  "mode": "summary"
}
```

### Config
```yaml
# config/rag_config.yaml
output:
  presentation_mode: "consulting"
  include_sources_in_answer: true
```

---

## Chatläge (Konversationellt)

Perfekt för interaktiva chattar där källor visas i sidebar.

### Request
```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "Vad säger avtalet om uppsägningstid?",
    "workspace": "default",
    "mode": "answer",
    "presentation_mode": "chat"
  }'
```

### Response
```json
{
  "answer": "Enligt avtalet är uppsägningstiden 3 månader från att uppsägningen meddelas.",
  "sources": [
    {
      "document_name": "avtal.pdf",
      "page_number": 5,
      "snippet": "..."
    }
  ],
  "mode": "answer"
}
```

### Config
```yaml
# config/rag_config.yaml
output:
  presentation_mode: "chat"
  include_sources_in_answer: false  # Visa källor i UI sidebar
```

---

## Raw Mode (Tekniskt)

Perfekt för tekniska/utvecklingssyften med minimal formatering.

### Request
```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "Lista funktionerna i systemet",
    "workspace": "default",
    "mode": "extract",
    "presentation_mode": "raw"
  }'
```

### Response
```json
{
  "answer": "Q&A, sammanfattning, extraktion, hybrid retrieval",
  "sources": [...],
  "mode": "extract"
}
```

### Config
```yaml
# config/rag_config.yaml
output:
  presentation_mode: "raw"
  include_sources_in_answer: true
```

---

## JavaScript/TypeScript Exempel

### Consulting Mode
```typescript
const response = await fetch('http://localhost:8000/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    query: 'Sammanfatta våra policydokument',
    workspace: 'default',
    mode: 'summary',
    presentation_mode: 'consulting'
  })
});

const data = await response.json();
console.log(data.answer);  // Strukturerad text med rubriker och källor
```

### Chat Mode
```typescript
const response = await fetch('http://localhost:8000/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    query: 'Vad säger avtalet om uppsägningstid?',
    workspace: 'default',
    mode: 'answer',
    presentation_mode: 'chat'
  })
});

const data = await response.json();
console.log(data.answer);  // Konversationellt svar
console.log(data.sources); // Källor för sidebar-visning
```

---

## Python Exempel

```python
import requests

# Consulting Mode
response = requests.post(
    'http://localhost:8000/query',
    headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    },
    json={
        'query': 'Sammanfatta våra policydokument',
        'workspace': 'default',
        'mode': 'summary',
        'presentation_mode': 'consulting'
    }
)

data = response.json()
print(data['answer'])  # Strukturerad text med rubriker och källor
print(data['sources'])  # Källlista
```

---

## Output Formattering

Alla svar formateras automatiskt:
- `- punkt` → `• punkt` (automatisk bullet-konvertering)
- Whitespace och radbrytningar normaliseras
- Max 2 blanka rader i rad

Detta gör att output alltid är konsekvent och professionell, oavsett vad LLM producerar.

