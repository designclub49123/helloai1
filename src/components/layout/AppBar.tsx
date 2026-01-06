import { HambergerMenu, Notification } from 'iconsax-react';

interface AppBarProps {
  onMenuClick: () => void;
}

export function AppBar({ onMenuClick }: AppBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-card/95 backdrop-blur-md border-b border-border">
      <button 
        onClick={onMenuClick}
        className="p-2 rounded-lg hover:bg-muted transition-colors active:scale-95"
        aria-label="Menu"
      >
        <HambergerMenu size={24} className="text-foreground" variant="Linear" />
      </button>

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center arkio-glow-sm">
          <span className="text-primary-foreground font-bold text-sm">A</span>
        </div>
        <span className="text-lg font-semibold text-foreground">ARKIO</span>
      </div>

      <button 
        className="p-2 rounded-lg hover:bg-muted transition-colors active:scale-95"
        aria-label="Notifications"
      >
        <Notification size={24} className="text-foreground" variant="Linear" />
      </button>
    </header>
  );
}
