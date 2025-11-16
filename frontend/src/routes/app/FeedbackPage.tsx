import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ThumbsUp, ThumbsDown, Lightbulb, Bug, MessageSquare } from 'lucide-react';

type FeedbackType = 'positive' | 'negative' | 'feature' | 'bug' | 'other';

export const FeedbackPage = () => {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('other');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Feedback submitted:', { feedbackType, subject, message });
    toast.success('Tack för din feedback! Vi läser alla förslag noggrant.');
    setSubject('');
    setMessage('');
    setFeedbackType('other');
  };

  const feedbackTypes = [
    {
      type: 'positive' as FeedbackType,
      label: 'Beröm',
      icon: <ThumbsUp className="h-5 w-5" />,
      description: 'Vad gillar du?',
    },
    {
      type: 'negative' as FeedbackType,
      label: 'Problem',
      icon: <ThumbsDown className="h-5 w-5" />,
      description: 'Vad kan förbättras?',
    },
    {
      type: 'feature' as FeedbackType,
      label: 'Önskemål',
      icon: <Lightbulb className="h-5 w-5" />,
      description: 'Föreslå ny funktion',
    },
    {
      type: 'bug' as FeedbackType,
      label: 'Bugg',
      icon: <Bug className="h-5 w-5" />,
      description: 'Rapportera tekniskt fel',
    },
    {
      type: 'other' as FeedbackType,
      label: 'Övrigt',
      icon: <MessageSquare className="h-5 w-5" />,
      description: 'Allmän feedback',
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Feedback</h1>
        <p className="text-muted-foreground mt-1">
          Din feedback hjälper oss att förbättra Dokument-AI
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vad vill du dela med dig av?</CardTitle>
          <CardDescription>Välj typ av feedback nedan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {feedbackTypes.map((type) => (
              <button
                key={type.type}
                onClick={() => setFeedbackType(type.type)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  feedbackType === type.type
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-accent/50'
                }`}
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className={feedbackType === type.type ? 'text-accent' : 'text-muted-foreground'}>
                    {type.icon}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{type.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {type.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="subject">Ämne</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Kort beskrivning av din feedback"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Meddelande</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Beskriv din feedback i detalj..."
                rows={8}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full inline-flex justify-center items-center gap-1.5 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 font-medium transition-colors"
            >
              Skicka feedback →
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vad händer med min feedback?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            • Alla feedback-meddelanden läses av vårt team
          </p>
          <p>
            • Vi prioriterar förbättringar baserat på användarnas behov
          </p>
          <p>
            • Vid buggar eller tekniska problem återkommer vi normalt inom 1-2 arbetsdagar
          </p>
          <p>
            • Dina förslag kan påverka framtida funktioner i Dokument-AI
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
