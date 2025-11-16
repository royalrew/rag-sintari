import { SectionCard } from '@/components/ui/SectionCard';
import { Target, Zap, Shield } from 'lucide-react';

export const AboutPage = () => {
  return (
    <div className="container mx-auto px-6 py-16 space-y-16">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Om Dokument-AI</h1>
        <p className="text-xl text-muted-foreground">
          Sveriges smartaste AI för dokumenthantering
        </p>
      </div>

      {/* Why Section */}
      <section className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">Varför Dokument-AI?</h2>
        <div className="prose prose-lg max-w-none text-muted-foreground">
          <p>
            Vi byggde Dokument-AI för att lösa ett verkligt problem: det tar för lång tid att hitta
            information i omfattande dokument. Oavsett om det handlar om avtal, policys eller rapporter
            är rätt svar ofta begravda i hundratals sidor text.
          </p>
          <p>
            Med vår RAG-baserade (Retrieval-Augmented Generation) AI-lösning kan ni chatta med era
            dokument som om de vore en expert kollega – och alltid få svar med exakta källhänvisningar.
          </p>
        </div>
      </section>

      {/* Technology */}
      <section className="bg-card py-12 rounded-xl">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold mb-12 text-center">Tekniken bakom</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <SectionCard
              title="RAG-arkitektur"
              description="Retrieval-Augmented Generation kombinerar sökning med generativ AI för exakta svar"
              icon={<Zap className="h-8 w-8" />}
            />
            <SectionCard
              title="Vektorisering"
              description="Era dokument omvandlas till semantiska vektorer för intelligent sökning"
              icon={<Target className="h-8 w-8" />}
            />
            <SectionCard
              title="Källhänvisning"
              description="Varje svar backas upp med exakta referenser till originaldokument"
              icon={<Shield className="h-8 w-8" />}
            />
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">Vår vision</h2>
        <div className="prose prose-lg max-w-none text-muted-foreground">
          <p>
            Vi vill bli Sveriges ledande plattform för dokumentbaserad AI. Vårt mål är att varje
            organisation – oavsett storlek – ska kunna dra nytta av avancerad AI-teknologi för att
            arbeta smartare med sina dokument.
          </p>
          <p>
            Genom att kombinera kraftfull teknik med enkel användning gör vi AI tillgänglig för alla,
            från mindre advokatbyråer till stora företag.
          </p>
        </div>
      </section>
    </div>
  );
};
