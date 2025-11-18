import { StatCard } from '@/components/ui/StatCard';
import { HistoryList } from '@/components/app/HistoryList';
import { WorkspaceGrid } from '@/components/app/WorkspaceGrid';
import { FileText, FolderOpen, MessageSquare, BarChart3, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { routes } from '@/lib/routes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getStats, getRecentQueries, RecentQuery } from '@/api/stats';
import { useApp } from '@/context/AppContext';
import { useState, useEffect } from 'react';
import { HistoryItem, Workspace } from '@/lib/mockData';
import { deleteWorkspace as deleteWorkspaceApi } from '@/api/workspaces';
import { toast } from 'sonner';

export const OverviewPage = () => {
  const navigate = useNavigate();
  const { currentWorkspace, workspaces, setCurrentWorkspace, refreshWorkspaces } = useApp();
  const [stats, setStats] = useState({
    total_documents: 0,
    total_workspaces: 0,
    total_queries: 0,
    accuracy: 0,
  });
  const [recentQueries, setRecentQueries] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!currentWorkspace) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const workspaceId = currentWorkspace.id || currentWorkspace.name;
        console.log('[OverviewPage] Loading data for workspace:', workspaceId, currentWorkspace.name);
        
        const [statsData, queriesData] = await Promise.all([
          getStats(workspaceId),
          getRecentQueries(5, workspaceId),
        ]);
        
        console.log('[OverviewPage] Stats received:', statsData);
        setStats(statsData);
        
        // Konvertera RecentQuery[] till HistoryItem[]
        const historyItems: HistoryItem[] = queriesData.map((q: RecentQuery) => ({
          id: q.id,
          question: q.query,
          workspace: q.workspace || 'default',
          timestamp: q.timestamp,
        }));
        setRecentQueries(historyItems);
      } catch (error) {
        console.error('[OverviewPage] Failed to load overview data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentWorkspace?.id, currentWorkspace?.name]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(routes.home)}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Översikt</h1>
          <p className="text-muted-foreground mt-1">Välkommen tillbaka!</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Inlästa dokument"
          value={loading ? '...' : stats.total_documents.toString()}
          icon={<FileText className="h-6 w-6" />}
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <StatCard
                  title="Aktiva arbetsytor"
                  value={
                    loading ? (
                      '...'
                    ) : (() => {
                      // Använd documentCount från currentWorkspace om tillgängligt, annars stats.total_workspaces
                      const isActive = currentWorkspace 
                        ? (currentWorkspace.documentCount || 0) > 0 
                        : stats.total_workspaces > 0;
                      
                      return (
                        <div className="flex items-center gap-2">
                          <span>{isActive ? 1 : 0}</span>
                          <Badge
                            variant={isActive ? 'default' : 'secondary'}
                            className={isActive ? 'bg-green-500 hover:bg-green-600' : ''}
                          >
                            {isActive ? 'Aktiv' : 'Inte aktiv'}
                          </Badge>
                        </div>
                      );
                    })()
                  }
                  icon={<FolderOpen className="h-6 w-6" />}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Visar om den valda arbetsytan "{currentWorkspace?.name || 'ingen'}" är aktiv (har dokument) eller inte.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <StatCard
          title="Senaste frågor"
          value={loading ? '...' : stats.total_queries.toString()}
          icon={<MessageSquare className="h-6 w-6" />}
        />
        <StatCard
          title="Träffsäkerhet"
          value={loading ? '...' : `${stats.accuracy}%`}
          icon={<BarChart3 className="h-6 w-6" />}
        />
      </div>

      {/* Recent Questions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Senaste frågor</h2>
        {loading ? (
          <div className="text-muted-foreground">Laddar...</div>
        ) : recentQueries.length > 0 ? (
          <HistoryList
            items={recentQueries}
            onItemClick={(item) => navigate(routes.app.chat)}
          />
        ) : (
          <div className="text-muted-foreground">Inga frågor än. Börja ställa frågor i chatten!</div>
        )}
      </div>

      {/* Active Workspaces - Visa vald arbetsyta */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Aktiva arbetsytor</h2>
        {!currentWorkspace ? (
          <div className="text-muted-foreground">
            Ingen arbetsyta vald. Välj en arbetsyta i header-menyn.
          </div>
        ) : (() => {
          // Hitta vald arbetsyta i workspaces-listan för att få senaste data
          // Använd currentWorkspace direkt om den inte finns i listan (för att undvika fördröjning)
          const selectedWorkspace = workspaces.find(
            w => w.id === currentWorkspace.id || 
                 (currentWorkspace.id && w.id === currentWorkspace.id) ||
                 w.name === currentWorkspace.name
          ) || currentWorkspace;
          
          console.log('[OverviewPage] Rendering active workspace card:', {
            'currentWorkspace.id': currentWorkspace.id,
            'currentWorkspace.name': currentWorkspace.name,
            'selectedWorkspace.id': selectedWorkspace.id,
            'selectedWorkspace.name': selectedWorkspace.name,
            'selectedWorkspace.documentCount': selectedWorkspace.documentCount,
            'workspaces.length': workspaces.length,
            'workspaces.ids': workspaces.map(w => w.id),
          });
          
          const handleDeleteWorkspace = async (workspace: Workspace) => {
            try {
              await deleteWorkspaceApi(workspace.id);
              
              // Om den borttagna arbetsytan är den valda, välj en annan
              if (currentWorkspace?.id === workspace.id) {
                const remainingWorkspaces = workspaces.filter(w => w.id !== workspace.id);
                if (remainingWorkspaces.length > 0) {
                  setCurrentWorkspace(remainingWorkspaces[0]);
                } else {
                  setCurrentWorkspace(null);
                }
              }
              
              // Refresh workspaces
              await refreshWorkspaces();
              toast.success(`Arbetsyta "${workspace.name}" har tagits bort`);
            } catch (error) {
              console.error('Failed to delete workspace:', error);
              toast.error(`Kunde inte ta bort arbetsyta "${workspace.name}"`);
            }
          };

          return (
            <WorkspaceGrid
              key={selectedWorkspace.id} // Force re-render när ID ändras
              workspaces={[selectedWorkspace]} // Visa endast vald arbetsyta
              onWorkspaceClick={(workspace) => {
                navigate(routes.app.workspaces);
              }}
              onDelete={handleDeleteWorkspace}
            />
          );
        })()}
      </div>
    </div>
  );
};
