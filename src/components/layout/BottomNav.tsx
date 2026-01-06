import { Home2, Box, MessageText1, Scan, Shield } from 'iconsax-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'home', icon: Home2, label: 'Home' },
  { id: 'orders', icon: Box, label: 'Orders' },
  { id: 'blockchain', icon: Shield, label: 'Verify' },
  { id: 'scan', icon: Scan, label: 'Scan' },
  { id: 'chat', icon: MessageText1, label: 'Chat' },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around py-2 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-all duration-200 active:scale-95",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-all duration-200",
                isActive && "bg-primary/15 jarvis-glow-sm"
              )}>
                <Icon 
                  size={22} 
                  variant={isActive ? "Bold" : "Linear"} 
                />
              </div>
              <span className={cn(
                "text-xs font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
