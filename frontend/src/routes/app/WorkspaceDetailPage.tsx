import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText, Clock, TrendingUp, Users, MessageSquare, Settings } from 'lucide-react';
import { DocumentTable } from '@/components/app/DocumentTable';
import { Workspace } from '@/lib/mockData';
import { getWorkspace, updateWorkspace } from '@/api/workspaces';
import { EditWorkspaceDialog } from '@/components/app/EditWorkspaceDialog';
import { toast } from 'sonner';
import { uploadDocument } from '@/api/documents';
import { getStats, getWorkspaceActivity } from '@/api/stats';

export const WorkspaceDetailPage = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { refreshWorkspaces, workspaces } = useApp();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);

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

  const loadWorkspace = async () => {
    if (workspaceId) {
      try {
        // Först: Kolla om workspace finns i AppContext (från korten)
        const workspaceFromContext = workspaces.find(
          ws => ws.id === workspaceId || ws.name === workspaceId
        );
        
        // Hämta workspace-data (från localStorage eller API)
        const data = await getWorkspace(workspaceId);
        
        // Använd workspace från AppContext som bas om den finns (har senaste stats)
        const baseWorkspace = workspaceFromContext || data;
        
        if (!baseWorkspace) {
          console.error('[LoadWorkspace] Workspace not found:', workspaceId);
          return;
        }
        
        // Ladda stats och aktivitet samtidigt
        try {
          const [stats, activityMap] = await Promise.all([
            getStats(workspaceId),
            getWorkspaceActivity(),
          ]);
          const activity = activityMap[workspaceId];
          
          // Sätt workspace med all data på en gång
          // Använd baseWorkspace som bas för att behålla data från AppContext
          const workspaceData = {
            ...baseWorkspace,
            ...data, // Överskriv med data från getWorkspace (name, description, etc)
            documentCount: stats.total_documents || 0, // Alltid använd senaste från backend
            accuracy: stats.accuracy || undefined, // Använd backend accuracy, ta bort om 0 eller undefined
            lastActive: activity?.last_active
              ? new Date(activity.last_active).toLocaleDateString('sv-SE')
              : baseWorkspace.lastActive || data?.lastActive,
          };
          console.log('[LoadWorkspace] Setting workspace with documentCount:', workspaceData.documentCount);
          setWorkspace(workspaceData);
          
          // Uppdatera AppContext med senaste data så att korten också uppdateras
          if (refreshWorkspaces) {
            await refreshWorkspaces();
          }
        } catch (error) {
          console.error('Failed to load workspace stats:', error);
          // Fallback: använd workspace från AppContext eller localStorage
          const key = `dokument-ai-documents-${workspaceId}`;
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const saved = JSON.parse(raw);
              setWorkspace({
                ...baseWorkspace,
                ...data,
                documentCount: saved.length,
              });
            } else {
              const workspaceData = {
                ...baseWorkspace,
                ...data,
                documentCount: baseWorkspace.documentCount || data?.documentCount || 0,
              };
              console.log('[LoadWorkspace] Setting workspace (no stats) with documentCount:', workspaceData.documentCount);
              setWorkspace(workspaceData);
            }
          } catch {
            setWorkspace({
              ...baseWorkspace,
              ...data,
              documentCount: baseWorkspace.documentCount || 0,
            });
          }
        }
      } catch (error) {
        console.error('Failed to load workspace:', error);
      }
    }
  };

  const loadDocuments = () => {
    if (!workspaceId) return;
    try {
      const key = `dokument-ai-documents-${workspaceId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw);
        setDocuments(saved);
      }
    } catch (err) {
      console.error('Failed to load documents from storage', err);
    }
  };

  const saveDocuments = (docs: any[]) => {
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
    if (!file) {
      toast.error('Ingen fil vald');
      return;
    }
    
    // Använd workspaceId från URL om workspace inte är laddad än
    const targetWorkspaceId = workspaceId || workspace?.id || workspace?.name || 'default';
    
    if (!targetWorkspaceId) {
      toast.error('Kunde inte hitta arbetsyta');
      return;
    }
    
    const loadingToast = toast.loading('Importerar dokument...');
    try {
      console.log('[Upload] Starting upload for workspace:', targetWorkspaceId);
      const newDoc = await uploadDocument(file, targetWorkspaceId);
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
            console.log(`[Upload] Retry ${i + 1}/${retries}: Fetching stats for workspace:`, targetWorkspaceId);
            const stats = await getStats(targetWorkspaceId);
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

  const handleDeleteDocument = async (documentId: string) => {
    const updated = documents.filter(doc => doc.id !== documentId);
    setDocuments(updated);
    saveDocuments(updated);
    
    // Ladda om dokumentantal från backend (riktig data)
    if (workspaceId) {
      try {
        const stats = await getStats(workspaceId);
        setWorkspace((w) => (w ? { ...w, documentCount: stats.total_documents } : w));
      } catch (error) {
        console.error('Failed to refresh stats after delete:', error);
        // Fallback: minska räknaren lokalt
        setWorkspace((w) => (w ? { ...w, documentCount: Math.max(0, (w.documentCount || 0) - 1) } : w));
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
          <input ref={fileInputRef} type="file" accept=".txt,.md,.pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />
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
              <div className="text-xl md:text-2xl font-bold text-accent">0%</div>
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
        <DocumentTable documents={workspaceDocuments} onDelete={handleDeleteDocument} />
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
