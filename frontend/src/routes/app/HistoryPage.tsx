import { useState, useEffect } from 'react';
import { HistoryList } from '@/components/app/HistoryList';
import { HistoryItem } from '@/lib/mockData';
import { useNavigate } from 'react-router-dom';
import { routes } from '@/lib/routes';
import { getChatHistory } from '@/api/chat';

type TimeFilter = 'today' | 'week' | 'all';

export const HistoryPage = () => {
  const [filter, setFilter] = useState<TimeFilter>('all');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const data = await getChatHistory();
    setHistory(data);
  };

  const filteredHistory = history; // In production, filter based on time

  const handleItemClick = (item: HistoryItem) => {
    navigate(routes.app.chat);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Historik</h1>
        <p className="text-muted-foreground mt-1">
          Alla dina tidigare frågor och svar
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">Visa:</span>
        {[
          { key: 'today' as TimeFilter, label: 'Idag' },
          { key: 'week' as TimeFilter, label: 'Senaste veckan' },
          { key: 'all' as TimeFilter, label: 'Alla' },
        ].map(({ key, label }) => (
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

      {/* History List */}
      <HistoryList items={filteredHistory} onItemClick={handleItemClick} />
    </div>
  );
};
