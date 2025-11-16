import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import { TestCase } from '@/lib/mockData';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TestCaseDetailDialogProps {
  testCase: TestCase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TestCaseDetailDialog = ({ testCase, open, onOpenChange }: TestCaseDetailDialogProps) => {
  if (!testCase) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Testfallsdetaljer
            <Badge variant={testCase.status === 'pass' ? 'default' : 'destructive'}>
              {testCase.status === 'pass' ? (
                <CheckCircle2 className="h-3 w-3 mr-1" />
              ) : (
                <XCircle className="h-3 w-3 mr-1" />
              )}
              {testCase.status === 'pass' ? 'Godkänd' : 'Misslyckad'}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Fråga</h3>
              <p className="text-sm">{testCase.question}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Förväntat svar</h3>
              <p className="text-sm">{testCase.expectedAnswer}</p>
            </div>

            {testCase.actualAnswer && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Faktiskt svar från AI</h3>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">{testCase.actualAnswer}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Träffsäkerhet</h3>
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all"
                    style={{ width: `${testCase.accuracy}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{testCase.accuracy}%</span>
              </div>
            </div>

            {testCase.sources && testCase.sources.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Använda källor</h3>
                <div className="space-y-2">
                  {testCase.sources.map((source, index) => (
                    <div key={index} className="text-sm bg-muted/50 p-3 rounded-lg">
                      <p className="font-medium">{source.documentName} (sida {source.page})</p>
                      <p className="text-muted-foreground text-xs mt-1">{source.excerpt}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
