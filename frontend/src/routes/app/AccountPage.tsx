import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { User, Mail, Shield, FileText, MessageSquare, Folder, AlertCircle, CheckCircle2, Coins, History } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { getSubscriptionInfo, SubscriptionInfo } from '@/api/billing';
import { getCurrentUser, UsageStats } from '@/api/auth';
import { Progress } from '@/components/ui/progress';
import { TextLink } from '@/components/ui/TextLink';
import { routes } from '@/lib/routes';
import { getCreditsBalance, getCreditsHistory, CreditsBalance, CreditTransaction } from '@/api/credits';
import { CreditsPurchaseModal } from '@/components/app/CreditsPurchaseModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const AccountPage = () => {
  const { user } = useAuth();
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [creditsBalance, setCreditsBalance] = useState<CreditsBalance | null>(null);
  const [creditsHistory, setCreditsHistory] = useState<CreditTransaction[]>([]);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const info = await getSubscriptionInfo();
        setSubscriptionInfo(info);
        
        // Load usage stats from /auth/me
        const currentUser = await getCurrentUser();
        if (currentUser?.usage) {
          setUsageStats(currentUser.usage);
        }

        // Load credits balance
        const balance = await getCreditsBalance();
        setCreditsBalance(balance);

        // Load credits history
        const history = await getCreditsHistory(20);
        setCreditsHistory(history.transactions);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    loadData();
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

        {/* Credits Balance */}
        {creditsBalance && (
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Credits
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    <History className="h-4 w-4 mr-2" />
                    Historik
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowPurchaseModal(true)}
                  >
                    Köp fler credits
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-4">
                <div className="text-4xl font-bold mb-2">
                  {creditsBalance.current_balance.toFixed(1)}
                </div>
                <p className="text-muted-foreground">credits kvar</p>
              </div>

              {creditsBalance.monthly_allocation > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Denna månad har du använt {creditsBalance.month_used.toFixed(1)} credits
                    </span>
                    <span className="font-medium">
                      {creditsBalance.month_remaining.toFixed(1)} kvar av månadens {creditsBalance.monthly_allocation.toFixed(0)} credits
                    </span>
                  </div>
                  <Progress
                    value={(creditsBalance.month_used / creditsBalance.monthly_allocation) * 100}
                    className="h-2"
                  />
                </div>
              )}

              {creditsBalance.expires_soon.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-yellow-600 flex items-center gap-1 mb-2">
                    <AlertCircle className="h-3 w-3" />
                    Credits som går ut snart:
                  </p>
                  {creditsBalance.expires_soon.map((exp, idx) => (
                    <p key={idx} className="text-xs text-muted-foreground">
                      {exp.amount.toFixed(1)} credits går ut {new Date(exp.expires_at).toLocaleDateString('sv-SE')}
                    </p>
                  ))}
                </div>
              )}

              {showHistory && (
                <div className="pt-4 border-t border-border mt-4">
                  <h4 className="text-sm font-medium mb-3">Senaste transaktioner</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Typ</TableHead>
                        <TableHead>Belopp</TableHead>
                        <TableHead>Beskrivning</TableHead>
                        <TableHead>Saldo efter</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creditsHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            Ingen historik ännu
                          </TableCell>
                        </TableRow>
                      ) : (
                        creditsHistory.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="text-sm">
                              {new Date(tx.timestamp).toLocaleDateString('sv-SE', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </TableCell>
                            <TableCell>
                              <span className="text-xs px-2 py-1 rounded bg-muted">
                                {tx.type === 'monthly_allocation' ? 'Tilldelning' :
                                 tx.type === 'purchase' ? 'Köp' :
                                 tx.type === 'usage' ? 'Användning' :
                                 tx.type === 'expiration' ? 'Expiration' :
                                 tx.type === 'refund' ? 'Återbetalning' :
                                 tx.type === 'bonus' ? 'Bonus' : tx.type}
                              </span>
                            </TableCell>
                            <TableCell className={tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {tx.description || '-'}
                            </TableCell>
                            <TableCell className="font-medium">
                              {tx.balance_after.toFixed(1)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
                  {usageStats?.plan === 'start' ? 'Start' : usageStats?.plan === 'pro' ? 'Pro' : usageStats?.plan === 'enterprise' ? 'Enterprise' : usageStats?.plan === 'payg' ? 'Pay-as-you-go' : usageStats?.plan || 'Start'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Statistics */}
        {usageStats && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Användning denna månad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Documents Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <Label>Dokument</Label>
                  </div>
                  <span className="text-sm font-medium">
                    {usageStats.docs.used} {usageStats.docs.unlimited ? '' : `/ ${usageStats.docs.limit}`}
                  </span>
                </div>
                {!usageStats.docs.unlimited && (
                  <>
                    <Progress 
                      value={(usageStats.docs.used / usageStats.docs.limit) * 100} 
                      className="h-2"
                    />
                    {usageStats.docs.used >= usageStats.docs.limit * 0.9 && (
                      <p className="text-xs text-yellow-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Du närmar dig gränsen. <TextLink to={routes.pricing} variant="subtle" className="text-xs">Uppgradera</TextLink> för fler dokument.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Queries Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <Label>Frågor</Label>
                  </div>
                  <span className="text-sm font-medium">
                    {usageStats.queries.used} {usageStats.queries.unlimited ? '(Obegränsat)' : `/ ${usageStats.queries.limit}`}
                  </span>
                </div>
                {!usageStats.queries.unlimited && (
                  <>
                    <Progress 
                      value={(usageStats.queries.used / usageStats.queries.limit) * 100} 
                      className="h-2"
                    />
                    {usageStats.queries.used >= usageStats.queries.limit * 0.9 && (
                      <p className="text-xs text-yellow-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Du närmar dig gränsen. <TextLink to={routes.pricing} variant="subtle" className="text-xs">Uppgradera</TextLink> för obegränsade frågor.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Workspaces Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    <Label>Arbetsytor</Label>
                  </div>
                  <span className="text-sm font-medium">
                    {usageStats.workspaces.used} {usageStats.workspaces.unlimited ? '(Obegränsat)' : `/ ${usageStats.workspaces.limit}`}
                  </span>
                </div>
                {!usageStats.workspaces.unlimited && (
                  <>
                    <Progress 
                      value={(usageStats.workspaces.used / usageStats.workspaces.limit) * 100} 
                      className="h-2"
                    />
                    {usageStats.workspaces.used >= usageStats.workspaces.limit && (
                      <p className="text-xs text-yellow-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Du har nått max antal arbetsytor. <TextLink to={routes.pricing} variant="subtle" className="text-xs">Uppgradera</TextLink> för fler arbetsytor.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Plan Features */}
              <div className="pt-4 border-t border-border">
                <Label className="mb-3 block">Plan-funktioner</Label>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    {usageStats.features.hybrid_retrieval ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={usageStats.features.hybrid_retrieval ? '' : 'text-muted-foreground'}>
                      Hybrid retrieval
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {usageStats.features.csv_support ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={usageStats.features.csv_support ? '' : 'text-muted-foreground'}>
                      CSV-stöd
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {usageStats.features.excel_support ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={usageStats.features.excel_support ? '' : 'text-muted-foreground'}>
                      Excel-stöd
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {usageStats.features.api_access ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={usageStats.features.api_access ? '' : 'text-muted-foreground'}>
                      API-access
                    </span>
                  </div>
                </div>
                {(!usageStats.features.hybrid_retrieval || !usageStats.features.csv_support || !usageStats.features.excel_support) && (
                  <div className="mt-4">
                    <TextLink to={routes.pricing} variant="accent" className="text-sm">
                      Uppgradera för fler funktioner →
                    </TextLink>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <CreditsPurchaseModal
        open={showPurchaseModal}
        onOpenChange={setShowPurchaseModal}
      />
    </div>
  );
};
