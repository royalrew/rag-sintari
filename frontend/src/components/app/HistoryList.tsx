import { HistoryItem } from '@/lib/mockData';
import { MessageSquare, Clock, Star, Download } from 'lucide-react';
import { TextLink } from '@/components/ui/TextLink';

interface HistoryListProps {
  items: HistoryItem[];
  onItemClick?: (item: HistoryItem) => void;
  onToggleFavorite?: (item: HistoryItem) => void;
  onExport?: (item: HistoryItem) => void;
}

export const HistoryList = ({
  items,
  onItemClick,
  onToggleFavorite,
  onExport,
}: HistoryListProps) => {
  if (!items.length) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Ingen historik att visa ännu.
        <br />
        Spara ett AI-svar i chatten för att se det här.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="p-4 rounded-lg bg-gradient-to-br from-card to-card-secondary border border-border hover:border-accent transition-colors cursor-pointer"
          onClick={() => onItemClick?.(item)}
        >
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-2">
                {item.question}
              </p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {item.answer}
              </p>

              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>{item.workspace}</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(item.timestamp).toLocaleString('sv-SE')}
                </span>
              </div>
            </div>

            <div
              className="flex flex-col items-end gap-2 flex-shrink-0"
              onClick={(e) => e.stopPropagation()} // Stop bubble so entire card isn't triggered
            >
              {onToggleFavorite && (
                <button
                  type="button"
                  onClick={() => onToggleFavorite(item)}
                  className="text-xs text-muted-foreground hover:text-accent flex items-center gap-1 transition-colors"
                  title={item.isFavorite ? 'Ta bort från favoriter' : 'Lägg till i favoriter'}
                >
                  <Star
                    className={`h-4 w-4 ${
                      item.isFavorite ? 'fill-accent text-accent' : ''
                    }`}
                  />
                  {item.isFavorite ? 'Favorit' : 'Spara'}
                </button>
              )}

              {onExport && (
                <button
                  type="button"
                  onClick={() => onExport(item)}
                  className="text-xs text-muted-foreground hover:text-accent flex items-center gap-1 transition-colors"
                  title="Exportera som .txt"
                >
                  <Download className="h-4 w-4" />
                  Exportera
                </button>
              )}

              {onItemClick && (
                <TextLink
                  onClick={() => onItemClick(item)}
                  variant="subtle"
                  icon="chevron"
                >
                  Visa
                </TextLink>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
