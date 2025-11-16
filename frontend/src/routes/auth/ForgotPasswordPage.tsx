import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextLink } from '@/components/ui/TextLink';
import { routes } from '@/lib/routes';
import { toast } from 'sonner';
import { forgotPassword } from '@/api/auth';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await forgotPassword(email);
    toast.success(result.message);
    setEmail('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Återställ lösenord</CardTitle>
          <CardDescription>Ange din e-postadress</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">E-post</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-4">
              <button type="submit" className="w-full inline-flex justify-center items-center gap-1.5 text-accent hover:text-accent/80 font-medium hover:underline underline-offset-4 transition-all duration-200">
                Skicka återställningslänk →
              </button>
              
              <div className="text-center text-sm">
                <TextLink to={routes.login} variant="subtle" icon="none">
                  Tillbaka till inloggning
                </TextLink>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
