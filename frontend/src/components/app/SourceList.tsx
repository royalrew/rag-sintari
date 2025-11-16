import { Source } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Trash2, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface SourceListProps {
  sources: Source[];
  onRemoveSource?: (index: number) => void;
  availableDocuments?: Array<{ id: string; name: string; type: string; size: string }>;
}

export const SourceList = ({ sources, onRemoveSource, availableDocuments = [] }: SourceListProps) => {
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-base">Källor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 overflow-y-auto overflow-x-hidden p-4">
        {sources.length === 0 ? (
          availableDocuments.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tillgängliga dokument</p>
              {availableDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 rounded-lg bg-muted/30 border border-border hover:border-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{doc.type} • {doc.size}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground font-medium">Inga dokument än</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Importera dokument i arbetsytan för att börja</p>
            </div>
          )
        ) : (
          <>
            {sources.map((source, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-muted/50 border border-border hover:border-accent transition-colors relative group"
            >
              {onRemoveSource && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
                  onClick={() => onRemoveSource(idx)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0 pr-6">
                  <p className="text-sm font-medium truncate">{source.documentName}</p>
                  <p className="text-xs text-muted-foreground mt-1">Sida {source.page}</p>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {source.excerpt}
                  </p>
                </div>
              </div>
            </div>
            ))}
            
            {/* Disclaimer */}
            {showDisclaimer && (
              <div className="sticky bottom-0 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-2xl p-4 shadow-sm">
                <div className="flex gap-3">
                  <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      <strong>Tips:</strong> För bästa resultat, undvik att blanda olika kategorier i dina källor (t.ex. ekonomi och juridik). Välj källor från samma område för mer exakta svar.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDisclaimer(false)}
                    className="ml-2 h-8 px-3 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  >
                    OK
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Disclaimer when no sources and no documents */}
        {sources.length === 0 && availableDocuments.length === 0 && showDisclaimer && (
          <div className="relative bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-2xl p-4 shadow-sm mt-4">
            <div className="flex gap-3">
              <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Tips:</strong> För bästa resultat, undvik att blanda olika kategorier i dina källor (t.ex. ekonomi och juridik). Välj källor från samma område för mer exakta svar.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDisclaimer(false)}
                className="ml-2 h-8 px-3 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                OK
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
