import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { Workspace } from '@/lib/mockData';

interface CreateWorkspaceDialogProps {
  onCreateWorkspace: (workspace: Omit<Workspace, 'id'>) => void;
}

const icons = ['📁', '👥', '📄', '📊', '🏢', '💼', '🔧', '📚', '🎯', '💡'];

export const CreateWorkspaceDialog = ({ onCreateWorkspace }: CreateWorkspaceDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(icons[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    onCreateWorkspace({
      name: name.trim(),
      description: description.trim() || undefined,
      icon: selectedIcon,
      documentCount: 0,
      lastActive: new Date().toISOString().split('T')[0],
      activeUsers: 1,
    });

    setName('');
    setDescription('');
    setSelectedIcon(icons[0]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1.5 text-accent hover:text-accent/80 font-medium hover:underline underline-offset-4 transition-all duration-200">
          <Plus className="h-4 w-4" />
          Skapa ny arbetsyta
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Skapa ny arbetsyta</DialogTitle>
          <DialogDescription>
            Organisera dokument i en ny arbetsyta för bättre struktur
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Namn *</Label>
            <Input
              id="name"
              placeholder="t.ex. HR Policy, Avtal Q1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivning (valfritt)</Label>
            <Textarea
              id="description"
              placeholder="Beskriv vad denna arbetsyta används till..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Välj ikon (valfritt)</Label>
            <div className="flex flex-wrap gap-2">
              {icons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`text-2xl p-2 rounded-md transition-all hover:scale-110 ${
                    selectedIcon === icon
                      ? 'bg-accent/20 ring-2 ring-accent'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Avbryt
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Skapa arbetsyta
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
