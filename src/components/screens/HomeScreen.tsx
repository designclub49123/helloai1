import { Box, TruckFast, TickCircle, CloseCircle, Chart } from 'iconsax-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HomeScreenProps {
  onNavigateToChat: () => void;
}

interface OrderStats {
  total: number;
  delivered: number;
  inTransit: number;
  pending: number;
  cancelled: number;
  totalRevenue: number;
  avgOrderValue: number;
}

export function HomeScreen({ onNavigateToChat }: HomeScreenProps) {
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    delivered: 0,
    inTransit: 0,
    pending: 0,
    cancelled: 0,
    totalRevenue: 0,
    avgOrderValue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('order_status, total_amount');
      
      if (error) throw error;
      
      if (data) {
        const total = data.length;
        const delivered = data.filter(o => o.order_status === 'Delivered').length;
        const inTransit = data.filter(o => ['In Transit', 'Shipped', 'Out for Delivery'].includes(o.order_status)).length;
        const pending = data.filter(o => ['Order Placed', 'Confirmed', 'Packed'].includes(o.order_status)).length;
        const cancelled = data.filter(o => ['Cancelled', 'Returned'].includes(o.order_status)).length;
        const totalRevenue = data.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        
        setStats({
          total,
          delivered,
          inTransit,
          pending,
          cancelled,
          totalRevenue: Math.round(totalRevenue),
          avgOrderValue: Math.round(totalRevenue / total)
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const quickStats = [
    { icon: Box, label: 'Total Orders', value: stats.total, color: 'text-primary' },
    { icon: TruckFast, label: 'In Transit', value: stats.inTransit, color: 'text-blue-400' },
    { icon: TickCircle, label: 'Delivered', value: stats.delivered, color: 'text-green-400' },
    { icon: CloseCircle, label: 'Cancelled', value: stats.cancelled, color: 'text-red-400' },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      {/* Welcome Section */}
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary/20 flex items-center justify-center arkio-glow">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-foreground">A</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to ARKIO</h1>
        <p className="text-muted-foreground">Your AI-powered order tracking assistant</p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.label}
              className="bg-card rounded-lg p-4 border border-border"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg bg-secondary ${stat.color}`}>
                  <Icon size={20} variant="Bold" />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {loading ? '...' : stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Revenue Card */}
      <div className="bg-card rounded-lg p-5 border border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/20 text-primary">
            <Chart size={24} variant="Bold" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Total Revenue</div>
            <div className="text-xl font-bold text-foreground">
              {loading ? '...' : `₹${stats.totalRevenue.toLocaleString()}`}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Avg. Order Value</span>
          <span className="text-foreground font-medium">
            {loading ? '...' : `₹${stats.avgOrderValue.toLocaleString()}`}
          </span>
        </div>
      </div>

      {/* CTA Button */}
      <button 
        onClick={onNavigateToChat}
        className="w-full py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg arkio-glow active:scale-[0.98] transition-transform"
      >
        Start Tracking with ARKIO
      </button>

      {/* Quick Actions */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Quick Commands</h2>
        <div className="space-y-2">
          {[
            "Show all orders in transit",
            "What orders were delivered today?",
            "Give me order statistics"
          ].map((command) => (
            <button
              key={command}
              onClick={onNavigateToChat}
              className="w-full text-left px-4 py-3 bg-secondary rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
            >
              "{command}"
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
