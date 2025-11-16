import { useState } from 'react';
import { TestCase } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import { Tag } from '@/components/ui/Tag';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EditTestCaseDialog } from './EditTestCaseDialog';
import { TestCaseDetailDialog } from './TestCaseDetailDialog';
import { useToast } from '@/hooks/use-toast';

interface TestCaseListProps {
  testCases: TestCase[];
  onUpdate: () => void;
}

export const TestCaseList = ({ testCases, onUpdate }: TestCaseListProps) => {
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [viewingTestCase, setViewingTestCase] = useState<TestCase | null>(null);
  const { toast } = useToast();

  const handleDelete = async (testCase: TestCase) => {
    // TODO: Replace with actual API call
    // await deleteTestCase(testCase.id);
    
    toast({
      title: 'Testfall borttaget',
      description: 'Testfallet har tagits bort.',
    });
    
    onUpdate();
  };

  return (
    <>
      <div className="space-y-3">
        {testCases.map((test) => (
          <Card key={test.id} className="hover:border-accent transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div 
                  className="flex-1 cursor-pointer" 
                  onClick={() => setViewingTestCase(test)}
                >
                  <p className="text-sm font-medium">{test.question}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Förväntat: {test.expectedAnswer}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{test.accuracy}%</span>
                  <Tag variant={test.status === 'pass' ? 'success' : 'error'}>
                    {test.status === 'pass' ? (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    ) : (
                      <XCircle className="h-3 w-3 mr-1" />
                    )}
                    {test.status === 'pass' ? 'Godkänd' : 'Misslyckad'}
                  </Tag>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuItem onClick={() => setViewingTestCase(test)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Visa detaljer
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditingTestCase(test)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Redigera
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(test)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Ta bort
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <EditTestCaseDialog
        testCase={editingTestCase}
        open={!!editingTestCase}
        onOpenChange={(open) => !open && setEditingTestCase(null)}
        onUpdated={onUpdate}
      />

      <TestCaseDetailDialog
        testCase={viewingTestCase}
        open={!!viewingTestCase}
        onOpenChange={(open) => !open && setViewingTestCase(null)}
      />
    </>
  );
};
