import { HistoryItem } from '@/lib/mockData';
import { MessageSquare, Clock } from 'lucide-react';
import { TextLink } from '@/components/ui/TextLink';

interface HistoryListProps {
  items: HistoryItem[];
  onItemClick?: (item: HistoryItem) => void;
}

export const HistoryList = ({ items, onItemClick }: HistoryListProps) => {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="p-4 rounded-lg bg-card border border-border hover:border-accent transition-colors cursor-pointer"
          onClick={() => onItemClick?.(item)}
        >
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{item.question}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>{item.workspace}</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {item.timestamp}
                </span>
              </div>
            </div>
            <TextLink onClick={() => onItemClick?.(item)} variant="subtle" icon="chevron">
              Visa
            </TextLink>
          </div>
        </div>
      ))}
    </div>
  );
};
