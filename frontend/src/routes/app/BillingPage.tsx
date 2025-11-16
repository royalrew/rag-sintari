import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TextLink } from '@/components/ui/TextLink';
import { getSubscriptionInfo, getBillingPortalUrl, createCheckoutSession, cancelSubscription } from '@/api/billing';
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

export const BillingPage = () => {
  const [planInfo, setPlanInfo] = useState({
    plan: 'Pro',
    price: '1 290 kr/mån',
    nextBillingDate: '2024-02-15',
    status: 'active',
  });

  useEffect(() => {
    loadSubscriptionInfo();
  }, []);

  const loadSubscriptionInfo = async () => {
    const info = await getSubscriptionInfo();
    setPlanInfo({
      plan: info.plan.charAt(0).toUpperCase() + info.plan.slice(1),
      price: info.plan === 'pro' ? '1 290 kr/mån' : '399 kr/mån',
      nextBillingDate: info.currentPeriodEnd,
      status: info.status,
    });
  };

  const handleOpenPortal = async () => {
    try {
      const { portalUrl } = await getBillingPortalUrl(window.location.href);
      toast.info('Här öppnar vi Stripe Customer Portal i produktion.');
      // In production: window.location.href = portalUrl;
    } catch (error) {
      toast.error('Kunde inte öppna faktureringsportalen');
    }
  };

  const handleChangePlan = async (planId: string) => {
    try {
      const { checkoutUrl } = await createCheckoutSession({
        priceId: planId,
        successUrl: window.location.href,
        cancelUrl: window.location.href,
      });
      toast.info('Här kopplar vi in Stripe Checkout senare.');
      // In production: window.location.href = checkoutUrl;
    } catch (error) {
      toast.error('Kunde inte skapa checkout-session');
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
                <h3 className="text-2xl font-bold">{planInfo.plan}</h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3" />
                  Aktiv
                </span>
              </div>
              <p className="text-lg text-muted-foreground">{planInfo.price}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Nästa förnyelse: {planInfo.nextBillingDate}</span>
          </div>

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
            <div className="p-4 rounded-lg border border-border hover:border-accent transition-colors">
              <h4 className="font-semibold mb-2">Start</h4>
              <p className="text-2xl font-bold mb-4">399 kr/mån</p>
              <TextLink onClick={() => handleChangePlan('starter')} variant="subtle">
                Byt till Start
              </TextLink>
            </div>

            <div className="p-4 rounded-lg border-2 border-accent bg-accent/5">
              <h4 className="font-semibold mb-2">Pro</h4>
              <p className="text-2xl font-bold mb-4">1 290 kr/mån</p>
              <span className="text-sm text-muted-foreground">Din nuvarande plan</span>
            </div>

            <div className="p-4 rounded-lg border border-border hover:border-accent transition-colors">
              <h4 className="font-semibold mb-2">Enterprise</h4>
              <p className="text-2xl font-bold mb-4">9 900 kr/mån</p>
              <TextLink onClick={() => handleChangePlan('enterprise')} variant="subtle">
                Byt till Enterprise
              </TextLink>
            </div>

            <div className="p-4 rounded-lg border border-border hover:border-accent transition-colors">
              <h4 className="font-semibold mb-2">Pay-as-you-go</h4>
              <p className="text-lg font-bold mb-4">Ingen fast avgift</p>
              <TextLink onClick={() => handleChangePlan('payg')} variant="subtle">
                Byt till Pay-as-you-go
              </TextLink>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Användning denna månad</CardTitle>
          <CardDescription>Översikt av din förbrukning</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Dokument</p>
              <p className="text-2xl font-bold">47 <span className="text-sm font-normal text-muted-foreground">/ 500</span></p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Frågor</p>
              <p className="text-2xl font-bold">1,234 <span className="text-sm font-normal text-muted-foreground">/ 5,000</span></p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Arbetsytor</p>
              <p className="text-2xl font-bold">4 <span className="text-sm font-normal text-muted-foreground">/ ∞</span></p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
