import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText, Clock, TrendingUp, Users, MessageSquare, Settings } from 'lucide-react';
import { DocumentTable } from '@/components/app/DocumentTable';
import { Workspace, mockDocuments } from '@/lib/mockData';
import { getWorkspace, updateWorkspace } from '@/api/workspaces';
import { EditWorkspaceDialog } from '@/components/app/EditWorkspaceDialog';
import { toast } from 'sonner';

export const WorkspaceDetailPage = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    loadWorkspace();
  }, [workspaceId]);

  const loadWorkspace = async () => {
    if (workspaceId) {
      const data = await getWorkspace(workspaceId);
      setWorkspace(data);
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

  const workspaceDocuments = mockDocuments.filter(
    (doc) => doc.workspace === workspace.name
  );

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
          <Button 
            variant="outline" 
            size={isMobile ? "sm" : "sm"}
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
            <div className="text-xl md:text-2xl font-bold">{workspace.documentCount}</div>
          </CardContent>
        </Card>

        {workspace.accuracy && (
          <Card className="bg-gradient-to-br from-card to-card-secondary">
            <CardHeader className="pb-2 md:pb-3">
              <CardDescription className="flex items-center gap-2 text-xs md:text-sm">
                <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
                Noggrannhet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-accent">{workspace.accuracy}%</div>
            </CardContent>
          </Card>
        )}

        {workspace.activeUsers && (
          <Card className="bg-gradient-to-br from-card to-card-secondary">
            <CardHeader className="pb-2 md:pb-3">
              <CardDescription className="flex items-center gap-2 text-xs md:text-sm">
                <Users className="h-3 w-3 md:h-4 md:w-4" />
                Aktiva
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{workspace.activeUsers}</div>
            </CardContent>
          </Card>
        )}

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

      {/* Last Question */}
      {workspace.lastQuestion && (
        <Card className="bg-gradient-to-br from-card to-card-secondary">
          <CardHeader>
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Senaste frågan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground break-words">{workspace.lastQuestion}</p>
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      <div>
        <h2 className="text-lg md:text-xl font-semibold mb-4">Dokument i arbetsytan</h2>
        <DocumentTable documents={workspaceDocuments} />
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
