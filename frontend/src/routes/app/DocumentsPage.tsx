import { useState, useEffect, useMemo } from 'react';
import { DocumentTable } from '@/components/app/DocumentTable';
import { TextLink } from '@/components/ui/TextLink';
import { Document } from '@/lib/mockData';
import { Upload, Search, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { uploadDocument, listDocuments, downloadDocument, deleteDocument } from '@/api/documents';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { routes } from '@/lib/routes';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, validateFile } from '@/lib/utils';

// Accepted file types - synkad med WorkspaceDetailPage
const ACCEPTED_FILE_TYPES = '.pdf,.doc,.docx,.txt,.md,.csv';

type FileType = 'all' | 'PDF' | 'Word' | 'other';
type SortBy = 'name' | 'date' | 'size';
type SortOrder = 'asc' | 'desc';

export const DocumentsPage = () => {
  const { currentWorkspace, workspaces, refreshWorkspaces } = useApp();
  const navigate = useNavigate();
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [filter, setFilter] = useState<FileType>('all');
  const [workspaceFilter, setWorkspaceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Load all documents from API
  useEffect(() => {
    const loadAllDocuments = async () => {
      try {
        const documents = await listDocuments();
        setAllDocuments(documents);
      } catch (error) {
        console.error('Failed to load documents:', error);
        toast.error('Kunde inte ladda dokument');
        // Fallback to empty array
        setAllDocuments([]);
      }
    };
    
    loadAllDocuments();
  }, []); // Load once on mount, refresh after upload

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    // Validera fil innan uppladdning
    try {
      validateFile(file);
    } catch (err: any) {
      if (err.message === "empty-file") {
        toast.error(
          "Kunde inte läsa filen. Det verkar som att filen inte är helt nedladdad från din molntjänst. Öppna filen i din moln-app (OneDrive / iCloud / Google Drive), se till att den är tillgänglig offline och försök igen."
        );
      } else if (err.message === "no-file") {
        toast.error("Ingen fil vald");
      } else {
        toast.error("Kunde inte läsa filen. Försök igen.");
      }
      e.target.value = '';
      return;
    }

    if (!currentWorkspace) {
      toast.error('Välj en arbetsyta först');
      e.target.value = '';
      return;
    }

    const toastId = toast.loading('Laddar upp dokument...');
    try {
      const newDocument = await uploadDocument(
        file, 
        currentWorkspace.name || currentWorkspace.id || 'default'
      );
      
      // Reload all documents from API to get fresh data
      const documents = await listDocuments();
      setAllDocuments(documents);
      
      // Refresh workspaces to update document count
      await refreshWorkspaces();
      
      toast.success('Dokument uppladdat!', { id: toastId });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Fel vid uppladdning av dokument', { id: toastId });
    }
    
    e.target.value = '';
  };

  const handleDocumentClick = (doc: Document) => {
    // Find workspace for this document - try both name and ID matching
    const workspace = workspaces.find(w => 
      w.id === doc.workspace || 
      w.name === doc.workspace
    );
    if (workspace) {
      navigate(`${routes.app.workspaces}/${workspace.id}`);
    } else {
      toast.error('Kunde inte hitta arbetsytan för detta dokument');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await deleteDocument(documentId);
      // Reload documents from API
      const documents = await listDocuments();
      setAllDocuments(documents);
      await refreshWorkspaces();
      toast.success('Dokument raderat');
    } catch (error: any) {
      console.error('Failed to delete document:', error);
      toast.error(error?.message || 'Kunde inte radera dokumentet');
    }
  };

  const handleDownloadDocument = async (doc: Document) => {
    console.log('[handleDownloadDocument] Click for doc:', doc.id, doc.name);
    
    try {
      // Always try to call backend - no early returns
      const result = await downloadDocument(doc.id);
      
      console.log('[handleDownloadDocument] Got response:', {
        ok: result.ok,
        hasUrl: !!result.url,
        filename: result.filename,
        urlPreview: result.url ? result.url.substring(0, 100) + '...' : 'no URL'
      });
      
      if (!result.ok || !result.url) {
        throw new Error('Backend returnerade ogiltigt svar');
      }
      
      console.log('[handleDownloadDocument] Opening presigned URL');
      const win = window.open(result.url, '_blank');
      
      if (!win) {
        console.warn('[handleDownloadDocument] Popup blocked, using fallback');
        const a = document.createElement('a');
        a.href = result.url;
        a.download = result.filename || doc.name;
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      
      toast.success(`Öppnar ${result.filename || doc.name}...`);
    } catch (err: any) {
      console.error('[handleDownloadDocument] Error downloading:', err);
      console.error('[handleDownloadDocument] Error details:', {
        message: err?.message,
        status: err?.status,
        data: err?.data,
        stack: err?.stack
      });
      
      // Show error - NOW we know backend actually said no
      let errorMessage = 'Dokumentet är inte tillgängligt för nedladdning';
      if (err?.status === 404) {
        errorMessage = 'Dokumentet hittades inte';
      } else if (err?.status === 403) {
        errorMessage = 'Du har inte behörighet att ladda ner detta dokument';
      } else if (err?.status === 503) {
        errorMessage = 'Lagringstjänsten är inte tillgänglig';
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err?.data?.detail) {
        errorMessage = err.data.detail;
      }
      
      toast.error(errorMessage);
    }
  };

  // Filter and sort documents
  const filteredAndSortedDocuments = useMemo(() => {
    let result = [...allDocuments];

    // Filter by file type
    if (filter !== 'all') {
      if (filter === 'other') {
        // "Övrigt" includes Text and CSV
        result = result.filter(doc => doc.type === 'Text' || doc.type === 'CSV');
      } else {
        result = result.filter(doc => doc.type === filter);
      }
    }

    // Filter by workspace
    if (workspaceFilter !== 'all') {
      result = result.filter(doc => {
        const workspace = workspaces.find(w => w.id === workspaceFilter || w.name === workspaceFilter);
        return workspace && (doc.workspace === workspace.name || doc.workspace === workspace.id);
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(doc => 
        doc.name.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'sv');
          break;
        case 'date':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'size':
          // Parse size (e.g., "1.5 MB" or "500 KB")
          const parseSize = (size: string): number => {
            const match = size.match(/([\d.]+)\s*(KB|MB|GB)/i);
            if (!match) return 0;
            const value = parseFloat(match[1]);
            const unit = match[2].toUpperCase();
            if (unit === 'GB') return value * 1024 * 1024;
            if (unit === 'MB') return value * 1024;
            return value; // KB
          };
          comparison = parseSize(a.size) - parseSize(b.size);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [allDocuments, filter, workspaceFilter, searchQuery, sortBy, sortOrder, workspaces]);

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dokument</h1>
          <p className="text-muted-foreground mt-1">
            {searchQuery || workspaceFilter !== 'all' || filter !== 'all'
              ? `${filteredAndSortedDocuments.length} av ${allDocuments.length} dokument matchar filtren`
              : `Totalt ${allDocuments.length} dokument`}
          </p>
        </div>

        <label className="cursor-pointer">
          <input
            type="file"
            className="hidden"
            onChange={handleUpload}
            accept={ACCEPTED_FILE_TYPES}
            disabled={!currentWorkspace}
          />
          <span className={cn(
            "inline-flex items-center gap-1.5 font-medium hover:underline underline-offset-4 transition-all duration-200",
            currentWorkspace 
              ? "text-accent hover:text-accent/80" 
              : "text-muted-foreground cursor-not-allowed"
          )}>
            <Upload className="h-4 w-4" />
            Ladda upp dokument
          </span>
        </label>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Sök efter dokumentnamn..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {/* Workspace Filter */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground whitespace-nowrap">Arbetsyta:</span>
            <Select value={workspaceFilter} onValueChange={setWorkspaceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla arbetsytor</SelectItem>
                {workspaces.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">{ws.icon}</span>
                      <span>{ws.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground whitespace-nowrap">Typ:</span>
            <div className="flex gap-1">
              {(['all', 'PDF', 'Word', 'other'] as FileType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={cn(
                    "px-2 py-1 rounded hover:text-accent transition-colors whitespace-nowrap",
                    filter === type 
                      ? 'text-accent font-medium underline underline-offset-4' 
                      : 'text-muted-foreground'
                  )}
                >
                  {type === 'all' 
                    ? 'Alla' 
                    : type === 'other' 
                      ? 'Övrigt (Text & CSV)' 
                      : type}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-muted-foreground whitespace-nowrap">Sortera:</span>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                {sortBy === 'name' ? 'Namn' : sortBy === 'date' ? 'Datum' : 'Storlek'}
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setSortBy('name'); setSortOrder('asc'); }}>
                  Namn {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy('date'); setSortOrder('desc'); }}>
                  Datum {sortBy === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy('size'); setSortOrder('desc'); }}>
                  Storlek {sortBy === 'size' && (sortOrder === 'desc' ? '↓' : '↑')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="text-muted-foreground hover:text-foreground"
              title={sortOrder === 'asc' ? 'Stigande' : 'Fallande'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Table or Cards */}
      {filteredAndSortedDocuments.length > 0 ? (
        <DocumentTable 
          documents={filteredAndSortedDocuments} 
          onDocumentClick={handleDocumentClick}
          onDelete={handleDeleteDocument}
          onDownload={handleDownloadDocument}
          searchQuery={searchQuery}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            {searchQuery || workspaceFilter !== 'all' || filter !== 'all'
              ? 'Inga dokument matchar dina filter'
              : 'Inga dokument än'}
          </p>
          <p className="text-sm text-muted-foreground/70 mt-2">
            {searchQuery || workspaceFilter !== 'all' || filter !== 'all'
              ? 'Prova att ändra dina filter eller sökterm'
              : 'Ladda upp dokument i en arbetsyta för att börja'}
          </p>
        </div>
      )}
    </div>
  );
};
