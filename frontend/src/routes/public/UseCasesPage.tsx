import { SectionCard } from '@/components/ui/SectionCard';
import { FileText, Users, Building2, Home, TrendingUp } from 'lucide-react';
import { useEffect } from 'react';

export const UseCasesPage = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const useCases = [
    {
      title: 'Avtal & juridik',
      icon: <FileText className="h-8 w-8" />,
      problem: 'Juridiska team spenderar timmar på att leta i avtal och dokument',
      solution: 'Dokument-AI hittar relevanta klausuler och avtalsvillkor på sekunder',
      questions: [
        'Vad är uppsägningstiden i avtalet med leverantör X?',
        'Vilka garantivillkor gäller för denna produkt?',
        'Finns det några konkurrensklausuler i anställningsavtalet?',
        'När löper nuvarande hyresavtal ut?',
      ],
    },
    {
      title: 'HR & policy',
      icon: <Users className="h-8 w-8" />,
      problem: 'Anställda och HR hittar inte svar i omfattande policydokument',
      solution: 'Fråga AI direkt och få tydliga svar med hänvisning till rätt policy',
      questions: [
        'Hur många semesterdagar har jag rätt till?',
        'Vad gäller för distansarbete?',
        'Vilka förmåner ingår i anställningen?',
        'Hur rapporterar jag en incident?',
      ],
    },
    {
      title: 'Konsultrapporter',
      icon: <Building2 className="h-8 w-8" />,
      problem: 'Svårt att hitta specifik information i långa analyser och rapporter',
      solution: 'AI sammanfattar och extraherar nyckelinformation från omfattande material',
      questions: [
        'Vilka rekommendationer gavs i Q4-rapporten?',
        'Vad var huvudutmaningarna i projektet?',
        'Vilka kostnadsbesparingar identifierades?',
        'Vilka risker lyftes fram?',
      ],
    },
    {
      title: 'Fastighetsdokument',
      icon: <Home className="h-8 w-8" />,
      problem: 'Fastighetsbolag hanterar hundratals avtal och dokument per objekt',
      solution: 'Centralisera all dokumentation och hitta information omedelbart',
      questions: [
        'Vem ansvarar för underhåll av ventilationen?',
        'När var senaste besiktningen?',
        'Vilka hyresgäster har uppsägningsklausuler?',
        'Vad kostar årlig fastighetsskötsel?',
      ],
    },
    {
      title: 'Ekonomi & redovisning',
      icon: <TrendingUp className="h-8 w-8" />,
      problem: 'Ekonomiavdelningar dränks i leverantörsavtal, bokslut, rapporter och policyer',
      solution: 'Hitta ekonomiska villkor, rutiner och underlag direkt med AI-sök',
      questions: [
        'Vad står i bokslutsinstruktionen om periodiseringar?',
        'Vilka kvitton saknar underlag?',
        'Vad är betalningsvillkoret för leverantör X?',
        'Vilka rutiner gäller för fakturahantering?',
      ],
    },
  ];

  return (
    <div className="container mx-auto px-6 py-16 space-y-16">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Användningsfall</h1>
        <p className="text-xl text-muted-foreground">
          Se hur Dokument-AI hjälper olika team och branscher
        </p>
      </div>

      <div className="space-y-12">
        {useCases.map((useCase) => (
          <div key={useCase.title} className="bg-card rounded-xl p-8 border border-border">
            <div className="flex items-start gap-6">
              <div className="text-accent">{useCase.icon}</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-4">{useCase.title}</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-2">
                      Problem
                    </h3>
                    <p>{useCase.problem}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-2">
                      Lösning
                    </h3>
                    <p>{useCase.solution}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-2">
                      Exempel på frågor
                    </h3>
                    <ul className="space-y-2">
                      {useCase.questions.map((q, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-accent mt-1">•</span>
                          <span className="text-sm">{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
