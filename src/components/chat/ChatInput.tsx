import { useState } from 'react';
import { Send2 } from 'iconsax-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder = "Type your message..." }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (input.trim() && !disabled && !isSubmitting) {
      setIsSubmitting(true);
      const messageToSend = input.trim();
      setInput('');
      
      try {
        await onSend(messageToSend);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="flex-1 relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || isSubmitting}
          className={cn(
            "w-full px-4 py-3 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground",
            "border border-border focus:border-primary focus:ring-1 focus:ring-primary/50",
            "transition-all outline-none",
            (disabled || isSubmitting) && "opacity-50 cursor-not-allowed"
          )}
        />
      </div>
      
      <button
        type="submit"
        disabled={!input.trim() || disabled || isSubmitting}
        className={cn(
          "p-3 rounded-lg transition-all active:scale-95",
          input.trim() && !disabled && !isSubmitting
            ? "bg-primary text-primary-foreground jarvis-glow-sm"
            : "bg-secondary text-muted-foreground cursor-not-allowed"
        )}
        aria-label="Send message"
      >
        {isSubmitting ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent animate-spin" />
        ) : (
          <Send2 size={20} variant="Bold" />
        )}
      </button>
    </form>
  );
}
