import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextLink } from '@/components/ui/TextLink';
import { routes } from '@/lib/routes';
import { ApiError } from '@/api/client';

// bcrypt tillåter bara 72 bytes
const MAX_PASSWORD_BYTES = 72;

function isTooLongPassword(pw: string): boolean {
  return new TextEncoder().encode(pw).length > MAX_PASSWORD_BYTES;
}

export const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Frontend-validering för lösenordslängd
    if (isTooLongPassword(password)) {
      setError('Lösenordet får max vara 72 tecken (teknisk gräns i bcrypt).');
      setLoading(false);
      return;
    }

    try {
      await register(name, email, password);
      // register() navigerar automatiskt vid lyckad registrering
    } catch (err: any) {
      console.error('Registration error:', err);
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
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Skapa konto</CardTitle>
          <CardDescription>Kom igång med Dokument-AI</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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
                {loading ? 'Skapar konto...' : 'Skapa konto →'}
              </button>
              
              <div className="text-center text-sm">
                <TextLink to={routes.login} variant="subtle" icon="none">
                  Har redan konto? Logga in
                </TextLink>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
