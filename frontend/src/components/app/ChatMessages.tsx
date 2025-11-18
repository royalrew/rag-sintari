import { ChatMessage } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import { User, Bot, Lightbulb, FileText, Save } from 'lucide-react';

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  onSaveMessage?: (message: ChatMessage) => void;
}

export const ChatMessages = ({ messages, isLoading, onSaveMessage }: ChatMessagesProps) => {
  // Empty state
  if (!messages.length) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground text-center px-4">
        Börja med att ställa en fråga om dina dokument här.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            'flex gap-3',
            message.role === 'user' ? 'justify-end' : 'justify-start'
          )}
        >
          {message.role === 'assistant' && (
            <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center flex-shrink-0">
              <Bot className="h-5 w-5" />
            </div>
          )}
          
          <div
            className={cn(
              'rounded-lg p-4 max-w-[85%] sm:max-w-[70%]',
              message.role === 'user'
                ? 'bg-accent text-accent-foreground'
                : message.isFeedback
                ? 'bg-muted/50 border border-border/50'
                : 'bg-gradient-to-br from-card to-card-secondary border border-border'
            )}
          >
            {message.isFeedback ? (
              <div className="flex items-center gap-2">
                {message.feedbackType === 'hint' ? (
                  <Lightbulb className="h-4 w-4 text-accent flex-shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}
            {message.sources && message.sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-2">Källor:</p>
                <div className="space-y-1">
                  {message.sources.map((source, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground">
                      <span className="font-medium">{source.documentName}</span>
                      {source.page ? <> (s. {source.page})</> : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {message.timestamp && (
              <div className={cn(
                "mt-2 flex items-center justify-between gap-3",
                message.isFeedback && "opacity-60"
              )}>
                <p className="text-xs text-muted-foreground">
                  {message.timestamp}
                </p>
                {message.role === 'assistant' && !message.isFeedback && onSaveMessage && (
                  <button
                    onClick={() => onSaveMessage(message)}
                    className="text-[11px] text-muted-foreground hover:text-accent flex items-center gap-1 transition-colors"
                    title="Spara i historik"
                  >
                    <Save className="h-3 w-3" />
                    Spara
                  </button>
                )}
              </div>
            )}
          </div>

          {message.role === 'user' && (
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5" />
            </div>
          )}
        </div>
      ))}
      
      {/* "AI tänker"-indikator */}
      {isLoading && messages.length > 0 && (
        <div className="flex gap-3 justify-start">
          {/* Hybrid-avatar: Bot + glasögon */}
          <div className="relative w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center flex-shrink-0">
            <Bot className="h-5 w-5" />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px]">
              👓
            </span>
          </div>

          {/* "AI tänker"-bubbla */}
          <div className="max-w-[85%] sm:max-w-[70%] rounded-lg px-3 py-2 bg-gradient-to-br from-card to-card-secondary border border-border flex items-center gap-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/80 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-muted-foreground/80 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-muted-foreground/80 animate-bounce" />
            </div>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Tänker…
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
