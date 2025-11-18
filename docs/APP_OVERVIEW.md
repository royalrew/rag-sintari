# App-översikt: Funktioner, Information och Struktur

## Innehållsförteckning
1. [Översikt](#översikt)
2. [Kärnkoncept](#kärnkoncept)
3. [App-sidor](#app-sidor)
4. [Komponenter](#komponenter)
5. [Dataflöde](#dataflöde)
6. [API-integration](#api-integration)
7. [State Management](#state-management)
8. [Navigationsflöde](#navigationsflöde)

---

## Översikt

App-delen är den autentiserade delen av RAG-systemet där användare kan:
- Hantera arbetsytor och dokument
- Ställa frågor via chat
- Se statistik och översikt
- Utvärdera systemets prestanda
- Hantera inställningar och fakturering

**Huvudnavigering:**
- Översikt
- Dokument
- Chat & Svar
- Arbetsytor
- Historik
- Utvärdering
- Inställningar
- Fakturering

---

## Kärnkoncept

### Arbetsyta (Workspace)
En arbetsyta är en container för dokument och queries. Varje arbetsyta har:
- **ID**: Unikt identifierare
- **Namn**: Visningsnamn (t.ex. "HR Policy", "Marketing")
- **Ikon**: Emoji eller ikon för visuell identifiering
- **Beskrivning**: Valfri textbeskrivning
- **Dokumentantal**: Antal indexerade dokument (från backend)
- **Noggrannhet**: Accuracy % baserat på query-resultat (från backend)
- **Senaste fråga**: Senaste query som ställdes (från backend)
- **Senast aktiv**: Senaste aktivitetstidpunkt (från backend)
- **Aktiva användare**: Antal aktiva användare (mock data för nu)

**Aktiv arbetsyta**: En arbetsyta med minst 1 dokument (`documentCount > 0`)

### Vald arbetsyta (Current Workspace)
Den arbetsyta som användaren för närvarande arbetar med:
- Styr vad som visas i Översikt
- Används som standard i Chat
- Kan ändras via header dropdown eller WorkspacesPage
- Sparas i `localStorage` (`'dokument-ai-current-workspace'`)

### Dokument
Ett dokument är en fil som har laddats upp och indexerats:
- **ID**: Unikt identifierare
- **Namn**: Filnamn
- **Typ**: PDF, DOCX, TXT, MD
- **Storlek**: Formaterad storlek (KB/MB)
- **Workspace**: Vilken arbetsyta dokumentet tillhör
- **Status**: 'ready', 'processing', 'error'
- **Uppdaterad**: Datum för senaste uppdatering

---

## App-sidor

### 1. Översikt (`/app/overview`)

**Syfte**: Ge en snabb överblick över systemets status och aktivitet.

**Information som visas**:
- **Statistik-kort** (4 st):
  - **Inlästa dokument**: Totalt antal dokument i vald arbetsyta
  - **Aktiva arbetsytor**: Antal arbetsytor med dokument (för vald arbetsyta: 1 eller 0)
  - **Senaste frågor**: Totalt antal queries i vald arbetsyta
  - **Träffsäkerhet**: Accuracy % för vald arbetsyta

- **Senaste frågor**: Lista över de 5 senaste queries i vald arbetsyta
  - Visar fråga, timestamp, workspace
  - Klickbar → navigerar till Chat

- **Aktiva arbetsytor**: Grid med arbetsytor som har dokument
  - Visar max 6 arbetsytor
  - Varje kort visar: ikon, namn, dokumentantal, senaste fråga, senast aktiv
  - Klickbar → navigerar till WorkspacesPage
  - "Visa alla" knapp om fler än 6

**Dataflöde**:
- Hämtar statistik från `/stats?workspace={currentWorkspace.id}`
- Hämtar senaste queries från `/recent-queries?limit=5&workspace={currentWorkspace.id}`
- Hämtar workspaces från `AppContext` (som redan har backend-data)

**Funktioner**:
- Automatisk uppdatering när `currentWorkspace` ändras
- Loading states med "..."
- Empty states med hjälpsamma meddelanden

---

### 2. Dokument (`/app/documents`)

**Syfte**: Central plats för att hantera alla dokument.

**Status**: Kommer snart (ComingSoonPage)

---

### 3. Chat & Svar (`/app/chat`)

**Syfte**: Huvudgränssnitt för att ställa frågor till RAG-systemet.

**Information som visas**:
- **Chat-meddelanden**: Konversationshistorik
  - Användarmeddelanden (frågor)
  - Assistant-svar med källor
  - Timestamps för varje meddelande

- **Källpanel** (SourceList):
  - **Före query**: Visar tillgängliga dokument i vald arbetsyta (från localStorage)
  - **Efter query**: Visar retrieved sources från backend
  - Varje källa visar: dokumentnamn, sidnummer, snippet
  - Möjlighet att dölja/visa källor

- **Quick Actions**: Fördefinierade frågor för snabb åtkomst
  - 28 olika frågetyper (sammanfattning, extraktion, jämförelse, etc.)
  - Organiserade med ikoner

**Funktioner**:
- **Ställa frågor**: Skicka query till backend `/query`
- **Dokumentuppladdning**: Ladda upp dokument direkt i chatten
- **Test API**: Testa API-anslutning (health check + query test)
- **Fullscreen-läge**: Toggle för fullskärmsläge
- **Mobile source panel**: Sheet-komponent för mobila enheter

**Dataflöde**:
- Hämtar dokument från `localStorage` för vald arbetsyta
- Skickar queries till `/query` med `workspace`, `query`, `mode`
- Sparar uppladdade dokument i `localStorage`
- Uppdaterar `AppContext` efter uppladdning (med retry-logik)

**Workspace-kontext**:
- Använder `currentWorkspace` från `AppContext`
- Varning om arbetsyta saknar dokument
- Automatisk filtrering av dokument per workspace

---

### 4. Arbetsytor (`/app/workspaces`)

**Syfte**: Översikt och hantering av alla arbetsytor.

**Information som visas**:
- **Workspace Grid**: Grid med alla arbetsytor
  - Varje kort visar:
    - Ikon (emoji)
    - Namn
    - Beskrivning
    - Dokumentantal
    - Senaste fråga (om finns)
    - Senast aktiv
    - Noggrannhet % (i hörnet, om finns)

**Funktioner**:
- **Skapa arbetsyta**: Dialog för att skapa ny arbetsyta
  - Namn, beskrivning, ikon
  - Sparas i `localStorage`
- **Klicka på arbetsyta**: 
  - Sätter `currentWorkspace`
  - Navigerar till `WorkspaceDetailPage`

**Dataflöde**:
- Hämtar workspaces från `AppContext` (som redan har backend-data)
- Skapar workspace via `createWorkspace()` API
- Uppdaterar `AppContext` efter skapande

---

### 5. Arbetsyte-detalj (`/app/workspaces/:id`)

**Syfte**: Detaljerad vy för en specifik arbetsyta.

**Information som visas**:
- **Statistik-kort** (4 st, alltid synliga):
  - **Dokument**: Antal dokument i arbetsytan
  - **Noggrannhet**: Accuracy % (visar 0% om saknas)
  - **Aktiva**: Antal aktiva användare (visar "-" om saknas)
  - **Senast**: Senaste aktivitet (visar "-" om saknas)

- **Senaste frågan**: Kort som alltid visas
  - Visar senaste frågan om den finns
  - Visar "Ingen fråga ställd ännu" om saknas

- **Dokumentlista**: Tabell med alla dokument i arbetsytan
  - Visar: namn, typ, storlek, uppdaterad
  - Möjlighet att ta bort dokument
  - Bekräftelsedialog vid borttagning

**Funktioner**:
- **Importera dokument**: Ladda upp dokument till arbetsytan
  - Stöd för PDF, DOCX, TXT, MD
  - Optimistisk UI-uppdatering (ökar dokumentantal direkt)
  - Retry-logik för att synka med backend
- **Ta bort dokument**: Ta bort dokument från arbetsytan
  - Uppdaterar `localStorage`
  - Uppdaterar dokumentantal
- **Redigera arbetsyta**: Dialog för att ändra namn, beskrivning, ikon
  - Sparas i `localStorage`

**Dataflöde**:
- Hämtar workspace-data från `AppContext` + `getWorkspace()` API
- Hämtar statistik från `/stats?workspace={id}`
- Hämtar aktivitet från `/workspace-activity`
- Laddar dokument från `localStorage` för workspace
- Uppladdar dokument via `/upload` endpoint
- Uppdaterar `AppContext` efter ändringar

---

### 6. Historik (`/app/history`)

**Syfte**: Visa historik över alla queries.

**Status**: Kommer snart (ComingSoonPage)

---

### 7. Utvärdering (`/app/evaluation`)

**Syfte**: Utvärdera RAG-systemets prestanda och kvalitet.

**Status**: Kommer snart (ComingSoonPage)

---

### 8. Inställningar (`/app/settings`)

**Syfte**: Hantera användarinställningar.

**Status**: Kommer snart (ComingSoonPage)

---

### 9. Fakturering (`/app/billing`)

**Syfte**: Hantera fakturering och prenumerationer.

**Status**: Kommer snart (ComingSoonPage)

---

### 10. Konto (`/app/account`)

**Syfte**: Hantera användarkonto.

**Status**: Kommer snart (ComingSoonPage)

---

### 11. Hjälp (`/app/help`)

**Syfte**: Hjälp och dokumentation.

**Status**: Kommer snart (ComingSoonPage)

---

### 12. Guide (`/app/guide`)

**Syfte**: Steg-för-steg guide för att komma igång.

**Status**: Kommer snart (ComingSoonPage)

---

### 13. Feedback (`/app/feedback`)

**Syfte**: Skicka feedback till utvecklare.

**Status**: Kommer snart (ComingSoonPage)

---

## Komponenter

### Layout-komponenter

#### Topbar (`components/layout/Topbar.tsx`)
**Syfte**: Huvudnavigering och workspace-väljare.

**Funktioner**:
- **Workspace Dropdown**: 
  - Visar vald arbetsyta
  - Sökfunktion för arbetsytor
  - Toggle "Visa endast aktiva"
  - Filtrerar arbetsytor baserat på sökning och aktiv-status
  - Sätter `currentWorkspace` vid val
- **Navigationslänkar**: Länkar till alla app-sidor
- **Användarmenyn**: Logga ut, konto, inställningar
- **Mobile menu**: Sheet-komponent för mobila enheter

**Dataflöde**:
- Hämtar workspaces från `AppContext`
- Uppdaterar `currentWorkspace` vid val
- Sparar val i `localStorage`

#### Sidebar (`components/layout/Sidebar.tsx`)
**Syfte**: Sidonavigering (desktop).

**Funktioner**:
- Navigationslänkar till alla app-sidor
- Hjälp och feedback-länkar
- Collapsible på mobil

---

### App-komponenter

#### WorkspaceGrid (`components/app/WorkspaceGrid.tsx`)
**Syfte**: Visa arbetsytor i grid-format.

**Information**:
- Ikon, namn, beskrivning
- Dokumentantal
- Senaste fråga (om finns)
- Senast aktiv
- Noggrannhet % (i hörnet)

**Funktioner**:
- Klickbar → triggar `onWorkspaceClick`
- Responsiv grid (1 kolumn mobil, 2 tablet, 3 desktop)

#### DocumentTable (`components/app/DocumentTable.tsx`)
**Syfte**: Visa dokument i tabell-format.

**Information**:
- Namn, typ, storlek, uppdaterad
- Status (om finns)

**Funktioner**:
- Ta bort dokument (med bekräftelsedialog)
- Responsiv (kort på mobil, tabell på desktop)

#### SourceList (`components/app/SourceList.tsx`)
**Syfte**: Visa källor från RAG-queries.

**Information**:
- Dokumentnamn
- Sidnummer
- Snippet (förhandsvisning)

**Funktioner**:
- Visar `availableDocuments` före query
- Visar `sources` efter query
- Möjlighet att dölja/visa källor
- Mobile sheet-komponent

#### ChatMessages (`components/app/ChatMessages.tsx`)
**Syfte**: Visa chat-meddelanden.

**Funktioner**:
- Renderar användar- och assistant-meddelanden
- Visar källor för assistant-meddelanden
- Scrollar automatiskt till botten

#### ChatInput (`components/app/ChatInput.tsx`)
**Syfte**: Input-fält för att skicka queries.

**Funktioner**:
- Text-input med submit
- Loading state
- Disabled när query pågår

---

## Dataflöde

### 1. App-start
```
1. AppContext laddar workspaces från localStorage
2. Hämtar backend-data (stats, activity, recent queries) för varje workspace
3. Laddar sparad currentWorkspace från localStorage
4. Om ingen sparad: väljer default eller första workspace
5. Uppdaterar AppContext med alla data
```

### 2. Workspace-växling
```
1. Användare väljer workspace i header dropdown
2. setCurrentWorkspace(workspace) anropas
3. Sparas i localStorage
4. Alla sidor som använder currentWorkspace uppdateras automatiskt
5. OverviewPage hämtar ny statistik för vald workspace
6. ChatPage använder ny workspace för queries
```

### 3. Dokumentuppladdning
```
1. Användare laddar upp dokument (ChatPage eller WorkspaceDetailPage)
2. Optimistisk UI-uppdatering (ökar documentCount direkt)
3. Skickar fil till /upload endpoint
4. Backend indexerar dokumentet
5. Retry-logik: väntar och hämtar stats från backend (5 försök med ökande delay)
6. Uppdaterar AppContext med ny data
7. Uppdaterar localStorage med dokument
```

### 4. Query i Chat
```
1. Användare skickar query
2. Lägger till user message i state
3. Skickar query till /query endpoint med currentWorkspace
4. Backend returnerar answer + sources
5. Lägger till assistant message i state
6. Visar sources i SourceList
```

### 5. Workspace-skapande
```
1. Användare skapar workspace via CreateWorkspaceDialog
2. Sparas i localStorage via createWorkspace() API
3. refreshWorkspaces() anropas
4. AppContext laddar om alla workspaces med backend-data
5. Topbar och WorkspacesPage uppdateras automatiskt
```

---

## API-integration

### Backend-endpoints som används

#### `/stats?workspace={id}`
**Används i**: OverviewPage, WorkspaceDetailPage, AppContext

**Returnerar**:
```typescript
{
  total_documents: number;
  total_workspaces: number; // 1 eller 0 för vald workspace
  total_queries: number;
  accuracy: number; // 0-100
}
```

#### `/recent-queries?limit={n}&workspace={id}`
**Används i**: OverviewPage, AppContext

**Returnerar**:
```typescript
{
  queries: [
    {
      id: string;
      query: string;
      timestamp: string;
      workspace?: string;
      mode?: string;
      success: boolean;
    }
  ]
}
```

#### `/workspace-activity`
**Används i**: AppContext, WorkspaceDetailPage

**Returnerar**:
```typescript
{
  [workspace_id]: {
    workspace_id: string;
    last_active?: string;
    query_count: number;
  }
}
```

#### `/query`
**Används i**: ChatPage

**Request**:
```typescript
{
  query: string;
  workspace: string;
  mode?: 'answer' | 'summary' | 'extract';
  document_ids?: string[];
  workspace_ids?: string[];
}
```

**Response**:
```typescript
{
  answer: string;
  sources: [
    {
      document_name: string;
      page_number: number;
      snippet: string;
    }
  ];
  mode: string;
}
```

#### `/upload`
**Används i**: ChatPage, WorkspaceDetailPage

**Request**: FormData
- `file`: File
- `workspace`: string

**Response**:
```typescript
{
  success: boolean;
  document_id: string;
  document_name: string;
  chunks_created: number;
  message: string;
}
```

#### `/health`
**Används i**: ChatPage (test-knapp)

**Returnerar**:
```typescript
{
  status: 'ok';
  version: string;
}
```

---

## State Management

### AppContext (`context/AppContext.tsx`)

**State**:
- `currentWorkspace`: Workspace | null
- `workspaces`: Workspace[]

**Funktioner**:
- `setCurrentWorkspace(workspace)`: Sätter vald arbetsyta
- `refreshWorkspaces()`: Laddar om alla workspaces med backend-data

**Persistence**:
- `currentWorkspace` sparas i `localStorage` (`'dokument-ai-current-workspace'`)
- `workspaces` sparas i `localStorage` (`'dokument-ai-workspaces'`)

**Data-hämtning**:
- Hämtar stats för varje workspace från `/stats`
- Hämtar senaste frågan från `/recent-queries`
- Hämtar aktivitet från `/workspace-activity`
- Kombinerar all data till workspace-objekt

### LocalStorage-nycklar

- `'dokument-ai-current-workspace'`: ID för vald arbetsyta
- `'dokument-ai-workspaces'`: Array med alla workspaces
- `'dokument-ai-documents-{workspaceId}'`: Array med dokument för specifik workspace
- `'dokument-ai-show-active-workspaces-only'`: Boolean för toggle i header dropdown

---

## Navigationsflöde

### Primära flöden

#### 1. Första gången användaren loggar in
```
Login → OverviewPage (default workspace vald)
  → Se tom översikt
  → Skapa workspace eller ladda upp dokument
  → Börja ställa frågor i Chat
```

#### 2. Skapa och använda arbetsyta
```
WorkspacesPage → CreateWorkspaceDialog
  → Ny workspace skapad
  → Klicka på workspace → WorkspaceDetailPage
  → Ladda upp dokument
  → Gå till Chat → Ställ frågor
```

#### 3. Växla mellan arbetsytor
```
Header Dropdown → Välj workspace
  → currentWorkspace uppdateras
  → OverviewPage visar ny statistik
  → Chat använder ny workspace
```

#### 4. Ställa frågor
```
ChatPage → Skriv fråga → Skicka
  → Query skickas till backend med currentWorkspace
  → Svar + källor visas
  → Källor kan döljas/visas
```

---

## Viktiga designbeslut

### 1. Workspace-centrerat
- Allt är kopplat till en vald arbetsyta
- `currentWorkspace` styr vad som visas
- Enkel växling via header dropdown

### 2. Optimistisk UI
- Dokumentantal uppdateras direkt vid uppladdning
- Retry-logik synkar med backend i bakgrunden
- Bättre användarupplevelse (känns snabbare)

### 3. Backend-data prioriteras
- Mock data tas bort när backend-data finns
- Accuracy, documentCount, lastQuestion kommer från backend
- Fallback till 0 eller undefined om backend saknas

### 4. LocalStorage som cache
- Workspaces och dokument sparas lokalt
- Snabbare initial laddning
- Synkas med backend vid behov

### 5. Konsekvent terminologi
- "Aktiv arbetsyta" = har dokument (`documentCount > 0`)
- "Vald arbetsyta" = `currentWorkspace`
- Tydlig skillnad mellan begreppen

---

## Framtida förbättringar

### Kort sikt
- [ ] Tydligare visuell feedback för vald arbetsyta
- [ ] Snabb växling direkt från OverviewPage
- [ ] Varning i Chat om arbetsyta saknar dokument
- [ ] Bättre error handling vid API-fel

### Medellång sikt
- [ ] Real-time uppdateringar (WebSocket)
- [ ] Offline-stöd med sync
- [ ] Avancerad sökning i dokument
- [ ] Bulk-uppladdning av dokument

### Lång sikt
- [ ] Multi-user support
- [ ] Workspace-delning
- [ ] Avancerad analytics
- [ ] Custom prompts per workspace

---

## Sammanfattning

App-delen är byggd kring konceptet **arbetsytor** där varje arbetsyta är en container för dokument och queries. Användaren arbetar alltid med en **vald arbetsyta** som styr vad som visas i översikt, chat och dokumenthantering.

**Huvudflöde**:
1. Välj arbetsyta (header dropdown)
2. Se översikt (OverviewPage)
3. Ladda upp dokument (WorkspaceDetailPage eller ChatPage)
4. Ställ frågor (ChatPage)
5. Se resultat med källor

**Data kommer från**:
- Backend API (stats, queries, activity)
- LocalStorage (workspaces, documents, currentWorkspace)
- AppContext (centraliserad state management)

**Viktiga sidor**:
- **OverviewPage**: Översikt för vald arbetsyta
- **ChatPage**: Huvudgränssnitt för queries
- **WorkspacesPage**: Hantera alla arbetsytor
- **WorkspaceDetailPage**: Detaljer för specifik arbetsyta

