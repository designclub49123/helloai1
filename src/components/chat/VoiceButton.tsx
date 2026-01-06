import { Microphone2, VolumeHigh } from 'iconsax-react';
import { cn } from '@/lib/utils';

interface VoiceButtonProps {
  isListening: boolean;
  isSpeaking: boolean;
  onPress: () => void;
  onRelease: () => void;
  disabled?: boolean;
}

export function VoiceButton({ isListening, isSpeaking, onPress, onRelease, disabled }: VoiceButtonProps) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Pulse rings when active */}
      {(isListening || isSpeaking) && (
        <>
          <div className="absolute w-24 h-24 rounded-full bg-primary/20 pulse-ring" style={{ animationDelay: '0s' }} />
          <div className="absolute w-32 h-32 rounded-full bg-primary/10 pulse-ring" style={{ animationDelay: '0.5s' }} />
          <div className="absolute w-40 h-40 rounded-full bg-primary/5 pulse-ring" style={{ animationDelay: '1s' }} />
        </>
      )}
      
      {/* Main button */}
      <button
        onMouseDown={onPress}
        onMouseUp={onRelease}
        onMouseLeave={onRelease}
        onTouchStart={onPress}
        onTouchEnd={onRelease}
        disabled={disabled}
        className={cn(
          "relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95",
          isListening 
            ? "bg-primary arkio-glow scale-110" 
            : isSpeaking 
              ? "bg-secondary border-2 border-primary arkio-glow-sm"
              : "bg-secondary hover:bg-muted border border-border",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        aria-label={isListening ? "Listening..." : isSpeaking ? "Speaking..." : "Hold to speak"}
      >
        {isSpeaking ? (
          <VolumeHigh 
            size={32} 
            className={cn(
              "transition-colors",
              "text-primary"
            )} 
            variant="Bold" 
          />
        ) : (
          <Microphone2 
            size={32} 
            className={cn(
              "transition-colors",
              isListening ? "text-primary-foreground" : "text-foreground"
            )} 
            variant={isListening ? "Bold" : "Linear"} 
          />
        )}
      </button>

      {/* Status text */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className={cn(
          "text-sm font-medium transition-colors",
          isListening ? "text-primary" : isSpeaking ? "text-primary" : "text-muted-foreground"
        )}>
          {isListening ? "Listening..." : isSpeaking ? "Speaking..." : "Hold to speak"}
        </span>
      </div>
    </div>
  );
}
