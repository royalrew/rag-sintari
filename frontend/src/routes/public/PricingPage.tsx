import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TextLink } from '@/components/ui/TextLink';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { createCheckoutSession } from '@/api/billing';
import { useEffect } from 'react';

export const PricingPage = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const handleSelectPlan = async (planId: string) => {
    try {
      const { checkoutUrl } = await createCheckoutSession({
        priceId: planId,
        successUrl: window.location.origin + '/app/billing',
        cancelUrl: window.location.href,
      });
      toast.info('Här kopplar vi in Stripe Checkout senare.');
      // In production: window.location.href = checkoutUrl;
    } catch (error) {
      toast.error('Kunde inte skapa checkout-session');
    }
  };

  const plans = [
    {
      id: 'starter',
      name: 'Start',
      price: '399 kr/mån',
      description: 'För mindre team och SME',
      features: [
        '100 dokument / månad',
        '200 frågor / månad',
        '3 arbetsytor',
        'Stöd: PDF, DOCX, TXT, MD',
        'Grundläggande chunkning',
        'Semantisk retrieval (embeddings)',
        'Källhänvisning',
        'Export: TXT & PDF',
        'Historik: 30 dagar',
        '1 användare',
      ],
      limitations: [
        'Ingen hybrid retrieval',
        'Ingen CSV/Excel-support',
        'Ingen team-funktion',
        'Ingen API-access',
        'Långsammare indexering',
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '1 290 kr/mån',
      description: 'För växande företag',
      features: [
        '1 000 dokument / månad',
        'Obegränsade frågor',
        '10 arbetsytor',
        'Stöd: PDF, DOCX, TXT, MD, CSV, XLSX',
        'Hybrid retrieval: embeddings + BM25 + reranking',
        'Snabb indexering (prio-queue)',
        'AI-sök i alla dokument',
        'Historik: 365 dagar',
        '5 användare',
        'Eval/precision-panel',
        'Riskanalys (beta)',
        'Export: PDF, Word, Excel',
        'Bas-version av AuditAgent (begränsad)',
        'Bas-version av PDF Exporter Agent (standardrapport)',
      ],
      limitations: [
        'Ingen privat instans',
        'Ingen SSO',
        'Ingen obegränsad användarlicens',
        'Begränsad audit/prestanda-granskning',
      ],
      popular: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '9 900 kr/mån',
      description: 'För stora organisationer',
      onboarding: 'Onboarding: 45 000 – 120 000 kr',
      contractTerm: 'Avtalstid: 12 månader',
      features: [
        'Obegränsade dokument',
        'Obegränsade användare',
        'Obegränsade arbetsytor',
        'Privat instans / egen databas',
        'SSO (Azure AD, Google Workspace)',
        'Audit log + avancerade säkerhetsmoduler',
        'Prioriterad support (SLA & 4h svarstid)',
        'Avancerad eval-suite + regression monitoring',
        'Dedikerade embeddings-modeller',
        'API-access',
        'On-prem deployment (valbart)',
        'Egna modeller / policys',
        'Full AuditAgent (djupanalys + regressionsdetektion)',
        'Full PDF Exporter Agent (brandad, avancerad rapport, grafer)',
        'Dedikerad account manager',
        'Kundanpassade pipelines och agent-extensions',
      ],
      limitations: [
        'Kräver offert',
        'Kräver databehandlingsavtal (DPA)',
      ],
    },
    {
      id: 'payg',
      name: 'Pay-as-you-go',
      price: 'Ingen fast avgift',
      description: 'Betala endast för det du använder',
      pricing: [
        '0,50 kr per fråga',
        '0,10 kr per dokument-sida vid indexering',
        '20 kr per 1 000 embeddings',
      ],
      features: [
        'Full Pro-funktionalitet',
        'Ingen månadsavgift',
        'Fakturering baserat på usage',
        'Perfekt för oregelbunden användning eller piloter',
      ],
    },
  ];

  return (
    <div className="container mx-auto px-6 py-16 space-y-16 relative">
      {/* Blue neon glow background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-40 right-1/3 w-80 h-80 bg-accent/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Priser</h1>
        <p className="text-xl text-muted-foreground">
          Välj det paket som passar er bäst
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-accent/20 ${plan.popular ? 'border-accent border-2 shadow-lg' : ''}`}
          >
            <CardHeader>
              {plan.popular && (
                <div className="text-xs font-semibold text-accent mb-2">
                  POPULÄRAST
                </div>
              )}
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="text-2xl font-bold mt-4">{plan.price}</div>
              {plan.onboarding && (
                <p className="text-xs text-muted-foreground mt-1">{plan.onboarding}</p>
              )}
              {plan.contractTerm && (
                <p className="text-xs text-muted-foreground mt-1">{plan.contractTerm}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {plan.pricing && (
                <div className="space-y-2 pb-4 border-b border-border">
                  <p className="text-sm font-medium">Prissättning:</p>
                  <ul className="space-y-1">
                    {plan.pricing.map((price, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground">
                        • {price}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium mb-3">Ingår:</p>
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs">
                      <Check className="h-3.5 w-3.5 text-accent mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {plan.limitations && (
                <div className="pt-3 border-t border-border">
                  <p className="text-sm font-medium mb-3 text-muted-foreground">Begränsningar:</p>
                  <ul className="space-y-2">
                    {plan.limitations.map((limitation, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground">
                        • {limitation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <TextLink
                onClick={() => handleSelectPlan(plan.id)}
                variant="accent"
                className="block text-center"
              >
                Välj {plan.name}
              </TextLink>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center text-sm text-muted-foreground max-w-2xl mx-auto">
        <p>
          Alla priser är exklusive moms. Kontakta oss för anpassade lösningar eller volymrabatter.
        </p>
      </div>
    </div>
  );
};
