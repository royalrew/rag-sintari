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
import { HistoryItem } from '@/lib/mockData';

export const OverviewPage = () => {
  const navigate = useNavigate();
  const { currentWorkspace, workspaces } = useApp();
  const [stats, setStats] = useState({
    total_documents: 0,
    total_workspaces: 0,
    total_queries: 0,
    accuracy: 0,
  });
  const [recentQueries, setRecentQueries] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspacesWithStats, setWorkspacesWithStats] = useState(workspaces);

  // Använd workspaces direkt från AppContext (som redan har backend-data)
  useEffect(() => {
    setWorkspacesWithStats(workspaces);
  }, [workspaces]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const workspaceId = currentWorkspace?.id || currentWorkspace?.name;
        const [statsData, queriesData] = await Promise.all([
          getStats(workspaceId),
          getRecentQueries(5, workspaceId),
        ]);
        
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
        console.error('Failed to load overview data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentWorkspace]);

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
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{stats.total_workspaces}</span>
                        <Badge
                          variant={stats.total_workspaces > 0 ? 'default' : 'secondary'}
                          className={stats.total_workspaces > 0 ? 'bg-green-500 hover:bg-green-600' : ''}
                        >
                          {stats.total_workspaces > 0 ? 'Aktiv' : 'Inte aktiv'}
                        </Badge>
                      </div>
                    )
                  }
                  icon={<FolderOpen className="h-6 w-6" />}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Visar om den valda arbetsytan är aktiv (har dokument) eller inte.</p>
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

      {/* Active Workspaces */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Aktiva arbetsytor</h2>
        {loading ? (
          <div className="text-muted-foreground">Laddar arbetsytor...</div>
        ) : (() => {
          // Filtrera endast arbetsytor med dokument (aktiva)
          const activeWorkspaces = workspacesWithStats.filter(
            (ws) => (ws.documentCount || 0) > 0
          );
          
          return activeWorkspaces.length > 0 ? (
            <>
              <WorkspaceGrid
                workspaces={activeWorkspaces.slice(0, 6)} // Visa max 6 aktiva arbetsytor
                onWorkspaceClick={(workspace) => {
                  navigate(routes.app.workspaces);
                }}
              />
              {activeWorkspaces.length > 6 && (
                <div className="text-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => navigate(routes.app.workspaces)}
                  >
                    Visa alla aktiva arbetsytor ({activeWorkspaces.length})
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-muted-foreground">
              Inga aktiva arbetsytor än. Ladda upp dokument i en arbetsyta för att aktivera den!
            </div>
          );
        })()}
      </div>
    </div>
  );
};
