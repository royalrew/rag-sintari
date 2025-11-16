import { useState } from 'react';
import { DocumentTable } from '@/components/app/DocumentTable';
import { TextLink } from '@/components/ui/TextLink';
import { mockDocuments, Document } from '@/lib/mockData';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { uploadDocument } from '@/api/documents';
import { useApp } from '@/context/AppContext';

type FileType = 'all' | 'PDF' | 'Word' | 'Text' | 'CSV';

export const DocumentsPage = () => {
  const { currentWorkspace } = useApp();
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [filter, setFilter] = useState<FileType>('all');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast.loading('Laddar upp dokument...');
    try {
      const newDocument = await uploadDocument(file, currentWorkspace?.name || 'HR Policy');
      setDocuments([newDocument, ...documents]);
      toast.success('Dokument uppladdat! Indexering påbörjad.');
    } catch (error) {
      toast.error('Fel vid uppladdning av dokument');
    }
    
    e.target.value = '';
  };

  const filteredDocuments = filter === 'all' 
    ? documents 
    : documents.filter(doc => doc.type === filter);

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dokument</h1>
          <p className="text-muted-foreground mt-1">
            {documents.length} dokument totalt
          </p>
        </div>

        <label className="cursor-pointer">
          <input
            type="file"
            className="hidden"
            onChange={handleUpload}
            accept=".pdf,.docx,.txt,.csv"
          />
          <span className="inline-flex items-center gap-1.5 text-accent hover:text-accent/80 font-medium hover:underline underline-offset-4 transition-all duration-200">
            <Upload className="h-4 w-4" />
            Ladda upp dokument
          </span>
        </label>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Filtrera:</span>
        {(['all', 'PDF', 'Word', 'Text', 'CSV'] as FileType[]).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-2 py-1 rounded hover:text-accent transition-colors whitespace-nowrap ${
              filter === type ? 'text-accent font-medium underline underline-offset-4' : 'text-muted-foreground'
            }`}
          >
            {type === 'all' ? 'Alla' : type}
          </button>
        ))}
      </div>

      {/* Table or Cards */}
      <DocumentTable documents={filteredDocuments} />
    </div>
  );
};
