import { useState, useEffect, useRef } from 'react';
import { ChatMessages } from '@/components/app/ChatMessages';
import { ChatInput } from '@/components/app/ChatInput';
import { SourceList } from '@/components/app/SourceList';
import { ChatMessage } from '@/lib/mockData';
import { askQuestion } from '@/api/chat';
import { uploadDocument } from '@/api/documents';
import { useApp } from '@/context/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Maximize2, Minimize2, Zap, Lightbulb } from 'lucide-react';

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
  const { currentWorkspace } = useApp();
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [workspaces] = useState<any[]>([]);
  const [hiddenSources, setHiddenSources] = useState<Set<number>>(new Set());

  const workspaceDocuments = currentWorkspace 
    ? documents.filter(doc => doc.workspace === currentWorkspace.name)
    : documents;

  // Load documents from localStorage when workspace changes
  useEffect(() => {
    if (currentWorkspace?.id) {
      const key = `dokument-ai-documents-${currentWorkspace.id}`;
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const saved = JSON.parse(raw);
          setDocuments(saved);
        }
      } catch (err) {
        console.error('Failed to load documents', err);
      }
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (message: string, documentIds: string[], workspaceIds: string[]) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString('sv-SE', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
    };
    setMessages([...messages, userMessage]);
    setIsLoading(true);
    setHiddenSources(new Set());

    const { answer } = await askQuestion({
      question: message,
      workspaceId: currentWorkspace?.name || currentWorkspace?.id || 'default',
      documentIds,
      workspaceIds,
    });
    setMessages((prev) => [...prev, answer]);
    setIsLoading(false);
  };

  const handleQuickAction = (question: string) => {
    handleSend(question, [], []);
    setIsQuickActionsOpen(false);
  };

  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');
  const allSources = lastAssistantMessage?.sources || [];
  const currentSources = allSources.filter((_, idx) => !hiddenSources.has(idx));

  const handleRemoveSource = (index: number) => {
    setHiddenSources(prev => new Set([...prev, index]));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast.loading('Laddar upp dokument...');
    try {
      const newDocument = await uploadDocument(file, currentWorkspace?.name || 'Default');
      setDocuments([newDocument, ...documents]);
      toast.success('Dokument uppladdat! Nu kan du ställa frågor om det.');
    } catch (error) {
      toast.error('Fel vid uppladdning av dokument');
    }
    e.target.value = '';
  };

  return (
    <div className={`flex gap-6 transition-all duration-300 ${
      isFullscreen 
        ? 'fixed inset-0 z-50 bg-background p-4' 
        : 'h-[calc(100vh-8rem)]'
    }`}>
      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-card rounded-lg border border-border">
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
                        onRemoveSource={handleRemoveSource}
                        availableDocuments={currentSources.length === 0 ? workspaceDocuments.map(doc => ({
                          id: doc.id,
                          name: doc.name,
                          type: doc.type,
                          size: doc.size,
                        })) : undefined}
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
          <ChatMessages messages={messages} />
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
            onRemoveSource={handleRemoveSource}
            availableDocuments={currentSources.length === 0 ? workspaceDocuments.map(doc => ({
              id: doc.id,
              name: doc.name,
              type: doc.type,
              size: doc.size,
            })) : undefined}
          />
        </div>
      )}
    </div>
  );
};
