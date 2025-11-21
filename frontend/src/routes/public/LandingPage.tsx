import { routes } from '@/lib/routes';
import { TextLink } from '@/components/ui/TextLink';
import { SectionCard } from '@/components/ui/SectionCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Brain, MessageSquare, Shield, Users, Building2, FileText, Home, TrendingUp, Check } from 'lucide-react';

export const LandingPage = () => {
  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="container mx-auto px-6 py-32 text-center relative overflow-hidden">
        {/* Background glow effect */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/20 rounded-full blur-[120px] animate-pulse" />
        </div>
        
        <div className="animate-fade-in">
          <h1 className="text-6xl md:text-7xl font-bold mb-8 bg-gradient-to-br from-foreground via-foreground to-accent bg-clip-text text-transparent leading-tight">
            Chatta med dina dokument.
          </h1>
          <div className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed space-y-4">
            <p>
              AI som verkligen kan dina dokument.
            </p>
            <p>
              Vår RAG-motor läser, indexerar och söker i ditt material och ger svar med tydliga källor.
            </p>
            <p>
              Du får exakta, spårbara och företagsanpassade svar – direkt från dina egna filer.
            </p>
          </div>
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <TextLink 
              to={routes.app.overview} 
              variant="accent"
              className="text-lg px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:shadow-[0_0_30px_rgba(96,165,250,0.4)] transition-all duration-300"
            >
              Öppna appen
            </TextLink>
            <TextLink 
              to={routes.useCases} 
              variant="primary"
              className="text-lg"
            >
              Se användningsfall
            </TextLink>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-6 bg-gradient-to-br from-background to-background-secondary py-12 rounded-2xl">
        <h2 className="text-3xl font-bold text-center mb-12">Så fungerar det</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <SectionCard
            title="1. Ladda upp dokument"
            description="Dra och släpp era PDF:er, Word-filer eller textdokument"
            icon={<Upload className="h-8 w-8" />}
          />
          <SectionCard
            title="2. AI indexerar & analyserar"
            description="Vårt RAG-system bearbetar och förstår innehållet"
            icon={<Brain className="h-8 w-8" />}
          />
          <SectionCard
            title="3. Ställ frågor – få svar med källor"
            description="Chatta och få exakta svar med hänvisningar till rätt dokument"
            icon={<MessageSquare className="h-8 w-8" />}
          />
        </div>
      </section>

      {/* For Whom */}
      <section className="bg-gradient-to-br from-card to-card-secondary py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">För vem?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SectionCard
              title="Advokatbyråer"
              description="Hitta relevanta avtal och klausuler snabbt"
              icon={<Building2 className="h-6 w-6" />}
            />
            <SectionCard
              title="HR & Policy"
              description="Få svar om policys och anställningsvillkor direkt"
              icon={<Users className="h-6 w-6" />}
            />
            <SectionCard
              title="Konsulter"
              description="Analysera rapporter och hitta nyckelinformation"
              icon={<FileText className="h-6 w-6" />}
            />
            <SectionCard
              title="Fastighet"
              description="Håll koll på hyresavtal och fastighetsdokument"
              icon={<Home className="h-6 w-6" />}
            />
            <SectionCard
              title="Ekonomi"
              description="Navigera bokslut, avtal och finansiella rapporter"
              icon={<TrendingUp className="h-6 w-6" />}
            />
          </div>
        </div>
      </section>

      {/* Screenshots */}
      <section className="container mx-auto px-6 bg-gradient-to-tl from-muted to-muted-secondary py-12 rounded-2xl">
        <h2 className="text-3xl font-bold text-center mb-12">Skärmdumpar</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="rounded-lg bg-gradient-to-br from-card to-card-secondary h-64 flex items-center justify-center border border-border">
            <p className="text-muted-foreground">RAG Dashboard</p>
          </div>
          <div className="rounded-lg bg-gradient-to-br from-card to-card-secondary h-64 flex items-center justify-center border border-border">
            <p className="text-muted-foreground">Dokumentvy</p>
          </div>
          <div className="rounded-lg bg-gradient-to-br from-card to-card-secondary h-64 flex items-center justify-center border border-border">
            <p className="text-muted-foreground">Chat med källor</p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-6 bg-gradient-to-br from-background to-background-secondary py-12 rounded-2xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Välj rätt plan för er</h2>
          <p className="text-muted-foreground">Transparenta priser utan dolda kostnader</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {/* Start Plan */}
          <Card className="transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(96,165,250,0.3)] bg-gradient-to-br from-card to-card-secondary">
            <CardHeader>
              <CardTitle className="text-2xl">Start</CardTitle>
              <CardDescription>För mindre team och SME</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">399 kr</span>
                <span className="text-muted-foreground">/månad</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm">100 dokument / månad</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm">200 frågor / månad</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm">3 arbetsytor</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm">Källhänvisning</span>
                </li>
              </ul>
              <div className="mt-6">
                <TextLink to={routes.pricing} variant="primary" className="w-full justify-center">
                  Se alla funktioner
                </TextLink>
              </div>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(96,165,250,0.4)] border-accent border-2 bg-gradient-to-br from-card to-card-secondary">
            <CardHeader>
              <div className="flex items-center justify-end mb-2">
                <span className="text-xs font-semibold text-accent">POPULÄRAST</span>
              </div>
              <CardTitle className="text-2xl">Pro</CardTitle>
              <CardDescription>För växande företag</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">1 290 kr</span>
                <span className="text-muted-foreground">/månad</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm">1 000 dokument / månad</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm">Obegränsade frågor</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm">10 arbetsytor</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm">Hybrid retrieval + AI-sök</span>
                </li>
              </ul>
              <div className="mt-6">
                <TextLink to={routes.pricing} variant="accent" className="w-full justify-center">
                  Se alla funktioner
                </TextLink>
              </div>
            </CardContent>
          </Card>

          {/* Enterprise Plan */}
          <Card className="transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(96,165,250,0.3)] bg-gradient-to-br from-card to-card-secondary">
            <CardHeader>
              <CardTitle className="text-2xl">Enterprise</CardTitle>
              <CardDescription>För stora organisationer</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">9 900 kr</span>
                <span className="text-muted-foreground">/månad</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Onboarding: 45 000 – 120 000 kr
              </p>
              <p className="text-xs text-muted-foreground">
                Avtalstid: 12 månader
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm">Obegränsade dokument</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm">Obegränsade användare</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm">SSO & privat instans</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm">API-access & on-prem</span>
                </li>
              </ul>
              <div className="mt-6">
                <TextLink to={routes.pricing} variant="primary" className="w-full justify-center">
                  Se alla funktioner
                </TextLink>
              </div>
            </CardContent>
          </Card>

          {/* Pay-as-you-go */}
          <Card className="transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(96,165,250,0.35)] bg-gradient-to-br from-card to-card-secondary">
            <CardHeader>
              <CardTitle className="text-2xl">Pay-as-you-go</CardTitle>
              <CardDescription>Betala endast för det du använder</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">Ingen fast avgift</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm">0,50 kr per fråga</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm">0,10 kr per dokument-sida vid indexering</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm">20 kr per 1 000 embeddings</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm">Full Pro-funktionalitet</span>
                </li>
              </ul>
              <div className="mt-6">
                <TextLink to={routes.pricing} variant="primary" className="w-full justify-center">
                  Läs mer
                </TextLink>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Trust & Security */}
      <section className="bg-gradient-to-br from-card to-card-secondary py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Säkerhet & integritet</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <Shield className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Säker datahantering</h3>
              <p className="text-sm text-muted-foreground">
                Era dokument lagras krypterat och behandlas enligt GDPR
              </p>
            </div>
            <div className="text-center">
              <Users className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Privata arbetsytor</h3>
              <p className="text-sm text-muted-foreground">
                Separata miljöer för olika team och projekt
              </p>
            </div>
            <div className="text-center">
              <FileText className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Exportkontroll</h3>
              <p className="text-sm text-muted-foreground">
                Full kontroll över era data – exportera när ni vill
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
