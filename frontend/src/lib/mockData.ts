export interface Document {
  id: string;
  name: string;
  type: 'PDF' | 'Word' | 'Text' | 'CSV';
  size: string;
  workspace: string;
  updatedAt: string;
  status: 'indexed' | 'processing' | 'error';
  downloadUrl?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  documentCount: number;
  lastActive: string;
  lastQuestion?: string;
  accuracy?: number;
  activeUsers?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  timestamp: string;
}

export interface Source {
  documentName: string;
  page: number;
  excerpt: string;
}

export interface HistoryItem {
  id: string;
  question: string;
  workspace: string;
  timestamp: string;
}

export interface TestCase {
  id: string;
  question: string;
  expectedAnswer: string;
  actualAnswer?: string;
  status: 'pass' | 'fail' | 'pending';
  accuracy: number;
  sources?: Source[];
  category?: string;
}

export const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Arbetsmiljöpolicy_2024.pdf',
    type: 'PDF',
    size: '2.4 MB',
    workspace: 'HR Policy',
    updatedAt: '2024-01-15',
    status: 'indexed',
    downloadUrl: '/documents/arbetsmiljopolicy_2024.pdf',
  },
  {
    id: '2',
    name: 'Anställningsavtal_Mall.docx',
    type: 'Word',
    size: '156 KB',
    workspace: 'HR Policy',
    updatedAt: '2024-01-14',
    status: 'indexed',
    downloadUrl: '/documents/anstallningsavtal_mall.docx',
  },
  {
    id: '3',
    name: 'Hyreskontrakt_Lokal_A.pdf',
    type: 'PDF',
    size: '1.8 MB',
    workspace: 'Avtal Q1',
    updatedAt: '2024-01-13',
    status: 'indexed',
    downloadUrl: '/documents/hyreskontrakt_lokal_a.pdf',
  },
  {
    id: '4',
    name: 'Leverantörsavtal_TechCorp.pdf',
    type: 'PDF',
    size: '3.2 MB',
    workspace: 'Avtal Q1',
    updatedAt: '2024-01-12',
    status: 'indexed',
    downloadUrl: '/documents/leverantorsavtal_techcorp.pdf',
  },
  {
    id: '5',
    name: 'Projektrapport_Q4.pdf',
    type: 'PDF',
    size: '4.5 MB',
    workspace: 'Konsultrapporter',
    updatedAt: '2024-01-10',
    status: 'processing',
    downloadUrl: '/documents/projektrapport_q4.pdf',
  },
];

export const mockWorkspaces: Workspace[] = [
  {
    id: '1',
    name: 'HR Policy',
    description: 'HR-policies och personalhandböcker',
    icon: '👥',
    documentCount: 12,
    lastActive: '2024-01-15',
    lastQuestion: 'Vad säger policyn om distansarbete?',
    accuracy: 94,
    activeUsers: 8,
  },
  {
    id: '2',
    name: 'Avtal Q1',
    description: 'Avtal och kontrakt för Q1 2024',
    icon: '📄',
    documentCount: 8,
    lastActive: '2024-01-14',
    lastQuestion: 'Vad gäller för lokalhyran?',
    accuracy: 89,
    activeUsers: 5,
  },
  {
    id: '3',
    name: 'Konsultrapporter',
    description: 'Rapporter och utvärderingar från konsulter',
    icon: '📊',
    documentCount: 15,
    lastActive: '2024-01-13',
    lastQuestion: 'Vilka rekommendationer gavs i Q4?',
    accuracy: 92,
    activeUsers: 12,
  },
  {
    id: '4',
    name: 'Fastighetsdokument',
    description: 'Dokument relaterade till fastigheter',
    icon: '🏢',
    documentCount: 6,
    lastActive: '2024-01-10',
    lastQuestion: 'Vilka underhållskrav finns?',
    accuracy: 87,
    activeUsers: 3,
  },
];

export const mockChatHistory: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    content: 'Vad säger policyn om distansarbete?',
    timestamp: '2024-01-15 14:30',
  },
  {
    id: '2',
    role: 'assistant',
    content: 'Enligt arbetsmiljöpolicyn har anställda rätt till distansarbete upp till 3 dagar per vecka efter godkännande från närmaste chef. Företaget tillhandahåller nödvändig utrustning för hemmakontoret.',
    sources: [
      {
        documentName: 'Arbetsmiljöpolicy_2024.pdf',
        page: 12,
        excerpt: 'Anställda har rätt till distansarbete...',
      },
    ],
    timestamp: '2024-01-15 14:30',
  },
];

export const mockHistory: HistoryItem[] = [
  {
    id: '1',
    question: 'Vad säger policyn om distansarbete?',
    workspace: 'HR Policy',
    timestamp: '2024-01-15 14:30',
  },
  {
    id: '2',
    question: 'Vilka är uppsägningstiderna?',
    workspace: 'HR Policy',
    timestamp: '2024-01-15 12:15',
  },
  {
    id: '3',
    question: 'Vad gäller för lokalhyran?',
    workspace: 'Avtal Q1',
    timestamp: '2024-01-14 16:45',
  },
  {
    id: '4',
    question: 'Vilka leveransvillkor har vi med TechCorp?',
    workspace: 'Avtal Q1',
    timestamp: '2024-01-14 11:20',
  },
  {
    id: '5',
    question: 'Sammanfatta projektresultaten från Q4',
    workspace: 'Konsultrapporter',
    timestamp: '2024-01-13 09:30',
  },
];

export const mockTestCases: TestCase[] = [
  {
    id: '1',
    question: 'Vad är uppsägningstiden för tillsvidareanställda?',
    expectedAnswer: '3 månader',
    status: 'pass',
    accuracy: 98,
  },
  {
    id: '2',
    question: 'Hur många semesterdagar har anställda rätt till?',
    expectedAnswer: '25 dagar per år',
    status: 'pass',
    accuracy: 100,
  },
  {
    id: '3',
    question: 'Vad gäller för sjuklön?',
    expectedAnswer: 'Enligt kollektivavtal',
    status: 'fail',
    accuracy: 65,
  },
  {
    id: '4',
    question: 'Vilka förmåner ingår i anställningen?',
    expectedAnswer: 'Friskvårdsbidrag, tjänstepension, försäkringar',
    status: 'pass',
    accuracy: 92,
  },
];
