import { VolumeHigh, VolumeCross } from 'iconsax-react';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  onSpeak?: () => void;
  onStopSpeak?: () => void;
  isSpeaking?: boolean;
}

export function ChatMessage({ role, content, timestamp, onSpeak, onStopSpeak, isSpeaking }: ChatMessageProps) {
  const isUser = role === 'user';

  // Simple markdown parsing for bold text
  const parseContent = (text: string) => {
    return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-semibold text-primary">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={cn(
      "flex gap-3 fade-in",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
        isUser ? "bg-muted" : "bg-primary arkio-glow-sm"
      )}>
        <span className={cn(
          "text-sm font-bold",
          isUser ? "text-muted-foreground" : "text-primary-foreground"
        )}>
          {isUser ? 'U' : 'A'}
        </span>
      </div>

      {/* Message bubble */}
      <div className={cn(
        "flex-1 max-w-[80%]",
        isUser ? "text-right" : "text-left"
      )}>
        <div className={cn(
          "inline-block px-4 py-3 rounded-lg text-sm leading-relaxed",
          isUser 
            ? "bg-primary text-primary-foreground rounded-tr-sm" 
            : "bg-secondary text-secondary-foreground rounded-tl-sm"
        )}>
          <div className="whitespace-pre-wrap">
            {parseContent(content)}
          </div>
        </div>
        
        <div className={cn(
          "flex items-center gap-2 mt-1",
          isUser ? "justify-end" : "justify-start"
        )}>
          <span className="text-xs text-muted-foreground">
            {formatTime(timestamp)}
          </span>
          
          {!isUser && onSpeak && (
            <button
              onClick={isSpeaking ? onStopSpeak : onSpeak}
              className="p-1 rounded hover:bg-muted transition-colors"
              aria-label={isSpeaking ? "Stop speaking" : "Read aloud"}
            >
              {isSpeaking ? (
                <VolumeCross size={14} className="text-primary" variant="Bold" />
              ) : (
                <VolumeHigh size={14} className="text-muted-foreground" variant="Linear" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
