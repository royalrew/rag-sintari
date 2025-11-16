import { ChatMessage } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';

interface ChatMessagesProps {
  messages: ChatMessage[];
}

export const ChatMessages = ({ messages }: ChatMessagesProps) => {
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
              'max-w-[70%] rounded-lg p-4',
              message.role === 'user'
                ? 'bg-accent text-accent-foreground'
                : 'bg-card border border-border'
            )}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            {message.sources && message.sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-2">Källor:</p>
                <div className="space-y-1">
                  {message.sources.map((source, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground">
                      <span className="font-medium">{source.documentName}</span> (s. {source.page})
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">{message.timestamp}</p>
          </div>

          {message.role === 'user' && (
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
