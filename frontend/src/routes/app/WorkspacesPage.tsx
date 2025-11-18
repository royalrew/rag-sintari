import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkspaceGrid } from '@/components/app/WorkspaceGrid';
import { CreateWorkspaceDialog } from '@/components/app/CreateWorkspaceDialog';
import { Workspace } from '@/lib/mockData';
import { useApp } from '@/context/AppContext';
import { routes } from '@/lib/routes';
import { toast } from 'sonner';
import { createWorkspace as createWorkspaceApi, deleteWorkspace as deleteWorkspaceApi } from '@/api/workspaces';

export const WorkspacesPage = () => {
  const navigate = useNavigate();
  const { workspaces, currentWorkspace, setCurrentWorkspace, refreshWorkspaces } = useApp();

  // Ladda workspaces från AppContext (som redan har backend-data)
  useEffect(() => {
    // Refresh workspaces för att säkerställa att vi har senaste data
    refreshWorkspaces();
  }, []);

  const handleCreateWorkspace = async (workspaceData: Omit<Workspace, 'id'>) => {
    const newWorkspace = await createWorkspaceApi(workspaceData);
    // Refresh AppContext workspaces (detta uppdaterar både Topbar och denna sida)
    await refreshWorkspaces();
    toast.success(`Arbetsyta "${workspaceData.name}" skapad!`);
  };

  const handleWorkspaceClick = (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    navigate(routes.app.workspaceDetail(workspace.id));
  };

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
        onDelete={handleDeleteWorkspace}
      />
    </div>
  );
};
