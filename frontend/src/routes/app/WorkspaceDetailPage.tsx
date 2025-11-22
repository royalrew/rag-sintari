import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText, Clock, TrendingUp, Users, MessageSquare, Settings } from 'lucide-react';
import { DocumentTable } from '@/components/app/DocumentTable';
import { Workspace, Document } from '@/lib/mockData';
import { getWorkspace, updateWorkspace } from '@/api/workspaces';
import { EditWorkspaceDialog } from '@/components/app/EditWorkspaceDialog';
import { toast } from 'sonner';
import { uploadDocument, downloadDocument } from '@/api/documents';
import { getStats, getWorkspaceActivity } from '@/api/stats';
import { validateFile } from '@/lib/utils';

// Accepted file types - synkad med DocumentsPage
const ACCEPTED_FILE_TYPES = '.pdf,.doc,.docx,.txt,.md,.csv';

export const WorkspaceDetailPage = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { refreshWorkspaces, workspaces } = useApp();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    loadWorkspace();
    loadDocuments();
  }, [workspaceId, workspaces]); // Reagera även på ändringar i workspaces från AppContext

  // Debug: Logga när workspace ändras
  useEffect(() => {
    console.log('[WorkspaceDetailPage] Workspace state changed:', {
      id: workspace?.id,
      name: workspace?.name,
      documentCount: workspace?.documentCount,
    });
  }, [workspace]);

  // Helper: Resolve base workspace from context or API
  const resolveBaseWorkspace = (id: string) => {
    return workspaces.find(ws => ws.id === id || ws.name === id);
  };

  const loadWorkspace = async () => {
    if (!workspaceId) return;

    try {
      // Find workspace in context (has latest stats)
      const baseWorkspace = resolveBaseWorkspace(workspaceId);
      
      // Get workspace data from localStorage/API
      const data = await getWorkspace(workspaceId);
      
      // Use context workspace as base if available, otherwise use data
      const mergedBase = baseWorkspace || data;
      if (!mergedBase) {
        console.error('[LoadWorkspace] Workspace not found:', workspaceId);
        return;
      }

      // Load stats and activity in parallel
      try {
        const [stats, activityMap] = await Promise.all([
          getStats(workspaceId),
          getWorkspaceActivity(),
        ]);

        const activity = activityMap[workspaceId];
        
        // Merge all data
        const workspaceData: Workspace = {
          ...mergedBase,
          ...data, // Override with data from getWorkspace (name, description, etc)
          documentCount: stats.total_documents || 0,
          accuracy: stats.accuracy || undefined,
          lastActive: activity?.last_active
            ? new Date(activity.last_active).toLocaleDateString('sv-SE')
            : mergedBase.lastActive || data?.lastActive,
        };
        
        console.log('[LoadWorkspace] Setting workspace with documentCount:', workspaceData.documentCount);
        setWorkspace(workspaceData);
      } catch (error) {
        console.error('Failed to load workspace stats:', error);
        // Fallback: use workspace from context or localStorage document count
        const key = `dokument-ai-documents-${workspaceId}`;
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const saved: Document[] = JSON.parse(raw);
            setWorkspace({
              ...mergedBase,
              ...data,
              documentCount: saved.length,
            });
          } else {
            const workspaceData: Workspace = {
              ...mergedBase,
              ...data,
              documentCount: mergedBase.documentCount || data?.documentCount || 0,
            };
            console.log('[LoadWorkspace] Setting workspace (no stats) with documentCount:', workspaceData.documentCount);
            setWorkspace(workspaceData);
          }
        } catch {
          setWorkspace({
            ...mergedBase,
            ...data,
            documentCount: mergedBase.documentCount || 0,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load workspace:', error);
    }
  };

  const loadDocuments = () => {
    if (!workspaceId) return;
    try {
      const key = `dokument-ai-documents-${workspaceId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const saved: Document[] = JSON.parse(raw);
        setDocuments(saved);
      }
    } catch (err) {
      console.error('Failed to load documents from storage', err);
    }
  };

  const saveDocuments = (docs: Document[]) => {
    if (!workspaceId) return;
    try {
      const key = `dokument-ai-documents-${workspaceId}`;
      localStorage.setItem(key, JSON.stringify(docs));
    } catch (err) {
      console.error('Failed to save documents to storage', err);
    }
  };

  const handleSaveSettings = async (data: Partial<Workspace>) => {
    if (!workspace || !workspaceId) return;
    try {
      const updated = await updateWorkspace(workspaceId, data);
      setWorkspace(updated);
      toast.success('Arbetsytan uppdaterades!');
    } catch (error) {
      toast.error('Kunde inte uppdatera arbetsytan');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    // Validera fil innan uppladdning
    try {
      validateFile(file);
    } catch (err: any) {
      if (err.message === "empty-file") {
        toast.error(
          "Kunde inte läsa filen. Det verkar som att filen inte är helt nedladdad från din molntjänst. Öppna filen i din moln-app (OneDrive / iCloud / Google Drive), se till att den är tillgänglig offline och försök igen."
        );
      } else if (err.message === "no-file") {
        toast.error("Ingen fil vald");
      } else {
        toast.error("Kunde inte läsa filen. Försök igen.");
      }
      e.target.value = '';
      return;
    }
    
    // Use workspaceId from URL - always consistent
    if (!workspaceId) {
      toast.error('Kunde inte hitta arbetsyta');
      e.target.value = '';
      return;
    }
    
    const loadingToast = toast.loading('Importerar dokument...');
    try {
      console.log('[Upload] Starting upload for workspace:', workspaceId);
      const newDoc = await uploadDocument(file, workspaceId);
      console.log('[Upload] Upload successful, document:', newDoc);
      
      const updated = [newDoc, ...documents];
      setDocuments(updated);
      saveDocuments(updated);
      
      // OMEDELBAR optimistisk uppdatering - öka räknaren direkt så användaren ser ändringen
      console.log('[Upload] Current documentCount before update:', workspace?.documentCount);
      setWorkspace((w) => {
        if (!w) {
          console.warn('[Upload] Workspace is null, cannot update documentCount');
          return w;
        }
        const newCount = (w.documentCount || 0) + 1;
        console.log('[Upload] Updating documentCount to:', newCount);
        return { ...w, documentCount: newCount };
      });
      
      // Uppdatera även AppContext omedelbart
      if (refreshWorkspaces) {
        refreshWorkspaces().catch(err => console.error('Failed to refresh workspaces:', err));
      }
      
      // Ladda om dokumentantal från backend (riktig data) i bakgrunden
      // Backend indexerar dokumentet, så vi behöver vänta lite och retry
      const refreshStats = async (retries = 5, delay = 500) => {
        for (let i = 0; i < retries; i++) {
          try {
            await new Promise(resolve => setTimeout(resolve, delay * (i + 1))); // Ökande delay: 0.5s, 1s, 1.5s, 2s, 2.5s
            console.log(`[Upload] Retry ${i + 1}/${retries}: Fetching stats for workspace:`, workspaceId);
            const stats = await getStats(workspaceId);
            console.log('[Upload] Stats received:', stats);
            // Uppdatera med riktig data från backend när den är klar
            setWorkspace((w) => {
              if (!w) return w;
              console.log('[Upload] Updating documentCount from backend:', stats.total_documents);
              return { ...w, documentCount: stats.total_documents };
            });
            // Uppdatera även AppContext med riktig data - detta synkar med OverviewPage
            if (refreshWorkspaces) {
              console.log('[Upload] Refreshing AppContext workspaces to sync with OverviewPage');
              await refreshWorkspaces();
            }
            break; // Lyckades, bryt loopen
          } catch (error) {
            console.error(`[Upload] Retry ${i + 1}/${retries} failed:`, error);
            if (i === retries - 1) {
              console.error('Failed to refresh stats after upload:', error);
              // Om alla försök misslyckas, behåller vi den optimistiska uppdateringen
            }
          }
        }
      };
      // Starta refresh i bakgrunden (blockerar inte toast)
      refreshStats();
      
      toast.dismiss(loadingToast);
      toast.success('Dokument importerat!');
    } catch (err) {
      console.error('[Upload] Upload failed:', err);
      // Om upload misslyckas, återställ den optimistiska uppdateringen
      setWorkspace((w) => {
        if (!w) return w;
        return { ...w, documentCount: Math.max(0, (w.documentCount || 0) - 1) };
      });
      toast.dismiss(loadingToast);
      const errorMessage = err instanceof Error ? err.message : 'Okänt fel';
      toast.error(`Kunde inte importera dokument: ${errorMessage}`);
    }
    e.target.value = '';
  };

  const handleDownloadDocument = async (doc: Document) => {
    console.log('[handleDownloadDocument] Click for doc:', doc.id, doc.name);
    
    try {
      // Always try to call backend - no early returns
      const result = await downloadDocument(doc.id);
      
      console.log('[handleDownloadDocument] Got response:', {
        ok: result.ok,
        hasUrl: !!result.url,
        filename: result.filename,
        urlPreview: result.url ? result.url.substring(0, 100) + '...' : 'no URL'
      });
      
      if (!result.ok || !result.url) {
        throw new Error('Backend returnerade ogiltigt svar');
      }
      
      console.log('[handleDownloadDocument] Opening presigned URL');
      const win = window.open(result.url, '_blank');
      
      if (!win) {
        console.warn('[handleDownloadDocument] Popup blocked, using fallback');
        const a = document.createElement('a');
        a.href = result.url;
        a.download = result.filename || doc.name;
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      
      toast.success(`Öppnar ${result.filename || doc.name}...`);
    } catch (err: any) {
      console.error('[handleDownloadDocument] Error downloading:', err);
      console.error('[handleDownloadDocument] Error details:', {
        message: err?.message,
        status: err?.status,
        data: err?.data,
        stack: err?.stack
      });
      
      // Show error - NOW we know backend actually said no
      let errorMessage = 'Dokumentet är inte tillgängligt för nedladdning';
      if (err?.status === 404) {
        errorMessage = 'Dokumentet hittades inte';
      } else if (err?.status === 403) {
        errorMessage = 'Du har inte behörighet att ladda ner detta dokument';
      } else if (err?.status === 503) {
        errorMessage = 'Lagringstjänsten är inte tillgänglig';
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err?.data?.detail) {
        errorMessage = err.data.detail;
      }
      
      toast.error(errorMessage);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    // Optimistic update: decrease count immediately
    setWorkspace((w) => 
      w ? { ...w, documentCount: Math.max(0, (w.documentCount || 0) - 1) } : w
    );
    
    const updated = documents.filter(doc => doc.id !== documentId);
    setDocuments(updated);
    saveDocuments(updated);
    
    // Refresh stats from backend (real data)
    if (workspaceId) {
      try {
        const stats = await getStats(workspaceId);
        setWorkspace((w) => (w ? { ...w, documentCount: stats.total_documents } : w));
        // Also refresh AppContext
        if (refreshWorkspaces) {
          await refreshWorkspaces();
        }
      } catch (error) {
        console.error('Failed to refresh stats after delete:', error);
        // Keep the optimistic update if backend fails
      }
    }
  };

  if (!workspace) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tillbaka
          </Button>
        </div>
        <p className="text-muted-foreground">Arbetsytan hittades inte</p>
      </div>
    );
  }

  const workspaceDocuments = documents;

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-2 md:gap-4 min-w-0 flex-1">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 md:gap-3 mb-2">
              <span className="text-2xl md:text-4xl">{workspace.icon}</span>
              <h1 className="text-xl md:text-3xl font-bold truncate">{workspace.name}</h1>
            </div>
            {workspace.description && (
              <p className="text-sm md:text-base text-muted-foreground break-words">{workspace.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 self-start flex-shrink-0">
          <input ref={fileInputRef} type="file" accept={ACCEPTED_FILE_TYPES} className="hidden" onChange={handleFileChange} />
          <Button 
            variant="outline" 
            size={isMobile ? "sm" : "sm"}
            onClick={handleImportClick}
            className="flex-shrink-0 hover:bg-primary hover:text-primary-foreground"
          >
            <FileText className="h-4 w-4 mr-2" />
            Importera dokument
          </Button>
          <Button 
            variant="outline" 
            size={isMobile ? "sm" : "sm"} 
            onClick={() => setSettingsOpen(true)}
            className="flex-shrink-0"
          >
            <Settings className="h-4 w-4 mr-2" />
            Inställningar
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-card to-card-secondary">
          <CardHeader className="pb-2 md:pb-3">
            <CardDescription className="flex items-center gap-2 text-xs md:text-sm">
              <FileText className="h-3 w-3 md:h-4 md:w-4" />
              Dokument
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{workspace?.documentCount ?? 0}</div>
          </CardContent>
        </Card>

        {/* Noggrannhet - alltid visas */}
        <Card className="bg-gradient-to-br from-card to-card-secondary">
          <CardHeader className="pb-2 md:pb-3">
            <CardDescription className="flex items-center gap-2 text-xs md:text-sm">
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
              Noggrannhet
            </CardDescription>
          </CardHeader>
          <CardContent>
            {typeof workspace.accuracy === 'number' ? (
              <div className="text-xl md:text-2xl font-bold text-accent">{workspace.accuracy}%</div>
            ) : (
              <div className="text-xl md:text-2xl font-bold text-muted-foreground">-</div>
            )}
          </CardContent>
        </Card>

        {/* Aktiva - alltid visas */}
        <Card className="bg-gradient-to-br from-card to-card-secondary">
          <CardHeader className="pb-2 md:pb-3">
            <CardDescription className="flex items-center gap-2 text-xs md:text-sm">
              <Users className="h-3 w-3 md:h-4 md:w-4" />
              Aktiva
            </CardDescription>
          </CardHeader>
          <CardContent>
            {workspace.activeUsers ? (
              <div className="text-xl md:text-2xl font-bold">{workspace.activeUsers}</div>
            ) : (
              <div className="text-xl md:text-2xl font-bold text-muted-foreground">-</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card-secondary">
          <CardHeader className="pb-2 md:pb-3">
            <CardDescription className="flex items-center gap-2 text-xs md:text-sm">
              <Clock className="h-3 w-3 md:h-4 md:w-4" />
              Senast
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xs md:text-sm font-medium break-words">{workspace.lastActive}</div>
          </CardContent>
        </Card>
      </div>

      {/* Last Question - alltid visas */}
      <Card className="bg-gradient-to-br from-card to-card-secondary">
        <CardHeader>
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Senaste frågan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {workspace.lastQuestion ? (
            <p className="text-sm text-muted-foreground break-words">{workspace.lastQuestion}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Ingen fråga ställd ännu</p>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <div>
        <h2 className="text-lg md:text-xl font-semibold mb-4">Dokument i arbetsytan</h2>
        <DocumentTable 
          documents={workspaceDocuments} 
          onDelete={handleDeleteDocument}
          onDownload={handleDownloadDocument}
        />
      </div>

      {/* Settings Dialog */}
      {workspace && (
        <EditWorkspaceDialog
          workspace={workspace}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  );
};
