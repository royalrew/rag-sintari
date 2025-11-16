import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CreateTestCaseDialogProps {
  onCreated: () => void;
}

export const CreateTestCaseDialog = ({ onCreated }: CreateTestCaseDialogProps) => {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [expectedAnswer, setExpectedAnswer] = useState('');
  const [category, setCategory] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // TODO: Replace with actual API call
    // await createTestCase({ question, expectedAnswer, category });
    
    toast({
      title: 'Testfall skapat',
      description: 'Det nya testfallet har lagts till.',
    });
    
    setQuestion('');
    setExpectedAnswer('');
    setCategory('');
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nytt testfall
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Skapa nytt testfall</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Testfråga</Label>
            <Textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Vad är uppsägningstiden enligt kollektivavtalet?"
              required
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="expectedAnswer">Förväntat svar</Label>
            <Textarea
              id="expectedAnswer"
              value={expectedAnswer}
              onChange={(e) => setExpectedAnswer(e.target.value)}
              placeholder="Uppsägningstiden är 3 månader enligt paragraf 5.2"
              required
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Kategori (valfritt)</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="T.ex. Kollektivavtal, HR-policy, etc."
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Avbryt
            </Button>
            <Button type="submit">Skapa testfall</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
