import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HistoryItem } from '@/lib/mockData';
import {
  getChatHistory,
  toggleFavoriteHistoryItem,
  updateHistoryItem,
} from '@/api/history';
import { routes } from '@/lib/routes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  ArrowLeft,
  Star,
  Download,
  MessageSquare,
  Clock,
  Folder,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

// Helper function to compute related items
const computeRelated = (current: HistoryItem, all: HistoryItem[]): HistoryItem[] => {
  const text = (current.question + ' ' + current.answer).toLowerCase();

  const tokens = new Set(
    text
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );

  const scored = all
    .filter((h) => h.id !== current.id)
    .map((h) => {
      const t = (h.question + ' ' + h.answer).toLowerCase();
      const words = new Set(
        t
          .replace(/[^\p{L}\p{N}\s]/gu, ' ')
          .split(/\s+/)
          .filter((w) => w.length > 3)
      );
      let score = 0;
      words.forEach((w) => {
        if (tokens.has(w)) score++;
      });
      return { item: h, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.item);

  return scored;
};

export const HistoryDetailPage = () => {
  const { historyId } = useParams<{ historyId: string }>();
  const navigate = useNavigate();

  const [item, setItem] = useState<HistoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [allHistory, setAllHistory] = useState<HistoryItem[]>([]);
  const [newTag, setNewTag] = useState('');
  const [related, setRelated] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!historyId) return;

      setIsLoading(true);
      try {
        const all = await getChatHistory();
        setAllHistory(all);
        const found = all.find((h) => h.id === historyId) || null;
        setItem(found);

        if (found) {
          // Beräkna relaterade
          const rel = computeRelated(found, all);
          setRelated(rel);
        }
      } catch (err) {
        console.error('Failed to load history item', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [historyId]);

  const handleBack = () => {
    navigate(routes.app.history);
  };

  const handleToggleFavorite = async () => {
    if (!item) return;

    try {
      const updated = await toggleFavoriteHistoryItem(item.id);
      if (updated) {
        setItem(updated);
      }
    } catch (err) {
      console.error('Failed to toggle favorite', err);
      toast.error('Kunde inte uppdatera favorit.');
    }
  };

  const handleExport = () => {
    if (!item) return;

    const content = [
      `Arbetsyta: ${item.workspace}`,
      `Tid: ${new Date(item.timestamp).toLocaleString('sv-SE')}`,
      '',
      'Fråga:',
      item.question,
      '',
      'Svar:',
      item.answer,
      '',
      ...(item.sources?.length
        ? [
            'Källor:',
            ...item.sources.map((s) =>
              `- ${s.documentName}${s.page ? ` (sida ${s.page})` : ''}`
            ),
          ]
        : []),
    ].join('\n');

    const blob = new Blob([content], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-svar-${item.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenInChat = () => {
    if (!item) return;

    // skicka med item till chatten som preload
    navigate(routes.app.chat, {
      state: {
        preloadHistory: {
          id: item.id,
          question: item.question,
          answer: item.answer,
          workspace: item.workspace,
          sources: item.sources,
        },
      },
    });
  };

  const handleFollowUpInChat = () => {
    if (!item) return;

    navigate(routes.app.chat, {
      state: {
        preloadHistory: {
          id: item.id,
          question: item.question,
          answer: item.answer,
          workspace: item.workspace,
          sources: item.sources,
        },
        mode: 'followUp',
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tillbaka
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Laddar historik…</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tillbaka
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Kunde inte hitta det sparade svaret.
        </p>
      </div>
    );
  }

  const formattedDate = new Date(item.timestamp).toLocaleString('sv-SE');

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Topbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tillbaka
          </Button>
          <h1 className="text-2xl font-bold">Sparat AI-svar</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenInChat}
            className="gap-1"
          >
            <MessageSquare className="h-4 w-4" />
            Öppna i chatten
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFollowUpInChat}
            className="gap-1"
          >
            <MessageSquare className="h-4 w-4" />
            Ställ följdfråga
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleFavorite}
            className="gap-1"
          >
            <Star
              className={`h-4 w-4 ${
                item.isFavorite ? 'fill-accent text-accent' : ''
              }`}
            />
            {item.isFavorite ? 'Favorit' : 'Spara som favorit'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-1"
          >
            <Download className="h-4 w-4" />
            Exportera
          </Button>
        </div>
      </div>

      {/* Headercard */}
      <Card className="bg-gradient-to-br from-card to-card-secondary border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <MessageSquare className="h-4 w-4 text-accent" />
            {item.sessionTitle || 'Sparad fråga'}
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-3 text-xs md:text-sm mt-1">
            <span className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full">
              <Folder className="h-3 w-3" />
              {item.workspace}
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formattedDate}
            </span>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Question & Answer */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-sm md:text-base">Fråga</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm md:text-[0.95rem] whitespace-pre-wrap">
              {item.question}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-sm md:text-base">Svar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm md:text-[0.95rem] whitespace-pre-wrap">
              {item.answer}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sources (källor) */}
      {item.sources && item.sources.length > 0 && (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" />
              Källor som AI använde
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Dessa dokument låg till grund för svaret.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {item.sources.map((s, idx) => (
                <div
                  key={`${s.documentName}-${idx}`}
                  className="flex items-center justify-between gap-2 text-xs md:text-sm rounded-md border border-border/60 bg-background/60 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{s.documentName}</span>
                    {s.page && (
                      <span className="text-muted-foreground text-[11px] md:text-xs">
                        (sida {s.page})
                      </span>
                    )}
                  </div>
                  {/* Hook för framtiden: öppna dokument */}
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[11px] md:text-xs text-muted-foreground hover:text-accent"
                    // onClick={() => openDocument(s)}
                  >
                    Öppna
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tags */}
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-sm md:text-base">
            Taggar
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Lägg till korta etiketter för att göra detta svar lättare att hitta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(item.tags || []).length === 0 && (
              <p className="text-xs text-muted-foreground">
                Inga taggar ännu.
              </p>
            )}
            {(item.tags || []).map((tag) => (
              <button
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground hover:bg-muted/80"
                onClick={async () => {
                  // ta bort tagg
                  const updatedTags = (item.tags || []).filter((t) => t !== tag);
                  try {
                    const updated = await updateHistoryItem(item.id, {
                      tags: updatedTags,
                    });
                    if (updated) setItem(updated);
                  } catch (err) {
                    console.error('Failed to remove tag', err);
                    toast.error('Kunde inte ta bort tagg.');
                  }
                }}
              >
                <span>{tag}</span>
                <span className="text-[10px]">×</span>
              </button>
            ))}
          </div>

          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const value = newTag.trim();
              if (!value || !item) return;
              const currentTags = item.tags || [];
              if (currentTags.includes(value)) {
                setNewTag('');
                return;
              }
              const updatedTags = [...currentTags, value];
              try {
                const updated = await updateHistoryItem(item.id, {
                  tags: updatedTags,
                });
                if (updated) {
                  setItem(updated);
                  setNewTag('');
                }
              } catch (err) {
                console.error('Failed to add tag', err);
                toast.error('Kunde inte lägga till tagg.');
              }
            }}
          >
            <Input
              placeholder="Lägg till tagg (t.ex. HR, onboarding, ekonomi)"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="text-xs md:text-sm"
            />
            <Button type="submit" variant="outline" size="sm">
              Lägg till
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Relaterade sparade frågor */}
      {related.length > 0 && (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-sm md:text-base">
              Relaterade sparade frågor
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Andra AI-svar som liknar detta innehåll.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {related.map((h) => (
              <button
                key={h.id}
                className="w-full text-left text-xs md:text-sm rounded-md border border-border/60 bg-background/60 px-3 py-2 hover:border-accent hover:bg-accent/5 transition-colors"
                onClick={() =>
                  navigate(routes.app.historyDetail(h.id))
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate max-w-[70%]">
                    {h.question.length > 80
                      ? h.question.slice(0, 80) + '…'
                      : h.question}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(h.timestamp).toLocaleDateString('sv-SE')}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                  {h.answer}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
