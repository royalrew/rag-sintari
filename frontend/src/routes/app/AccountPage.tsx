import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { User, Mail, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { getSubscriptionInfo, SubscriptionInfo } from '@/api/billing';

export const AccountPage = () => {
  const { user } = useAuth();
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const info = await getSubscriptionInfo();
        setSubscriptionInfo(info);
      } catch (error) {
        console.error('Failed to load subscription info:', error);
      }
    };
    loadSubscription();
  }, []);

  const handleSaveChanges = () => {
    toast.success('Ändringar sparade');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mitt konto</h1>
        <p className="text-muted-foreground mt-2">
          Hantera dina kontoinställningar och personliga uppgifter
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profilinformation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Namn</Label>
              <Input
                id="name"
                defaultValue={user?.name}
                placeholder="Ditt namn"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-postadress</Label>
              <Input
                id="email"
                type="email"
                defaultValue={user?.email}
                placeholder="din@email.com"
              />
            </div>
            <Button onClick={handleSaveChanges} className="w-full">
              Spara ändringar
            </Button>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Säkerhet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Nuvarande lösenord</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nytt lösenord</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Bekräfta nytt lösenord</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
              />
            </div>
            <Button onClick={handleSaveChanges} variant="secondary" className="w-full">
              Uppdatera lösenord
            </Button>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Kontoinformation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label className="text-muted-foreground">Användar-ID</Label>
                <p className="font-mono text-sm mt-1">{user?.id}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">E-poststatus</Label>
                <p className="text-sm mt-1 text-green-600">Verifierad</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Aktiv plan</Label>
                <p className="text-sm mt-1 font-medium capitalize">
                  {subscriptionInfo?.plan === 'free' ? 'Start' : subscriptionInfo?.plan || 'Start'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
