import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, FileText, Folder, Upload } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Document, Workspace } from '@/lib/mockData';

interface DocumentSelectorProps {
  documents: Document[];
  workspaces: Workspace[];
  selectedDocuments: string[];
  selectedWorkspaces: string[];
  onDocumentsChange: (documentIds: string[]) => void;
  onWorkspacesChange: (workspaceIds: string[]) => void;
  onUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const DocumentSelector = ({
  documents,
  workspaces,
  selectedDocuments,
  selectedWorkspaces,
  onDocumentsChange,
  onWorkspacesChange,
  onUpload,
}: DocumentSelectorProps) => {
  const [open, setOpen] = useState(false);

  const handleDocumentToggle = (documentId: string) => {
    if (selectedDocuments.includes(documentId)) {
      onDocumentsChange(selectedDocuments.filter(id => id !== documentId));
    } else {
      onDocumentsChange([...selectedDocuments, documentId]);
    }
  };

  const handleWorkspaceToggle = (workspaceId: string) => {
    if (selectedWorkspaces.includes(workspaceId)) {
      onWorkspacesChange(selectedWorkspaces.filter(id => id !== workspaceId));
    } else {
      onWorkspacesChange([...selectedWorkspaces, workspaceId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedDocuments.length === documents.length) {
      onDocumentsChange([]);
    } else {
      onDocumentsChange(documents.map(doc => doc.id));
    }
  };

  const allSelected = selectedDocuments.length === documents.length && documents.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-9 w-9 shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="start"
        side="top"
      >
        <Tabs defaultValue="documents" className="w-full">
          <TabsList className="w-full grid grid-cols-2 rounded-none border-b">
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              Dokument
            </TabsTrigger>
            <TabsTrigger value="workspaces" className="gap-2">
              <Folder className="h-4 w-4" />
              Arbetsytor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="m-0">
            <div className="p-3 border-b space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="w-full justify-start gap-2"
              >
                <Checkbox checked={allSelected} />
                {allSelected ? 'Avmarkera alla' : 'Välj alla dokument'}
              </Button>
              {onUpload && (
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    className="hidden"
                    onChange={onUpload}
                    accept=".pdf,.docx,.txt,.csv"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    asChild
                  >
                    <div>
                      <Upload className="h-4 w-4" />
                      Importera dokument
                    </div>
                  </Button>
                </label>
              )}
            </div>
            <ScrollArea className="h-64">
              <div className="p-3 space-y-2">
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Inga dokument i arbetsytan
                  </p>
                ) : (
                  documents.map((doc) => (
                    <label
                      key={doc.id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedDocuments.includes(doc.id)}
                        onCheckedChange={() => handleDocumentToggle(doc.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.type} • {doc.size}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="workspaces" className="m-0">
            <ScrollArea className="h-80">
              <div className="p-3 space-y-2">
                {workspaces.map((workspace) => (
                  <label
                    key={workspace.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-border/50"
                  >
                    <Checkbox
                      checked={selectedWorkspaces.includes(workspace.id)}
                      onCheckedChange={() => handleWorkspaceToggle(workspace.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{workspace.icon}</span>
                        <p className="text-sm font-medium">{workspace.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {workspace.documentCount} dokument
                      </p>
                      {workspace.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {workspace.description}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};
