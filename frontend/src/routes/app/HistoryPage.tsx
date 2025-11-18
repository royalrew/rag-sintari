import { useState, useEffect, useMemo } from 'react';
import { HistoryList } from '@/components/app/HistoryList';
import { HistoryItem } from '@/lib/mockData';
import { useNavigate, useLocation } from 'react-router-dom';
import { routes } from '@/lib/routes';
import { getChatHistory, toggleFavoriteHistoryItem } from '@/api/history';
import { Input } from '@/components/ui/input';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import { Star } from 'lucide-react';

type TimeFilter = 'today' | 'week' | 'all';

export const HistoryPage = () => {
  const [filter, setFilter] = useState<TimeFilter>('all');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [workspaceFilter, setWorkspaceFilter] = useState<string>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { workspaces } = useApp();

  // Load history on mount and when navigating to this page
  useEffect(() => {
    loadHistory();
  }, [location.pathname]); // Reload when pathname changes (user navigates to this page)

  // Also reload when window gains focus (user switches back to tab)
  useEffect(() => {
    const handleFocus = () => {
      loadHistory();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const data = await getChatHistory();
      data.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemClick = (item: HistoryItem) => {
    navigate(routes.app.historyDetail(item.id));
  };

  const handleToggleFavorite = async (item: HistoryItem) => {
    try {
      const updated = await toggleFavoriteHistoryItem(item.id);
      if (!updated) return;

      setHistory((prev) =>
        prev.map((h) => (h.id === updated.id ? updated : h))
      );
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      toast.error('Kunde inte uppdatera favorit.');
    }
  };

  const handleExport = (item: HistoryItem) => {
    const content = [
      `Arbetsyta: ${item.workspace}`,
      `Tid: ${new Date(item.timestamp).toLocaleString('sv-SE')}`,
      '',
      `Fråga:`,
      item.question,
      '',
      `Svar:`,
      item.answer,
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

  const filteredHistory = useMemo(() => {
    let result = [...history];

    const now = new Date();

    // Time filter
    if (filter !== 'all') {
      result = result.filter((item) => {
        const ts = new Date(item.timestamp);
        if (filter === 'today') {
          return (
            ts.getFullYear() === now.getFullYear() &&
            ts.getMonth() === now.getMonth() &&
            ts.getDate() === now.getDate()
          );
        }
        if (filter === 'week') {
          const diffMs = now.getTime() - ts.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          return diffDays <= 7;
        }
        return true;
      });
    }

    // Workspace filter
    if (workspaceFilter !== 'all') {
      result = result.filter((item) => item.workspace === workspaceFilter);
    }

    // Favorites
    if (favoritesOnly) {
      result = result.filter((item) => item.isFavorite);
    }

    // Search in question + answer
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q)
      );
    }

    return result;
  }, [history, filter, workspaceFilter, favoritesOnly, search]);

  // Unique workspaces from history (fallback if workspaces is empty)
  const workspaceOptions =
    workspaces && workspaces.length
      ? workspaces.map((w) => w.name || w.id)
      : Array.from(new Set(history.map((h) => h.workspace)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Historik</h1>
        <p className="text-muted-foreground mt-1">
          Sparade AI-svar och tidigare frågor
        </p>
      </div>

      {/* Search + filter row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="w-full md:max-w-sm">
          <Input
            placeholder="Sök i historiken (frågor & svar)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          {/* Time filter */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Visa:</span>
            {([
              { key: 'today' as TimeFilter, label: 'Idag' },
              { key: 'week' as TimeFilter, label: 'Senaste veckan' },
              { key: 'all' as TimeFilter, label: 'Alla' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`hover:text-accent transition-colors ${
                  filter === key
                    ? 'text-accent font-medium underline underline-offset-4'
                    : 'text-muted-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Workspace filter */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Arbetsyta:</span>
            <select
              value={workspaceFilter}
              onChange={(e) => setWorkspaceFilter(e.target.value)}
              className="text-sm bg-background border border-border rounded px-2 py-1"
            >
              <option value="all">Alla</option>
              {workspaceOptions.map((ws) => (
                <option key={ws} value={ws}>
                  {ws}
                </option>
              ))}
            </select>
          </div>

          {/* Favorites */}
          <button
            onClick={() => setFavoritesOnly((v) => !v)}
            className={`text-sm transition-colors flex items-center gap-1.5 ${
              favoritesOnly
                ? 'text-accent font-medium underline underline-offset-4'
                : 'text-muted-foreground hover:text-accent'
            }`}
          >
            <Star className={`h-4 w-4 ${favoritesOnly ? 'fill-accent text-accent' : ''}`} />
            Endast favoriter
          </button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laddar historik…</p>
      ) : (
        <HistoryList
          items={filteredHistory}
          onItemClick={handleItemClick}
          onToggleFavorite={handleToggleFavorite}
          onExport={handleExport}
        />
      )}
    </div>
  );
};

