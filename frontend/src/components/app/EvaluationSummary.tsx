import { TestCase } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Tag } from '@/components/ui/Tag';

interface EvaluationSummaryProps {
  testCases: TestCase[];
}

export const EvaluationSummary = ({ testCases }: EvaluationSummaryProps) => {
  const totalTests = testCases.length;
  const passedTests = testCases.filter((t) => t.status === 'pass').length;
  const failedTests = testCases.filter((t) => t.status === 'fail').length;
  const avgAccuracy = testCases.reduce((sum, t) => sum + t.accuracy, 0) / totalTests;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Antal testfrågor</p>
          <p className="text-3xl font-bold mt-1">{totalTests}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Träffsäkerhet</p>
          <p className="text-3xl font-bold mt-1">{avgAccuracy.toFixed(0)}%</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Godkända / Misslyckade</p>
          <p className="text-3xl font-bold mt-1">
            {passedTests} / {failedTests}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
