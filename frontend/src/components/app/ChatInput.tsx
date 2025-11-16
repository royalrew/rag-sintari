import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { TextLink } from '@/components/ui/TextLink';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, HelpCircle } from 'lucide-react';
import { Document, Workspace } from '@/lib/mockData';
import { DocumentSelector } from './DocumentSelector';

interface ChatInputProps {
  onSend: (message: string, documentIds: string[], workspaceIds: string[]) => void;
  disabled?: boolean;
  documents: Document[];
  workspaces: Workspace[];
  onOpenQuickActions?: () => void;
  shouldHighlight?: boolean;
  onUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ChatInput = ({ onSend, disabled, documents, workspaces, onOpenQuickActions, shouldHighlight, onUpload }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<string[]>([]);
  const [placeholder, setPlaceholder] = useState('');
  
  const fullPlaceholder = 'Ställ en fråga om dina dokument...';
  
  // Typewriter effect for placeholder
  useEffect(() => {
    if (!shouldHighlight) {
      setPlaceholder(fullPlaceholder);
      return;
    }
    
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= fullPlaceholder.length) {
        setPlaceholder(fullPlaceholder.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 50);
    
    return () => clearInterval(interval);
  }, [shouldHighlight]);

  const handleSend = () => {
    if (message.trim()) {
      onSend(message, selectedDocuments, selectedWorkspaces);
      setMessage('');
      // Keep selections for next message
    }
  };

  const removeDocument = (documentId: string) => {
    setSelectedDocuments(selectedDocuments.filter(id => id !== documentId));
  };

  const removeWorkspace = (workspaceId: string) => {
    setSelectedWorkspaces(selectedWorkspaces.filter(id => id !== workspaceId));
  };

  const getDocumentName = (id: string) => documents.find(d => d.id === id)?.name || id;
  const getWorkspaceName = (id: string) => workspaces.find(w => w.id === id)?.name || id;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasSelections = selectedDocuments.length > 0 || selectedWorkspaces.length > 0;

  return (
    <div className="space-y-2">
      {/* Chips for selected items */}
      {hasSelections && (
        <div className="flex flex-wrap gap-2">
          {selectedWorkspaces.map((workspaceId) => (
            <Badge 
              key={workspaceId} 
              variant="secondary"
              className="gap-1.5 pr-1.5"
            >
              <span className="text-xs">📁 {getWorkspaceName(workspaceId)}</span>
              <button
                onClick={() => removeWorkspace(workspaceId)}
                className="hover:bg-background/50 rounded-sm p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedDocuments.map((documentId) => (
            <Badge 
              key={documentId} 
              variant="outline"
              className="gap-1.5 pr-1.5"
            >
              <span className="text-xs truncate max-w-[200px]">{getDocumentName(documentId)}</span>
              <button
                onClick={() => removeDocument(documentId)}
                className="hover:bg-background/50 rounded-sm p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-2 items-end">
        <div className="flex flex-col gap-2 items-center">
          {onOpenQuickActions && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenQuickActions}
              className="h-9 w-9"
              title="Snabbfrågor"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
          )}
            <DocumentSelector
              documents={documents}
              workspaces={workspaces}
              selectedDocuments={selectedDocuments}
              selectedWorkspaces={selectedWorkspaces}
              onDocumentsChange={setSelectedDocuments}
              onWorkspacesChange={setSelectedWorkspaces}
              onUpload={onUpload}
            />
        </div>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`min-h-[80px] resize-none transition-all duration-300 ${
            shouldHighlight 
              ? 'ring-2 ring-accent/50 shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)]' 
              : ''
          }`}
          disabled={disabled}
        />
        <TextLink onClick={handleSend} variant="accent" icon="arrow">
          Skicka
        </TextLink>
      </div>
    </div>
  );
};
