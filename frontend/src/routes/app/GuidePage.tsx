import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TextLink } from '@/components/ui/TextLink';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { routes } from '@/lib/routes';

export const GuidePage = () => {
  const steps = [
    {
      title: 'Skapa en arbetsyta',
      description: 'Börja med att skapa din första arbetsyta där du kan organisera dina dokument.',
      details: [
        'Gå till "Arbetsytor" i sidomenyn',
        'Klicka på "Skapa ny arbetsyta"',
        'Ge arbetsytan ett beskrivande namn',
        'Klicka på "Skapa" för att slutföra'
      ]
    },
    {
      title: 'Ladda upp dokument',
      description: 'Ladda upp de dokument du vill att AI:n ska kunna svara frågor om.',
      details: [
        'Navigera till "Dokument" i menyn',
        'Klicka på "Ladda upp dokument"',
        'Välj filer (PDF, Word, Text, CSV)',
        'Vänta tills uppladdningen är klar'
      ]
    },
    {
      title: 'Ställ frågor till AI',
      description: 'Nu kan du börja chatta med AI:n om dina dokument.',
      details: [
        'Gå till "Chat" i sidomenyn',
        'Välj rätt arbetsyta i dropdown-menyn',
        'Skriv din fråga i chattfältet',
        'AI:n svarar baserat på dina dokument'
      ]
    },
    {
      title: 'Utvärdera resultat',
      description: 'Mät och förbättra AI:ns prestanda över tid.',
      details: [
        'Besök "Utvärdering" i menyn',
        'Granska träffsäkerhets-statistik',
        'Se vilka frågor som fungerar bäst',
        'Förbättra dokumentationen vid behov'
      ]
    }
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <TextLink to={routes.app.help} variant="subtle" icon="arrow" className="mb-4">
          <ArrowLeft className="h-4 w-4" />
          Tillbaka till Hjälp
        </TextLink>
        <h1 className="text-3xl font-bold">Komma igång guide</h1>
        <p className="text-muted-foreground mt-1">
          Följ dessa enkla steg för att komma igång med Dokument-AI
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">{step.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 ml-14">
                {step.details.map((detail, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gradient-to-br from-card to-card-secondary border-accent/20">
        <CardHeader>
          <CardTitle>Nästa steg</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Nu när du är igång, utforska mer av plattformen:
          </p>
          <div className="flex flex-wrap gap-3">
            <TextLink to={routes.app.workspaces} variant="accent" icon="chevron">
              Gå till Arbetsytor
            </TextLink>
            <TextLink to={routes.app.documents} variant="accent" icon="chevron">
              Ladda upp dokument
            </TextLink>
            <TextLink to={routes.app.chat} variant="accent" icon="chevron">
              Starta en chat
            </TextLink>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
