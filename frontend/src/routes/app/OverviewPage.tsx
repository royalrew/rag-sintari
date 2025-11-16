import { StatCard } from '@/components/ui/StatCard';
import { HistoryList } from '@/components/app/HistoryList';
import { WorkspaceGrid } from '@/components/app/WorkspaceGrid';
import { mockHistory, mockWorkspaces } from '@/lib/mockData';
import { FileText, FolderOpen, MessageSquare, BarChart3, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { routes } from '@/lib/routes';
import { Button } from '@/components/ui/button';

export const OverviewPage = () => {
  const navigate = useNavigate();

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
          value="47"
          icon={<FileText className="h-6 w-6" />}
        />
        <StatCard
          title="Aktiva arbetsytor"
          value="4"
          icon={<FolderOpen className="h-6 w-6" />}
        />
        <StatCard
          title="Senaste frågor"
          value="12"
          icon={<MessageSquare className="h-6 w-6" />}
        />
        <StatCard
          title="Träffsäkerhet"
          value="94%"
          icon={<BarChart3 className="h-6 w-6" />}
        />
      </div>

      {/* Recent Questions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Senaste frågor</h2>
        <HistoryList
          items={mockHistory.slice(0, 5)}
          onItemClick={(item) => navigate(routes.app.chat)}
        />
      </div>

      {/* Active Workspaces */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Aktiva arbetsytor</h2>
        <WorkspaceGrid
          workspaces={mockWorkspaces}
          onWorkspaceClick={(workspace) => navigate(routes.app.workspaces)}
        />
      </div>
    </div>
  );
};
