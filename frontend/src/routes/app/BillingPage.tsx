import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TextLink } from '@/components/ui/TextLink';
import { getSubscriptionInfo, getBillingPortalUrl, createCheckoutSession, cancelSubscription } from '@/api/billing';
import * as authApi from '@/api/auth';
import { getCreditsBalance } from '@/api/credits';
import { toast } from 'sonner';
import { CreditCard, Calendar, CheckCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Plan prices mapping
const PLAN_PRICES: Record<string, string> = {
  start: '399 kr/mån',
  pro: '1 290 kr/mån',
  enterprise: '9 900 kr/mån',
  payg: 'Ingen fast avgift',
  credits: 'Ingen fast avgift',
};

// Plan display names
const PLAN_NAMES: Record<string, string> = {
  start: 'Start',
  pro: 'Pro',
  enterprise: 'Enterprise',
  payg: 'Pay-as-you-go',
  credits: 'Pay-as-you-go',
};

// Stripe price IDs (these should match your Stripe configuration)
const PLAN_PRICE_IDS: Record<string, string> = {
  start: 'price_start', // Replace with actual Stripe price ID
  pro: 'price_pro', // Replace with actual Stripe price ID
  enterprise: 'price_enterprise', // Replace with actual Stripe price ID
};

export const BillingPage = () => {
  const [planInfo, setPlanInfo] = useState({
    plan: 'start',
    planName: 'Start',
    price: '399 kr/mån',
    nextBillingDate: '',
    status: 'active',
    loading: true,
  });
  const [usageStats, setUsageStats] = useState({
    docs: { used: 0, limit: 0, unlimited: false },
    queries: { used: 0, limit: 0, unlimited: false },
    workspaces: { used: 0, limit: 0, unlimited: false },
  });
  const [credits, setCredits] = useState({
    current: 0,
    monthly: 0,
    used: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load subscription info
      const subscriptionInfo = await getSubscriptionInfo();
      const plan = subscriptionInfo.plan || 'start';
      
      // Format date
      let nextBillingDate = '';
      if (subscriptionInfo.currentPeriodEnd) {
        const date = new Date(subscriptionInfo.currentPeriodEnd);
        nextBillingDate = date.toLocaleDateString('sv-SE', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }

      setPlanInfo({
        plan,
        planName: PLAN_NAMES[plan] || plan.charAt(0).toUpperCase() + plan.slice(1),
        price: PLAN_PRICES[plan] || 'Okänt',
        nextBillingDate,
        status: subscriptionInfo.status || 'active',
        loading: false,
      });

      // Load usage stats from /auth/me
      try {
        const user = await authApi.getCurrentUser();
        if (user?.usage) {
          setUsageStats({
            docs: user.usage.docs || { used: 0, limit: 0, unlimited: false },
            queries: user.usage.queries || { used: 0, limit: 0, unlimited: false },
            workspaces: user.usage.workspaces || { used: 0, limit: 0, unlimited: false },
          });
        }
      } catch (error) {
        console.error('Failed to load usage stats:', error);
      }

      // Load credits balance
      try {
        const creditsBalance = await getCreditsBalance();
        setCredits({
          current: creditsBalance.current_balance,
          monthly: creditsBalance.monthly_allocation,
          used: creditsBalance.month_used,
        });
      } catch (error) {
        console.error('Failed to load credits:', error);
      }
    } catch (error: any) {
      console.error('Failed to load subscription info:', error);
      toast.error('Kunde inte ladda faktureringsinformation');
      setPlanInfo(prev => ({ ...prev, loading: false }));
    }
  };

  const handleOpenPortal = async () => {
    try {
      const { portalUrl } = await getBillingPortalUrl(window.location.href);
      window.location.href = portalUrl;
    } catch (error: any) {
      console.error('Portal error:', error);
      toast.error(error?.message || 'Kunde inte öppna faktureringsportalen');
    }
  };

  const handleChangePlan = async (planId: string) => {
    try {
      const priceId = PLAN_PRICE_IDS[planId];
      if (!priceId) {
        toast.error('Planen är inte konfigurerad ännu');
        return;
      }
      
      const { checkoutUrl } = await createCheckoutSession({
        priceId,
        successUrl: window.location.href,
        cancelUrl: window.location.href,
      });
      window.location.href = checkoutUrl;
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error?.message || 'Kunde inte skapa checkout-session');
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await cancelSubscription();
      toast.success('Abonnemanget avslutas vid periodens slut');
      await loadSubscriptionInfo();
    } catch (error) {
      toast.error('Kunde inte avsluta abonnemanget');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Fakturering</h1>
        <p className="text-muted-foreground mt-1">Hantera din prenumeration</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Aktuell plan</CardTitle>
          <CardDescription>Din nuvarande prenumeration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <CreditCard className="h-6 w-6 text-accent" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-2xl font-bold">{planInfo.planName}</h3>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  planInfo.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : planInfo.status === 'canceled'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  <CheckCircle className="h-3 w-3" />
                  {planInfo.status === 'active' ? 'Aktiv' : 
                   planInfo.status === 'canceled' ? 'Avslutad' :
                   planInfo.status === 'past_due' ? 'Förfallen' :
                   planInfo.status === 'trialing' ? 'Testperiod' : planInfo.status}
                </span>
              </div>
              <p className="text-lg text-muted-foreground">{planInfo.price}</p>
            </div>
          </div>

          {planInfo.nextBillingDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Nästa förnyelse: {planInfo.nextBillingDate}</span>
            </div>
          )}

          <div className="pt-4 border-t border-border flex items-center justify-between">
            <TextLink onClick={handleOpenPortal} variant="accent">
              Hantera betalning & faktura i Stripe
            </TextLink>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <TextLink variant="subtle" className="text-red-600 hover:text-red-700" icon="none">
                  Avsluta abonnemang
                </TextLink>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Är du säker?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ditt abonnemang kommer att avslutas vid periodens slut ({planInfo.nextBillingDate}). 
                    Du kan fortsätta använda tjänsten fram till dess.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancelSubscription} className="bg-red-600 hover:bg-red-700">
                    Avsluta
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Change Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Byt plan</CardTitle>
          <CardDescription>Uppgradera eller nedgradera din prenumeration</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-lg border transition-colors ${
              planInfo.plan === 'start' 
                ? 'border-2 border-accent bg-accent/5' 
                : 'border-border hover:border-accent'
            }`}>
              <h4 className="font-semibold mb-2">Start</h4>
              <p className="text-2xl font-bold mb-4">399 kr/mån</p>
              {planInfo.plan === 'start' ? (
                <span className="text-sm text-muted-foreground">Din nuvarande plan</span>
              ) : (
                <TextLink onClick={() => handleChangePlan('start')} variant="subtle">
                  Byt till Start
                </TextLink>
              )}
            </div>

            <div className={`p-4 rounded-lg border transition-colors ${
              planInfo.plan === 'pro' 
                ? 'border-2 border-accent bg-accent/5' 
                : 'border-border hover:border-accent'
            }`}>
              <h4 className="font-semibold mb-2">Pro</h4>
              <p className="text-2xl font-bold mb-4">1 290 kr/mån</p>
              {planInfo.plan === 'pro' ? (
                <span className="text-sm text-muted-foreground">Din nuvarande plan</span>
              ) : (
                <TextLink onClick={() => handleChangePlan('pro')} variant="subtle">
                  Byt till Pro
                </TextLink>
              )}
            </div>

            <div className={`p-4 rounded-lg border transition-colors ${
              planInfo.plan === 'enterprise' 
                ? 'border-2 border-accent bg-accent/5' 
                : 'border-border hover:border-accent'
            }`}>
              <h4 className="font-semibold mb-2">Enterprise</h4>
              <p className="text-2xl font-bold mb-4">9 900 kr/mån</p>
              {planInfo.plan === 'enterprise' ? (
                <span className="text-sm text-muted-foreground">Din nuvarande plan</span>
              ) : (
                <TextLink onClick={() => handleChangePlan('enterprise')} variant="subtle">
                  Byt till Enterprise
                </TextLink>
              )}
            </div>

            <div className={`p-4 rounded-lg border transition-colors ${
              planInfo.plan === 'payg' || planInfo.plan === 'credits'
                ? 'border-2 border-accent bg-accent/5' 
                : 'border-border hover:border-accent'
            }`}>
              <h4 className="font-semibold mb-2">Pay-as-you-go</h4>
              <p className="text-lg font-bold mb-4">Ingen fast avgift</p>
              {(planInfo.plan === 'payg' || planInfo.plan === 'credits') ? (
                <span className="text-sm text-muted-foreground">Din nuvarande plan</span>
              ) : (
                <TextLink onClick={() => handleChangePlan('payg')} variant="subtle">
                  Byt till Pay-as-you-go
                </TextLink>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Användning denna månad</CardTitle>
          <CardDescription>Översikt av din förbrukning</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Credits</p>
              <p className="text-2xl font-bold">
                {Math.round(credits.used).toLocaleString('sv-SE')}
                {credits.monthly > 0 ? (
                  <span className="text-sm font-normal text-muted-foreground"> / {Math.round(credits.monthly).toLocaleString('sv-SE')}</span>
                ) : (
                  <span className="text-sm font-normal text-muted-foreground"> / ∞</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Saldo: {Math.round(credits.current).toLocaleString('sv-SE')} credits
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Dokument</p>
              <p className="text-2xl font-bold">
                {usageStats.docs.used}
                {usageStats.docs.unlimited ? (
                  <span className="text-sm font-normal text-muted-foreground"> / ∞</span>
                ) : (
                  <span className="text-sm font-normal text-muted-foreground"> / {usageStats.docs.limit}</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Frågor</p>
              <p className="text-2xl font-bold">
                {usageStats.queries.used.toLocaleString('sv-SE')}
                {usageStats.queries.unlimited ? (
                  <span className="text-sm font-normal text-muted-foreground"> / ∞</span>
                ) : (
                  <span className="text-sm font-normal text-muted-foreground"> / {usageStats.queries.limit.toLocaleString('sv-SE')}</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Arbetsytor</p>
              <p className="text-2xl font-bold">
                {usageStats.workspaces.used}
                {usageStats.workspaces.unlimited ? (
                  <span className="text-sm font-normal text-muted-foreground"> / ∞</span>
                ) : (
                  <span className="text-sm font-normal text-muted-foreground"> / {usageStats.workspaces.limit}</span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
