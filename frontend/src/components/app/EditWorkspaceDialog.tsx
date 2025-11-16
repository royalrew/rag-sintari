import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Workspace } from '@/lib/mockData';

interface EditWorkspaceDialogProps {
  workspace: Workspace;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<Workspace>) => void;
}

const iconOptions = ['📄', '👥', '📊', '🏢', '💼', '📁', '🎯', '⚙️'];

export const EditWorkspaceDialog = ({ workspace, open, onOpenChange, onSave }: EditWorkspaceDialogProps) => {
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || '');
  const [icon, setIcon] = useState(workspace.icon || '📄');

  useEffect(() => {
    if (open) {
      setName(workspace.name);
      setDescription(workspace.description || '');
      setIcon(workspace.icon || '📄');
    }
  }, [open, workspace]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, description, icon });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redigera arbetsyta</DialogTitle>
          <DialogDescription>
            Ändra namn, beskrivning och ikon för arbetsytan
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Namn</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivning (valfritt)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Ikon</Label>
            <div className="flex gap-2 flex-wrap">
              {iconOptions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-12 h-12 text-2xl rounded-md border-2 transition-all ${
                    icon === emoji
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button type="submit">
              Spara ändringar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
