import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChatMessages } from '@/components/app/ChatMessages';
import { ChatInput } from '@/components/app/ChatInput';
import { SourceList } from '@/components/app/SourceList';
import { ChatMessage, Document, HistoryItem } from '@/lib/mockData';
import { askQuestion } from '@/api/chat';
import { uploadDocument } from '@/api/documents';
import { saveHistoryItem } from '@/api/history';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { routes } from '@/lib/routes';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Maximize2, Minimize2, Zap, Lightbulb, TestTube } from 'lucide-react';
import { checkRAGHealth, queryRAG } from '@/api/ragClient';

const QUICK_ACTIONS = [
  { id: '1', question: 'Vad handlar detta dokument om i stora drag?', icon: '📘' },
  { id: '2', question: 'Ge mig en kort sammanfattning av policyn', icon: '📘' },
  { id: '3', question: 'Vad är de viktigaste punkterna?', icon: '📘' },
  { id: '4', question: 'Vad säger HR-policyn om distansarbete?', icon: '👩‍💼' },
  { id: '5', question: 'Vad gäller för ersättning för hemarbete?', icon: '👩‍💼' },
  { id: '6', question: 'Vilka regler gäller för sjukfrånvaro?', icon: '👩‍💼' },
  { id: '7', question: 'Vilka rättigheter och skyldigheter\nhar anställda?', icon: '👩‍💼' },
  { id: '8', question: 'Finns det krav på arbetsmiljöutrustning\nvid hemarbete?', icon: '👩‍💼' },
  { id: '9', question: 'Vilka skyldigheter har arbetsgivaren\nenligt detta dokument?', icon: '🧾' },
  { id: '10', question: 'Vad måste dokumentet innehålla enligt lagen?', icon: '🧾' },
  { id: '11', question: 'Identifiera riskpunkter eller oklarheter', icon: '🧾' },
  { id: '12', question: 'Hur ska onboarding enligt denna policy gå till?', icon: '💼' },
  { id: '13', question: 'Finns det krav för rapportering av incidenter?', icon: '💼' },
  { id: '14', question: 'Vilka steg ska en chef följa\nvid en personalfråga?', icon: '💼' },
  { id: '15', question: 'Hitta alla avsnitt där [ämne] nämns', icon: '🎯' },
  { id: '16', question: 'Vilka regler gäller för användning\nav tjänstemobil?', icon: '🎯' },
  { id: '17', question: 'Jämför detta dokument med [Annat dokument]\n– vad skiljer sig?', icon: '🔍' },
  { id: '18', question: 'Finns det konflikt mellan dokument A och B?', icon: '🔍' },
  { id: '19', question: 'Skriv en kort förklaring jag kan skicka\ntill en kollega', icon: '📑' },
  { id: '20', question: 'Sammanfatta detta så att en nyanställd förstår', icon: '📑' },
  { id: '21', question: 'Skapa en checklista baserat på policyn', icon: '📑' },
  { id: '22', question: 'Är detta dokument konsekvent skrivet?', icon: '🔧' },
  { id: '23', question: 'Finns det oklarheter eller saknade delar?', icon: '🔧' },
  { id: '24', question: 'Vilka punkter kan förbättras för tydlighet?', icon: '🔧' },
  { id: '25', question: 'Vilka regler är viktigast för mig som anställd?', icon: '⭐' },
  { id: '26', question: 'Vad måste chefer känna till enligt policyn?', icon: '⭐' },
  { id: '27', question: 'Vilka deadlines eller tidsramar nämns?', icon: '⭐' },
  { id: '28', question: 'Finns det säkerhets- eller sekretessregler?', icon: '⭐' },
];

