import { CloseCircle, Home2, Box, MessageText1, Profile, Setting2, InfoCircle, LogoutCurve, Activity, Chart, Scan, VoiceSquare, Eye, Shield } from 'iconsax-react';
import { cn } from '@/lib/utils';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: 'home', icon: Home2, label: 'Home' },
  { id: 'orders', icon: Box, label: 'My Orders' },
  { id: 'voice', icon: VoiceSquare, label: 'AI Voice Assistant' },
  { id: 'ar', icon: Eye, label: 'AR Product Preview' },
  { id: 'blockchain', icon: Shield, label: 'Blockchain Verify' },
  { id: 'predictive', icon: Activity, label: 'Predictive AI' },
  { id: 'insights', icon: Chart, label: 'Business Insights' },
  { id: 'scan', icon: Scan, label: 'Visual Recognition' },
  { id: 'chat', icon: MessageText1, label: 'ARKIO Chat' },
  { id: 'profile', icon: Profile, label: 'Profile' },
  { id: 'settings', icon: Setting2, label: 'Settings' },
  { id: 'about', icon: InfoCircle, label: 'About' },
];

export function SideMenu({ isOpen, onClose, activeTab, onTabChange }: SideMenuProps) {
  const handleItemClick = (id: string) => {
    onTabChange(id);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      {/* Menu Panel */}
      <aside 
        className={cn(
          "fixed top-0 left-0 bottom-0 z-[70] w-72 bg-card border-r border-border transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center arkio-glow">
                <span className="text-primary-foreground font-bold text-lg">A</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">ARKIO</h2>
                <p className="text-xs text-muted-foreground">Order Assistant</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Close menu"
            >
              <CloseCircle size={24} className="text-muted-foreground" variant="Linear" />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                    isActive 
                      ? "bg-primary/15 text-primary" 
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <Icon 
                    size={22} 
                    variant={isActive ? "Bold" : "Linear"} 
                  />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
              <LogoutCurve size={22} variant="Linear" />
              <span className="font-medium">Log Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
