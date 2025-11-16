import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { TestCase } from '@/lib/mockData';

interface EditTestCaseDialogProps {
  testCase: TestCase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export const EditTestCaseDialog = ({ testCase, open, onOpenChange, onUpdated }: EditTestCaseDialogProps) => {
  const [question, setQuestion] = useState('');
  const [expectedAnswer, setExpectedAnswer] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (testCase) {
      setQuestion(testCase.question);
      setExpectedAnswer(testCase.expectedAnswer);
    }
  }, [testCase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // TODO: Replace with actual API call
    // await updateTestCase(testCase.id, { question, expectedAnswer });
    
    toast({
      title: 'Testfall uppdaterat',
      description: 'Ändringarna har sparats.',
    });
    
    onOpenChange(false);
    onUpdated();
  };

  if (!testCase) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Redigera testfall</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-question">Testfråga</Label>
            <Textarea
              id="edit-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-expectedAnswer">Förväntat svar</Label>
            <Textarea
              id="edit-expectedAnswer"
              value={expectedAnswer}
              onChange={(e) => setExpectedAnswer(e.target.value)}
              required
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button type="submit">Spara ändringar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