export const ChatPage = () => {
  const { currentWorkspace, refreshWorkspaces, workspaces } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: {
      historyId?: string;
      preloadHistory?: Pick<HistoryItem, 'id' | 'question' | 'answer' | 'workspace' | 'sources'>;
      mode?: 'followUp' | 'open';
    };
  };
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [hasPreloadedHistory, setHasPreloadedHistory] = useState(false);
  const mode = location.state?.mode;

  // All documents in current workspace (already filtered by localStorage key)
  const workspaceDocuments = documents;

  // Load documents from localStorage when user changes
  // Note: Documents are now stored per user (workspace = user_id)
  useEffect(() => {
    if (user?.id) {
      const workspaceId = String(user.id);
      const key = `dokument-ai-documents-${workspaceId}`;
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const saved: Document[] = JSON.parse(raw);
          setDocuments(saved);
        } else {
          // Clear documents if workspace has no documents
          setDocuments([]);
        }
      } catch (err) {
        console.error('Failed to load documents', err);
        setDocuments([]);
      }
    } else {
      // Clear documents if no user logged in
      setDocuments([]);
    }
  }, [user?.id]);

  // Memoize document IDs for dependency
  const workspaceDocumentIds = useMemo(
    () => workspaceDocuments.map(d => d.id).join(','),
    [workspaceDocuments]
  );

  // Auto-select all documents by default when they are first loaded
  // Also clean up invalid document IDs from selectedDocumentIds
  useEffect(() => {
    if (workspaceDocuments.length === 0) {
      setSelectedDocumentIds([]);
      return;
    }

    const allDocumentIds = workspaceDocuments.map(doc => doc.id);
    setSelectedDocumentIds(prev => {
      // Remove invalid IDs (documents that no longer exist)
      const validSelectedIds = prev.filter(id => allDocumentIds.includes(id));
      // Add missing documents that should be auto-selected
      const missingIds = allDocumentIds.filter(id => !validSelectedIds.includes(id));
      if (missingIds.length > 0) {
        return [...new Set([...validSelectedIds, ...missingIds])];
      }
      return validSelectedIds;
    });
  }, [workspaceDocumentIds, workspaceDocuments]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Preload history item if navigated from history detail page
  useEffect(() => {
    if (!location.state?.preloadHistory || hasPreloadedHistory) return;

    const { preloadHistory } = location.state;

    const ts = new Date().toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMessage: ChatMessage = {
      id: `history-user-${preloadHistory.id}`,
      role: 'user',
      content: preloadHistory.question,
      timestamp: ts,
    };

    const assistantMessage: ChatMessage = {
      id: `history-assistant-${preloadHistory.id}`,
      role: 'assistant',
      content: preloadHistory.answer,
      timestamp: ts,
      sources: preloadHistory.sources?.map((s) => ({
        documentName: s.documentName,
        page: s.page,
        excerpt: '', // History sources don't have excerpt
      })),
    };

    setMessages([userMessage, assistantMessage]);
    setHasPreloadedHistory(true);
  }, [location.state?.preloadHistory, hasPreloadedHistory]);

  const handleSend = async (message: string, documentIds: string[], workspaceIds: string[]) => {
    // Use user.id as workspace (workspace = user_id)
    if (!user?.id) {
      toast.error('Du måste vara inloggad för att ställa frågor.');
      return;
    }

    // Use user.id as workspace (string)
    const workspaceKey = String(user.id);

    // Combine selected documents from SourceList with any from ChatInput
    const allDocumentIds = [...new Set([...selectedDocumentIds, ...documentIds])];
    
    // Filter to only include IDs that actually exist in workspaceDocuments
    // and convert to document names (backend expects document_name or document_id)
    const validDocumentIds = allDocumentIds.filter(id => 
      workspaceDocuments.some(doc => doc.id === id)
    );
    
    const documentNames = validDocumentIds.length > 0
      ? validDocumentIds.map(id => {
          const doc = workspaceDocuments.find(d => d.id === id);
          return doc!.name; // Safe to use ! since we filtered above
        })
      : undefined;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString('sv-SE', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
    };
    
    // Check if this is the first question (before adding user message)
    const isFirstQuestion = messages.length === 0;
    
    setMessages([...messages, userMessage]);
    setIsLoading(true);

    try {
      const { answer } = await askQuestion({
        question: message,
        workspaceId: workspaceKey,
        documentIds: documentNames,
        workspaceIds,
      });
      
      // Add AI feedback about sources if this is the first question
      if (isFirstQuestion && documentNames && documentNames.length > 0) {
        const totalDocuments = workspaceDocuments.length;
        const usedDocuments = documentNames.length; // This is now accurate since we filtered invalid IDs
        
        // Create feedback message with actual document names
        let feedbackText: string;
        let feedbackType: 'hint' | 'sources';
        
        if (usedDocuments === totalDocuments && totalDocuments === 1) {
          // 1 av 1 dokument - visa dokumentnamnet
          feedbackText = `AI använde 1 av 1 dokument (${documentNames[0]})`;
          feedbackType = 'hint';
        } else if (usedDocuments === totalDocuments) {
          // Alla dokument används - visa antal
          feedbackText = `AI använde alla ${usedDocuments} dokument`;
          feedbackType = 'hint';
        } else if (usedDocuments === 1) {
          // 1 valt dokument av flera - visa dokumentnamnet
          feedbackText = `AI använde 1 vald källa (${documentNames[0]})`;
          feedbackType = 'sources';
        } else {
          // Flera valda källor - visa antal
          feedbackText = `AI använde ${usedDocuments} valda källor`;
          feedbackType = 'sources';
        }
        
        const feedbackMessage: ChatMessage = {
          id: `feedback-${Date.now()}`,
          role: 'assistant',
          content: feedbackText,
          timestamp: new Date().toLocaleTimeString('sv-SE', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          isFeedback: true,
          feedbackType: feedbackType,
        };
        
        setMessages((prev) => [...prev, feedbackMessage, answer]);
      } else {
        setMessages((prev) => [...prev, answer]);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Kunde inte få svar från AI just nu.';
      toast.error(errorMessage);

      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Jag kunde tyvärr inte svara just nu. Prova igen om en stund.',
        timestamp: new Date().toLocaleTimeString('sv-SE', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentToggle = (documentId: string, checked: boolean) => {
    if (checked) {
      setSelectedDocumentIds(prev => [...prev, documentId]);
    } else {
      setSelectedDocumentIds(prev => prev.filter(id => id !== documentId));
    }
  };

  const handleSaveMessage = async (message: ChatMessage) => {
    if (!currentWorkspace) {
      toast.error('Välj en arbetsyta innan du sparar.');
      return;
    }

    // hitta senaste user-meddelandet före detta svar
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');

    const now = new Date();
    const iso = now.toISOString();

    const sessionTitle =
      message.title ||
      `Sparad fråga – ${now.toLocaleDateString('sv-SE', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      })}`;

    // Use user.id as workspace (workspace = user_id)
    const workspaceId = user?.id ? String(user.id) : 'default';
    
    const historyItem: HistoryItem = {
      id: `${Date.now()}-${message.id}`,
      question: lastUserMsg?.content || 'Okänd fråga',
      answer: message.content,
      workspace: workspaceId,
      timestamp: iso,
      sessionId: workspaceId,
      sessionTitle,
      isFavorite: false,
      // plocka över källor om de finns på meddelandet
      sources: message.sources?.map((s) => ({
        documentName: s.documentName,
        page: s.page,
        documentId: s.documentId,
      })),
    };

    try {
      await saveHistoryItem(historyItem);

      toast.success('Svaret sparades i historiken.', {
        action: {
          label: 'Visa historik',
          onClick: () => navigate(routes.app.history),
        },
      });
    } catch (err) {
      console.error('Failed to save history item:', err);
      toast.error('Kunde inte spara svaret i historiken.');
    }
  };

  const handleQuickAction = (question: string) => {
    handleSend(question, [], []);
    setIsQuickActionsOpen(false);
  };

  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');
  const currentSources = lastAssistantMessage?.sources || [];


  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Use user.id as workspace (workspace = user_id)
    if (!user?.id) {
      toast.error('Du måste vara inloggad för att ladda upp dokument.');
      e.target.value = '';
      return;
    }

    // Use user.id as workspace (string)
    const workspaceKey = String(user.id);

    const toastId = toast.loading('Laddar upp dokument...');
    try {
      const newDocument = await uploadDocument(file, workspaceKey);
      
      // Update documents state and localStorage in one go (functional update)
      setDocuments(prev => {
        const updated = [newDocument, ...prev];
        const key = `dokument-ai-documents-${workspaceKey}`;
        try {
          localStorage.setItem(key, JSON.stringify(updated));
        } catch (err) {
          console.error('Failed to save document to localStorage', err);
        }
        return updated;
      });
      
      // Auto-select the newly uploaded document (without duplicates)
      setSelectedDocumentIds(prev => [...new Set([...prev, newDocument.id])]);
      
      // Update workspaces in AppContext (to update document count)
      // Backend indexes the document, so we need to wait a bit and retry
      if (refreshWorkspaces) {
        const refreshWorkspaceStats = async (retries = 3, delay = 1000) => {
          for (let i = 0; i < retries; i++) {
            try {
              await new Promise(resolve => setTimeout(resolve, delay * (i + 1))); // Ökande delay
              await refreshWorkspaces();
              // Om refresh lyckades, bryt loopen
              break;
            } catch (error) {
              if (i === retries - 1) {
                console.error('Failed to refresh workspaces after upload:', error);
              }
            }
          }
        };
        // Starta refresh i bakgrunden (blockerar inte toast)
        refreshWorkspaceStats();
      }
      
      toast.success('Dokument uppladdat och indexerat! Nu kan du ställa frågor om det.', {
        id: toastId,
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Okänt fel vid uppladdning';
      toast.error(`Fel vid uppladdning: ${errorMessage}`, {
        id: toastId,
      });
      console.error('Upload error:', error);
    } finally {
      e.target.value = '';
    }
  };

  const handleTestAPI = async () => {
    console.log('🧪 Testing RAG API connection...');
    console.log('📍 BASE_URL:', (import.meta as any).env?.VITE_RAG_API_URL || 'auto-detected');
    console.log('📍 Current workspace:', currentWorkspace?.name || currentWorkspace?.id || 'default');
    
    const toastId = toast.loading('Testar API-anslutning...');
    
    try {
      // Test 1: Health check
      console.log('1️⃣ Testing /health endpoint...');
      const health = await checkRAGHealth();
      console.log('✅ Health check passed:', health);
      toast.loading('Health check OK, testar query...', { id: toastId });
      
      // Test 2: Query
      console.log('2️⃣ Testing /query endpoint...');
      const workspaceKey = user?.id ? String(user.id) : 'default';
      const queryResponse = await queryRAG({
        query: 'Vad stöder RAG-motorn?',
        workspace: workspaceKey,
        mode: 'answer',
      });
      console.log('✅ Query test passed:', queryResponse);
      
      toast.success('API-test lyckades! Se konsolen för detaljer.', { id: toastId });
    } catch (error: any) {
      console.error('❌ API test failed:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
        stack: error?.stack,
      });
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : error?.data?.message || 'Okänt fel';
      
      toast.error(`API-test misslyckades: ${errorMessage}`, { id: toastId });
    }
  };

  return (
    <div className={`flex gap-6 transition-all duration-300 ${
      isFullscreen 
        ? 'fixed inset-0 z-50 bg-background p-4' 
        : 'h-[calc(100vh-8rem)]'
    }`}>
      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-card to-card-secondary rounded-lg border border-border">
        <div className="p-4 md:p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Chat & Svar</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Ställ frågor om dina dokument
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleTestAPI}
                  className="hover-scale"
                  title="Testa API-anslutning (konsolen)"
                >
                  <TestTube className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsQuickActionsOpen(true)}
                  className="hover-scale"
                  title="Tips & snabbfrågor"
                >
                  <Lightbulb className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="hover-scale"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-5 w-5" />
                  ) : (
                    <Maximize2 className="h-5 w-5" />
                  )}
                </Button>
                {isMobile && (
                <Sheet open={isSourcesOpen} onOpenChange={setIsSourcesOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-xs">
                        {currentSources.length > 0 ? currentSources.length : workspaceDocuments.length}
                      </span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[70vh] flex flex-col">
                    <SheetHeader className="flex-shrink-0">
                      <SheetTitle>Källor</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 flex-1 overflow-y-auto">
                      <SourceList 
                        sources={currentSources} 
                        availableDocuments={currentSources.length === 0 ? workspaceDocuments.map(doc => ({
                          id: doc.id,
                          name: doc.name,
                          type: doc.type,
                          size: doc.size,
                        })) : undefined}
                        selectedDocumentIds={selectedDocumentIds}
                        onDocumentToggle={handleDocumentToggle}
                      />
                    </div>
                  </SheetContent>
                </Sheet>
                )}
              </div>
            </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {mode === 'followUp' && hasPreloadedHistory && (
            <div className="mb-3 rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between gap-2">
              <span>
                Du fortsätter nu utifrån ett sparat AI-svar. Ställ din följdfråga nedan.
              </span>
              <button
                className="text-[11px] text-accent hover:underline"
                type="button"
                onClick={() => {
                  // rensa läget om användaren vill börja om
                  setMessages([]);
                }}
              >
                Börja ny konversation
              </button>
            </div>
          )}

          <ChatMessages 
            messages={messages} 
            isLoading={isLoading} 
            onSaveMessage={handleSaveMessage}
          />
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 md:p-6 border-t border-border">
          <Dialog open={isQuickActionsOpen} onOpenChange={setIsQuickActionsOpen}>
            <DialogContent className="w-[95vw] sm:max-w-md max-h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-accent flex-shrink-0" />
                  <span className="break-words">Snabbfrågor om systemet</span>
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Välj en av frågorna nedan för att snabbt få hjälp med ditt dokument
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 py-4 overflow-y-auto overflow-x-hidden">
                {QUICK_ACTIONS.map((action) => (
                  <Button
                    key={action.id}
                    variant="outline"
                    className="justify-start text-left h-auto py-2 sm:py-3 px-3 sm:px-4 hover:bg-accent/50 hover:border-accent transition-all w-full"
                    onClick={() => handleQuickAction(action.question)}
                    disabled={isLoading}
                  >
                    <span className="mr-2 text-base sm:text-lg flex-shrink-0">{action.icon}</span>
                    <span className="text-xs sm:text-sm break-words whitespace-pre-line">{action.question}</span>
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          
          <ChatInput 
            onSend={handleSend} 
            disabled={isLoading}
            documents={workspaceDocuments}
            workspaces={workspaces}
            onOpenQuickActions={() => setIsQuickActionsOpen(true)}
            shouldHighlight={messages.length <= 2}
            onUpload={handleUpload}
          />
        </div>
      </div>

      {/* Sources Sidebar - Desktop Only - Always visible */}
      {!isMobile && (
        <div className="w-80 flex-shrink-0 h-full">
          <SourceList 
            sources={currentSources} 
            availableDocuments={currentSources.length === 0 ? workspaceDocuments.map(doc => ({
              id: doc.id,
              name: doc.name,
              type: doc.type,
              size: doc.size,
            })) : undefined}
            selectedDocumentIds={selectedDocumentIds}
            onDocumentToggle={handleDocumentToggle}
          />
        </div>
      )}
    </div>
  );
};
