import { useState } from 'react';
import { Workspace } from '@/lib/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FolderOpen, FileText, Clock, TrendingUp, Users, MessageSquare, Trash2 } from 'lucide-react';

interface WorkspaceGridProps {
  workspaces: Workspace[];
  onWorkspaceClick?: (workspace: Workspace) => void;
  onDelete?: (workspace: Workspace) => void;
}

export const WorkspaceGrid = ({ workspaces, onWorkspaceClick, onDelete }: WorkspaceGridProps) => {
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, workspace: Workspace) => {
    e.stopPropagation(); // Förhindra att kortet klickas när man klickar på delete-knappen
    setWorkspaceToDelete(workspace);
  };

  const handleConfirmDelete = () => {
    if (workspaceToDelete && onDelete) {
      onDelete(workspaceToDelete);
    }
    setWorkspaceToDelete(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workspaces.map((workspace) => (
          <Card
            key={workspace.id}
            className="bg-gradient-to-br from-card to-card-secondary hover:shadow-md transition-all duration-300 cursor-pointer group hover:border-accent/50 relative"
            onClick={() => onWorkspaceClick?.(workspace)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="text-4xl transition-transform group-hover:scale-110">
                  {workspace.icon || '📁'}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs font-medium text-accent">
                    <TrendingUp className="h-3 w-3" />
                    {typeof workspace.accuracy === 'number' ? workspace.accuracy : 0}%
                  </div>
                  {/* Delete button - alltid synlig, röd */}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={(e) => handleDeleteClick(e, workspace)}
                      title="Ta bort arbetsyta"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            <CardTitle className="mt-4 group-hover:text-accent transition-colors">
              {workspace.name}
            </CardTitle>
            {workspace.description && (
              <CardDescription className="text-xs">
                {workspace.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {workspace.documentCount || 0} dokument
                </span>
              </div>
              
              {workspace.lastQuestion && (
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-start gap-1 text-xs text-muted-foreground">
                    <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{workspace.lastQuestion}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                <Clock className="h-3 w-3" />
                Senast aktiv: {workspace.lastActive || '-'}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Delete confirmation dialog */}
    <AlertDialog open={!!workspaceToDelete} onOpenChange={() => setWorkspaceToDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Är du säker?</AlertDialogTitle>
          <AlertDialogDescription>
            Du håller på att ta bort arbetsytan "{workspaceToDelete?.name}". 
            Detta kan inte ångras. Alla dokument i denna arbetsyta kommer också att tas bort.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirmDelete} 
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Ta bort
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
};
