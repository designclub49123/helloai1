import { User, Box, Heart, Location, Wallet2, Setting2, InfoCircle, LogoutCurve } from 'iconsax-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { version } from '../../../package.json';

const menuItems = [
  { icon: Box, label: 'My Orders', description: 'Track and manage your orders' },
  { icon: Heart, label: 'Wishlist', description: 'Items you saved for later' },
  { icon: Location, label: 'Saved Addresses', description: 'Manage delivery addresses' },
  { icon: Wallet2, label: 'Payment Methods', description: 'Cards and wallets' },
  { icon: Setting2, label: 'Settings', description: 'App preferences' },
  { icon: InfoCircle, label: 'Help & Support', description: 'FAQs and contact us' },
];

export function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    orders: 0,
    wishlist: 0,
    reviews: 0
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (user) {
        try {
          // Fetch user's orders count
          const { data: ordersData } = await supabase
            .from('orders')
            .select('count')
            .eq('customer_email', user.email);

          // For demo purposes, we'll use some mock data for wishlist and reviews
          // In a real app, these would come from their respective tables
          setStats({
            orders: ordersData?.[0]?.count || 0,
            wishlist: 0, // Would come from wishlist table
            reviews: 0   // Would come from reviews table
          });
        } catch (error) {
          console.error('Error fetching user stats:', error);
        }
      }
    };

    fetchUserStats();
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex flex-col">
      {/* Profile Header */}
      <div className="bg-card border-b border-border px-4 py-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <User size={32} className="text-primary" variant="Bold" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">
              {user?.user_metadata?.full_name || user?.email || 'Guest User'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {user?.email || 'guest@arkio.app'}
            </p>
          </div>
          {user && (
            <button 
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium active:scale-95 transition-transform"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-px bg-border">
        {[
          { label: 'Orders', value: stats.orders.toString() },
          { label: 'Wishlist', value: stats.wishlist.toString() },
          { label: 'Reviews', value: stats.reviews.toString() },
        ].map((stat) => (
          <div key={stat.label} className="bg-card py-4 text-center">
            <div className="text-xl font-bold text-foreground">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Menu Items */}
      <div className="px-4 py-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className="w-full flex items-center gap-4 p-4 bg-card rounded-lg border border-border hover:bg-secondary transition-colors text-left"
            >
              <div className="p-2 rounded-lg bg-secondary">
                <Icon size={22} className="text-foreground" variant="Linear" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-foreground">{item.label}</div>
                <div className="text-sm text-muted-foreground">{item.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Logout */}
      <div className="px-4 py-4">
        <button className="w-full flex items-center justify-center gap-2 p-4 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
          <LogoutCurve size={20} variant="Linear" />
          <span className="font-medium">Log Out</span>
        </button>
      </div>

      {/* Version */}
      <div className="text-center py-4 text-xs text-muted-foreground">
        ARKIO v{version}
      </div>
    </div>
  );
}
