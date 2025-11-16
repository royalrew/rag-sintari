import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkspaceGrid } from '@/components/app/WorkspaceGrid';
import { CreateWorkspaceDialog } from '@/components/app/CreateWorkspaceDialog';
import { Workspace } from '@/lib/mockData';
import { useApp } from '@/context/AppContext';
import { routes } from '@/lib/routes';
import { toast } from 'sonner';
import { listWorkspaces, createWorkspace as createWorkspaceApi } from '@/api/workspaces';

export const WorkspacesPage = () => {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const { setCurrentWorkspace, refreshWorkspaces } = useApp();

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    const data = await listWorkspaces();
    setWorkspaces(data);
  };

  const handleCreateWorkspace = async (workspaceData: Omit<Workspace, 'id'>) => {
    const newWorkspace = await createWorkspaceApi(workspaceData);
    setWorkspaces([newWorkspace, ...workspaces]);
    // Refresh AppContext workspaces so Topbar updates
    await refreshWorkspaces();
    toast.success(`Arbetsyta "${workspaceData.name}" skapad!`);
  };

  const handleWorkspaceClick = (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    navigate(routes.app.workspaceDetail(workspace.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Arbetsytor</h1>
          <p className="text-muted-foreground mt-1">
            Organisera dokument i olika arbetsytor
          </p>
        </div>

        <CreateWorkspaceDialog onCreateWorkspace={handleCreateWorkspace} />
      </div>

      <WorkspaceGrid
        workspaces={workspaces}
        onWorkspaceClick={handleWorkspaceClick}
      />
    </div>
  );
};
