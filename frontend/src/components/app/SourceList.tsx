import { Source } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Lightbulb, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface SourceListProps {
  sources: Source[];
  availableDocuments?: Array<{ id: string; name: string; type: string; size: string }>;
  selectedDocumentIds?: string[];
  onDocumentToggle?: (documentId: string, checked: boolean) => void;
}

export const SourceList = ({ 
  sources, 
  availableDocuments = [],
  selectedDocumentIds = [],
  onDocumentToggle
}: SourceListProps) => {
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  
  return (
    <Card className="h-full flex flex-col bg-gradient-to-br from-card to-card-secondary">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-base">Källor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 overflow-y-auto overflow-x-hidden p-4">
        {sources.length === 0 ? (
          availableDocuments.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tillgängliga dokument
                {selectedDocumentIds.length > 0 && (
                  <span className="ml-2 text-accent">
                    ({selectedDocumentIds.length} valda)
                  </span>
                )}
              </p>
              {availableDocuments.map((doc) => {
                const isSelected = selectedDocumentIds.includes(doc.id);
                return (
                  <TooltipProvider key={doc.id}>
                    <div
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                        isSelected
                          ? "border-green-500/50 bg-green-500/5 shadow-[0_0_6px_rgba(34,197,94,0.4)]"
                          : "border-border/40 hover:bg-muted/10"
                      )}
                      onClick={() => onDocumentToggle?.(doc.id, !isSelected)}
                    >
                      {/* Bot-ikon */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Bot
                            className={cn(
                              "h-5 w-5 transition-colors flex-shrink-0",
                              isSelected
                                ? "text-green-500 hover:text-green-600"
                                : "text-muted-foreground hover:text-red-500"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDocumentToggle?.(doc.id, !isSelected);
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          {isSelected
                            ? "AI använder detta dokument"
                            : "AI ignorerar detta dokument"}
                        </TooltipContent>
                      </Tooltip>

                      {/* Filikon */}
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          isSelected && "text-green-700 dark:text-green-400"
                        )}>
                          {doc.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {doc.type} • {doc.size}
                        </p>
                      </div>
                    </div>
                  </TooltipProvider>
                );
              })}
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
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Använda källor
            </p>
            {sources.map((source, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg border border-green-500/50 bg-green-500/5 shadow-[0_0_6px_rgba(34,197,94,0.4)] transition-all"
            >
              <div className="flex items-start gap-3">
                {/* Bot-ikon (alltid grön eftersom dessa källor användes) */}
                <Bot className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                
                {/* Filikon */}
                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-green-700 dark:text-green-400">
                    {source.documentName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Sida {source.page}</p>
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
