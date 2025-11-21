import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextLink } from '@/components/ui/TextLink';
import { routes } from '@/lib/routes';
import { ArrowLeft } from 'lucide-react';
import { ApiError } from '@/api/client';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      // login() navigerar automatiskt vid lyckad inloggning
    } catch (err: any) {
      console.error('Login error:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Något oväntat gick fel. Försök igen.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <TextLink to={routes.home} variant="subtle" icon="none" className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Tillbaka till startsidan
        </TextLink>
        
        <Card className="w-full">
        <CardHeader>
          <CardTitle>Logga in</CardTitle>
          <CardDescription>Välkommen tillbaka till Dokument-AI</CardDescription>
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

            <div className="space-y-2">
              <Label htmlFor="password">Lösenord</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full inline-flex justify-center items-center gap-1.5 text-accent hover:text-accent/80 font-medium hover:underline underline-offset-4 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loggar in...' : 'Logga in →'}
              </button>
              
              <div className="flex items-center justify-between text-sm">
                <TextLink to={routes.register} variant="subtle" icon="none">
                  Skapa konto istället
                </TextLink>
                <TextLink to={routes.forgotPassword} variant="subtle" icon="none">
                  Glömt lösenord?
                </TextLink>
              </div>
            </div>
          </form>
        </CardContent>
        </Card>
      </div>
    </div>
  );
};
