import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TextLink } from '@/components/ui/TextLink';
import { toast } from 'sonner';

export const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Contact form submitted:', formData);
    toast.success('Tack för ditt meddelande! Vi återkommer inom 1-2 arbetsdagar.');
    setFormData({ name: '', company: '', email: '', message: '' });
  };

  return (
    <div className="container mx-auto px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Kontakta oss</h1>
          <p className="text-xl text-muted-foreground">
            Intresserad av demo eller pilot? Hör av dig!
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Skicka förfrågan</CardTitle>
            <CardDescription>
              Vi svarar normalt inom 1–2 arbetsdagar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Namn</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Företag</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Meddelande</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={6}
                  required
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 text-accent hover:text-accent/80 font-medium hover:underline underline-offset-4 transition-all duration-200"
              >
                Skicka förfrågan →
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
