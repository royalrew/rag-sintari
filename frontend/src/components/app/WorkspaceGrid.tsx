import { Workspace } from '@/lib/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen, FileText, Clock, TrendingUp, Users, MessageSquare } from 'lucide-react';

interface WorkspaceGridProps {
  workspaces: Workspace[];
  onWorkspaceClick?: (workspace: Workspace) => void;
}

export const WorkspaceGrid = ({ workspaces, onWorkspaceClick }: WorkspaceGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {workspaces.map((workspace) => (
        <Card
          key={workspace.id}
          className="hover:shadow-md transition-all duration-300 cursor-pointer group hover:border-accent/50"
          onClick={() => onWorkspaceClick?.(workspace)}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="text-4xl transition-transform group-hover:scale-110">
                {workspace.icon || <FolderOpen className="h-8 w-8 text-accent" />}
              </div>
              {workspace.accuracy && (
                <div className="flex items-center gap-1 text-xs font-medium text-accent">
                  <TrendingUp className="h-3 w-3" />
                  {workspace.accuracy}%
                </div>
              )}
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
                  {workspace.documentCount} dokument
                </span>
                {workspace.activeUsers && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {workspace.activeUsers}
                  </span>
                )}
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
                Senast aktiv: {workspace.lastActive}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
