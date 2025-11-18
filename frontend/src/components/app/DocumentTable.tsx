import { Document } from '@/lib/mockData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Tag } from '@/components/ui/Tag';
import { FileText, FileCheck, Loader2, Download, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
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
import { useState } from 'react';

interface DocumentTableProps {
  documents: Document[];
  onDelete?: (documentId: string) => void;
  onDocumentClick?: (document: Document) => void;
  searchQuery?: string; // For highlighting search matches
}

export const DocumentTable = ({ documents, onDelete, onDocumentClick, searchQuery = '' }: DocumentTableProps) => {
  // Helper function to highlight search matches
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-200 px-0.5 rounded">
          {part}
        </mark>
      ) : part
    );
  };
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

  const handleDownload = (e: React.MouseEvent, doc: Document) => {
    e.stopPropagation(); // Prevent triggering row/card click
    if (doc.downloadUrl) {
      // In a real app, this would trigger actual download
      const link = document.createElement('a');
      link.href = doc.downloadUrl;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'Laddar ner dokument',
        description: `${doc.name} laddas ner...`,
      });
    } else {
      toast({
        title: 'Fel',
        description: 'Dokumentet är inte tillgängligt för nedladdning',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, doc: Document) => {
    e.stopPropagation(); // Prevent triggering row/card click
    setDocumentToDelete(doc);
  };

  const confirmDelete = () => {
    if (documentToDelete) {
      if (onDelete) {
        onDelete(documentToDelete.id);
      }
      toast({
        title: 'Dokument raderat',
        description: `${documentToDelete.name} har raderats`,
      });
      setDocumentToDelete(null);
    }
  };
  
  const getStatusVariant = (status: Document['status']) => {
    switch (status) {
      case 'indexed':
        return 'success';
      case 'processing':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: Document['status']) => {
    switch (status) {
      case 'indexed':
      case 'ready':
        return 'Indexerad';
      case 'processing':
        return 'Bearbetar';
      case 'error':
        return 'Fel';
      default:
        return 'Saknar metadata';
    }
  };

  // Mobile card view
  if (isMobile) {
    return (
      <>
        <div className="space-y-4 w-full">
        {documents.map((doc) => (
          <Card 
            key={doc.id} 
            className={cn(
              "bg-gradient-to-br from-card to-card-secondary w-full",
              onDocumentClick && "cursor-pointer hover:border-accent transition-colors"
            )}
            onClick={() => onDocumentClick?.(doc)}
          >
            <CardContent className="p-3 space-y-2.5">
              <div className="flex items-start gap-2 w-full">
                <FileText className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onDocumentClick) {
                        onDocumentClick(doc);
                      } else {
                        handleDownload(e, doc);
                      }
                    }}
                    className="font-semibold text-sm break-words leading-tight text-left hover:text-accent transition-colors hover:underline w-full"
                    disabled={doc.status === 'processing' || doc.status === 'error'}
                  >
                    {highlightMatch(doc.name, searchQuery)}
                  </button>
                  <p className="text-xs text-muted-foreground mt-1">{doc.type} • {doc.size}</p>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <Tag variant={getStatusVariant(doc.status)} className="text-xs">
                      {getStatusLabel(doc.status)}
                    </Tag>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => handleDownload(e, doc)}
                      disabled={doc.status === 'processing' || doc.status === 'error'}
                      className="h-7 w-7 p-0"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => handleDeleteClick(e, doc)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="pt-2 border-t border-border space-y-1 text-xs">
                <div className="flex justify-between gap-2 min-w-0">
                  <span className="text-muted-foreground flex-shrink-0">Arbetsyta:</span>
                  <span className="font-medium truncate">{doc.workspace}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground flex-shrink-0">Uppdaterad:</span>
                  <span className="font-medium">{doc.updatedAt}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Är du säker?</AlertDialogTitle>
            <AlertDialogDescription>
              Vill du verkligen radera <strong>{documentToDelete?.name}</strong>? 
              Denna åtgärd kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Radera
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
    );
  }

  // Desktop table view
  return (
    <>
      <div className="rounded-lg border bg-gradient-to-br from-card to-card-secondary">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Namn</TableHead>
            <TableHead>Typ</TableHead>
            <TableHead>Storlek</TableHead>
            <TableHead>Arbetsyta</TableHead>
            <TableHead>Senast uppdaterad</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow 
              key={doc.id} 
              className={cn(
                "hover:bg-muted/50",
                onDocumentClick && "cursor-pointer"
              )}
              onClick={() => onDocumentClick?.(doc)}
            >
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onDocumentClick) {
                        onDocumentClick(doc);
                      } else {
                        handleDownload(e, doc);
                      }
                    }}
                    className="hover:text-accent transition-colors hover:underline text-left"
                    disabled={doc.status === 'processing' || doc.status === 'error'}
                  >
                    {highlightMatch(doc.name, searchQuery)}
                  </button>
                </div>
              </TableCell>
              <TableCell>{doc.type}</TableCell>
              <TableCell>{doc.size}</TableCell>
              <TableCell>{doc.workspace}</TableCell>
              <TableCell>{doc.updatedAt}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Tag variant={getStatusVariant(doc.status)}>
                    {getStatusLabel(doc.status)}
                  </Tag>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => handleDownload(e, doc)}
                    disabled={doc.status === 'processing' || doc.status === 'error'}
                    className="h-8 w-8 p-0"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => handleDeleteClick(e, doc)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

    <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Är du säker?</AlertDialogTitle>
          <AlertDialogDescription>
            Vill du verkligen radera <strong>{documentToDelete?.name}</strong>? 
            Denna åtgärd kan inte ångras.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Radera
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
};
