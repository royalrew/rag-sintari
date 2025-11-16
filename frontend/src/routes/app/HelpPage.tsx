import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TextLink } from '@/components/ui/TextLink';
import { BookOpen, Video, MessageCircle, ExternalLink } from 'lucide-react';

export const HelpPage = () => {
  const faqs = [
    {
      question: 'Hur laddar jag upp dokument?',
      answer: 'Gå till "Dokument" i sidomenyn och klicka på "Ladda upp dokument". Du kan ladda upp PDF, Word, Text och CSV-filer.',
    },
    {
      question: 'Hur skapar jag en ny arbetsyta?',
      answer: 'Under "Arbetsytor" klickar du på "Skapa ny arbetsyta". Ge den ett namn och börja ladda upp dokument.',
    },
    {
      question: 'Vad är träffsäkerhet?',
      answer: 'Träffsäkerhet mäter hur väl AI:ns svar matchar förväntade svar i testfall. Hittas under "Utvärdering".',
    },
    {
      question: 'Hur får jag bättre AI-svar?',
      answer: 'Ställ specifika frågor, referera till dokumentnamn om möjligt, och använd samma termer som i dina dokument.',
    },
    {
      question: 'Kan jag exportera mina dokument?',
      answer: 'Ja, du har full kontroll över dina data och kan exportera när som helst via Inställningar.',
    },
  ];

  const resources = [
    {
      title: 'Komma igång guide',
      description: 'Lär dig grunderna i 5 minuter',
      icon: <BookOpen className="h-6 w-6" />,
      link: '/app/guide',
    },
    {
      title: 'Video-tutorials',
      description: 'Se hur funktionerna används',
      icon: <Video className="h-6 w-6" />,
      link: '/app/videos',
    },
    {
      title: 'Community forum',
      description: 'Ställ frågor till andra användare',
      icon: <MessageCircle className="h-6 w-6" />,
      link: '/app/community',
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold">Hjälp & Dokumentation</h1>
        <p className="text-muted-foreground mt-1">
          Allt du behöver veta för att komma igång med Dokument-AI
        </p>
      </div>

      {/* Quick Resources */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {resources.map((resource) => (
          <Card key={resource.title} className="hover:border-accent transition-colors">
            <CardHeader>
              <div className="text-accent mb-2">{resource.icon}</div>
              <CardTitle className="text-lg">{resource.title}</CardTitle>
              <CardDescription>{resource.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <TextLink to={resource.link} variant="accent" icon="chevron">
                Läs mer
              </TextLink>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQs */}
      <Card>
        <CardHeader>
          <CardTitle>Vanliga frågor</CardTitle>
          <CardDescription>Snabba svar på vanliga frågor</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-border last:border-0 pb-6 last:pb-0">
              <h3 className="font-semibold mb-2">{faq.question}</h3>
              <p className="text-sm text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card>
        <CardHeader>
          <CardTitle>Behöver du mer hjälp?</CardTitle>
          <CardDescription>Vi finns här för att hjälpa dig</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h4 className="font-medium mb-1">E-postsupport</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Vi svarar normalt inom 24 timmar
              </p>
              <a
                href="mailto:jimmy@sintari.se"
                className="inline-flex items-center gap-1.5 text-accent hover:text-accent/80 font-medium hover:underline underline-offset-4 transition-all duration-200"
              >
                jimmy@sintari.se
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="flex items-start gap-4 pt-4 border-t border-border">
            <div className="flex-1">
              <h4 className="font-medium mb-1">Live-chat</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Tillgänglig vardagar 9-17
              </p>
              <button className="inline-flex items-center gap-1.5 text-accent hover:text-accent/80 font-medium hover:underline underline-offset-4 transition-all duration-200">
                Starta chat →
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
