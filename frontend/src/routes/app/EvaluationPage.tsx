import { useState, useEffect } from 'react';
import { EvaluationSummary } from '@/components/app/EvaluationSummary';
import { TestCaseList } from '@/components/app/TestCaseList';
import { CreateTestCaseDialog } from '@/components/app/CreateTestCaseDialog';
import { TestCase } from '@/lib/mockData';
import { getTestCases, runEvaluation } from '@/api/evaluation';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const EvaluationPage = () => {
  const { currentWorkspace } = useApp();
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTestCases();
  }, [currentWorkspace]);

  const loadTestCases = async () => {
    if (currentWorkspace) {
      const data = await getTestCases(currentWorkspace.id);
      setTestCases(data);
    }
  };

  const handleRunEvaluation = async () => {
    if (!currentWorkspace) return;
    
    setIsRunning(true);
    try {
      const response = await runEvaluation({ workspaceId: currentWorkspace.id });
      setTestCases(response.results);
      
      toast({
        title: 'Utvärdering slutförd',
        description: `${response.summary.passed} av ${response.summary.totalTests} tester godkända. Genomsnittlig träffsäkerhet: ${response.summary.averageAccuracy}%`,
      });
    } catch (error) {
      toast({
        title: 'Fel vid utvärdering',
        description: 'Kunde inte köra utvärderingen. Försök igen.',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Utvärdering</h1>
          <p className="text-muted-foreground mt-1">
            Mät och förbättra AI:ns träffsäkerhet
          </p>
        </div>
        <div className="flex gap-3">
          <CreateTestCaseDialog onCreated={loadTestCases} />
          <Button 
            onClick={handleRunEvaluation} 
            disabled={isRunning || testCases.length === 0}
            size="default"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Kör utvärdering...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Kör utvärdering
              </>
            )}
          </Button>
        </div>
      </div>

      <EvaluationSummary testCases={testCases} />

      <Card>
        <CardHeader>
          <CardTitle>Testfall</CardTitle>
        </CardHeader>
        <CardContent>
          {testCases.length > 0 ? (
            <TestCaseList testCases={testCases} onUpdate={loadTestCases} />
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Inga testfall ännu. Skapa ditt första testfall för att komma igång.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
