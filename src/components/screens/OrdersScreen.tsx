import { useState, useEffect } from 'react';
import { SearchNormal1, Box, TruckFast, TickCircle, CloseCircle, Clock, Send } from 'iconsax-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Order {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_city: string;
  product_name: string;
  product_brand: string;
  product_category: string;
  total_amount: number;
  order_status: string;
  order_date: string;
  expected_delivery: string | null;
  actual_delivery: string | null;
  tracking_number: string | null;
  carrier_name: string | null;
  current_location: string | null;
}

const statusConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
  'Delivered': { icon: TickCircle, color: 'text-green-400', bgColor: 'bg-green-400/10' },
  'In Transit': { icon: TruckFast, color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
  'Shipped': { icon: TruckFast, color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
  'Out for Delivery': { icon: TruckFast, color: 'text-primary', bgColor: 'bg-primary/10' },
  'Order Placed': { icon: Clock, color: 'text-yellow-400', bgColor: 'bg-yellow-400/10' },
  'Confirmed': { icon: Clock, color: 'text-yellow-400', bgColor: 'bg-yellow-400/10' },
  'Packed': { icon: Box, color: 'text-purple-400', bgColor: 'bg-purple-400/10' },
  'Cancelled': { icon: CloseCircle, color: 'text-red-400', bgColor: 'bg-red-400/10' },
  'Returned': { icon: CloseCircle, color: 'text-red-400', bgColor: 'bg-red-400/10' },
};

function formatDate(dateString: string | null): string {
  if (!dateString) return 'TBD';
  return new Date(dateString).toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
}

function OrderCard({ order }: { order: Order }) {
  const config = statusConfig[order.order_status] || { icon: Box, color: 'text-muted-foreground', bgColor: 'bg-muted' };
  const StatusIcon = config.icon;

  const handleTrackOrder = () => {
    // Navigate to tracking screen with order ID
    window.location.hash = `#track?order=${order.order_id}`;
  };

  return (
    <div className="bg-card rounded-lg p-4 border border-border">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs text-muted-foreground mb-1">{order.order_id}</div>
          <div className="font-medium text-foreground line-clamp-1">{order.product_name}</div>
        </div>
        <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md", config.bgColor)}>
          <StatusIcon size={14} className={config.color} variant="Bold" />
          <span className={cn("text-xs font-medium", config.color)}>{order.order_status}</span>
        </div>
      </div>
      
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Customer</span>
          <span className="text-foreground">{order.customer_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Amount</span>
          <span className="text-foreground font-medium">₹{order.total_amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Expected</span>
          <span className="text-foreground">{formatDate(order.expected_delivery)}</span>
        </div>
      </div>

      {order.current_location && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs">
            <TruckFast size={14} className="text-primary" variant="Bold" />
            <span className="text-muted-foreground">{order.current_location}</span>
          </div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border">
        <Button onClick={handleTrackOrder} size="sm" className="w-full flex items-center gap-2">
          <Send size={14} />
          Track Order
        </Button>
      </div>
    </div>
  );
}

export function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('order_date', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'in transit', label: 'In Transit' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'pending', label: 'Pending' },
  ];

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.tracking_number?.toLowerCase() || '').includes(searchQuery.toLowerCase());

    const matchesFilter = 
      activeFilter === 'all' ||
      (activeFilter === 'in transit' && ['In Transit', 'Shipped', 'Out for Delivery'].includes(order.order_status)) ||
      (activeFilter === 'delivered' && order.order_status === 'Delivered') ||
      (activeFilter === 'pending' && ['Order Placed', 'Confirmed', 'Packed'].includes(order.order_status));

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 py-3 border-b border-border">
        <div className="relative">
          <SearchNormal1 size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" variant="Linear" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search orders, customers, products..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition-all"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
              activeFilter === filter.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {filteredOrders.length > 0 ? (
          filteredOrders.slice(0, 20).map((order) => (
            <OrderCard key={order.order_id} order={order} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Box size={48} className="text-muted-foreground mb-4" variant="Linear" />
            <p className="text-muted-foreground">No orders found</p>
          </div>
        )}
        
        {filteredOrders.length > 20 && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Showing 20 of {filteredOrders.length} orders
          </div>
        )}
      </div>
    </div>
  );
}
