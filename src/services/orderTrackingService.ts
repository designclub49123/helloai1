import { supabase } from '@/integrations/supabase/client';

export interface TrackingStage {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  timestamp: string | null;
  location?: string;
  details?: string;
  icon?: string;
  estimatedTime?: string;
}

export interface DeliveryPerson {
  id: string;
  name: string;
  phone: string;
  photo?: string;
  rating: number;
  vehicle: string;
  vehicleNumber: string;
  currentLocation?: {
    lat: number;
    lng: number;
    address: string;
  };
  estimatedArrival?: string;
}

export interface TrackingInfo {
  orderId: string;
  orderStatus: string;
  currentStage: number;
  totalStages: number;
  stages: TrackingStage[];
  deliveryPerson?: DeliveryPerson;
  estimatedDelivery: string;
  actualDelivery?: string;
  trackingNumber: string;
  carrier: string;
  realTimeLocation?: {
    lat: number;
    lng: number;
    address: string;
    lastUpdated: string;
  };
  notifications: TrackingNotification[];
}

export interface TrackingNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

class OrderTrackingService {
  private trackingCache: Map<string, TrackingInfo> = new Map();
  private subscribers: Map<string, ((tracking: TrackingInfo) => void)[]> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();

  async getTrackingInfo(orderId: string): Promise<TrackingInfo> {
    // Check cache first
    const cached = this.trackingCache.get(orderId);
    if (cached) {
      return cached;
    }

    try {
      // Get order from database
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (error || !order) {
        throw new Error('Order not found');
      }

      // Generate tracking stages based on order status
      const stages = this.generateTrackingStages(order);
      const currentStage = this.getCurrentStage(order.order_status, stages);

      // Get or simulate delivery person info
      const deliveryPerson = await this.getDeliveryPersonInfo(order);

      // Get real-time location simulation
      const realTimeLocation = await this.getRealTimeLocation(order);

      const trackingInfo: TrackingInfo = {
        orderId: order.order_id,
        orderStatus: order.order_status,
        currentStage,
        totalStages: stages.length,
        stages,
        deliveryPerson,
        estimatedDelivery: order.expected_delivery || this.calculateEstimatedDelivery(order),
        actualDelivery: order.actual_delivery,
        trackingNumber: order.tracking_number || this.generateTrackingNumber(order.order_id),
        carrier: order.carrier_name || 'Standard Delivery',
        realTimeLocation,
        notifications: this.generateNotifications(order, stages)
      };

      // Cache the tracking info
      this.trackingCache.set(orderId, trackingInfo);

      return trackingInfo;
    } catch (error) {
      console.error('Error getting tracking info:', error);
      throw new Error('Failed to get tracking information');
    }
  }

  private generateTrackingStages(order: any): TrackingStage[] {
    const baseStages: TrackingStage[] = [
      {
        id: 'order_placed',
        name: 'Order Placed',
        description: 'Your order has been received and is being processed',
        status: 'completed',
        timestamp: order.order_date,
        icon: 'shopping-cart',
        details: `Order #${order.order_id} placed successfully`
      },
      {
        id: 'order_confirmed',
        name: 'Order Confirmed',
        description: 'Your order has been confirmed and preparation has begun',
        status: this.getStageStatus('confirmed', order.order_status),
        timestamp: order.confirmed_date,
        icon: 'check-circle',
        details: 'Order confirmed and payment processed'
      },
      {
        id: 'order_packed',
        name: 'Order Packed',
        description: 'Your items have been carefully packed and ready for shipment',
        status: this.getStageStatus('packed', order.order_status),
        timestamp: order.packed_date,
        icon: 'package',
        details: 'Items packed with quality check'
      },
      {
        id: 'shipped',
        name: 'Shipped',
        description: 'Your order has been dispatched and is on its way',
        status: this.getStageStatus('shipped', order.order_status),
        timestamp: order.shipped_date,
        location: 'Warehouse',
        icon: 'truck',
        details: `Shipped via ${order.carrier_name || 'Standard Delivery'}`
      },
      {
        id: 'out_for_delivery',
        name: 'Out for Delivery',
        description: 'Your order is with the delivery partner and will arrive soon',
        status: this.getStageStatus('out_for_delivery', order.order_status),
        timestamp: null,
        location: 'In Transit',
        icon: 'delivery',
        details: 'Delivery partner assigned'
      },
      {
        id: 'delivered',
        name: 'Delivered',
        description: 'Your order has been successfully delivered',
        status: this.getStageStatus('delivered', order.order_status),
        timestamp: order.actual_delivery,
        location: order.customer_address || 'Your address',
        icon: 'home',
        details: 'Successfully delivered to your location'
      }
    ];

    return baseStages;
  }

  private getStageStatus(stage: string, orderStatus: string): TrackingStage['status'] {
    const statusFlow = {
      'pending': ['order_placed'],
      'confirmed': ['order_placed', 'order_confirmed'],
      'processing': ['order_placed', 'order_confirmed', 'order_packed'],
      'packed': ['order_placed', 'order_confirmed', 'order_packed'],
      'shipped': ['order_placed', 'order_confirmed', 'order_packed', 'shipped'],
      'out_for_delivery': ['order_placed', 'order_confirmed', 'order_packed', 'shipped', 'out_for_delivery'],
      'delivered': ['order_placed', 'order_confirmed', 'order_packed', 'shipped', 'out_for_delivery', 'delivered'],
      'cancelled': ['order_placed']
    };

    const completedStages = statusFlow[orderStatus as keyof typeof statusFlow] || ['order_placed'];
    
    if (completedStages.includes(stage)) return 'completed';
    if (completedStages.length > 0 && completedStages[completedStages.length - 1] === stage) return 'in_progress';
    return 'pending';
  }

  private getCurrentStage(orderStatus: string, stages: TrackingStage[]): number {
    const statusStageMap: Record<string, string> = {
      'pending': 'order_placed',
      'confirmed': 'order_confirmed',
      'processing': 'order_packed',
      'packed': 'order_packed',
      'shipped': 'shipped',
      'out_for_delivery': 'out_for_delivery',
      'delivered': 'delivered'
    };

    const currentStageId = statusStageMap[orderStatus] || 'order_placed';
    return stages.findIndex(stage => stage.id === currentStageId) + 1;
  }

  private async getDeliveryPersonInfo(order: any): Promise<DeliveryPerson | undefined> {
    // Only show delivery person for orders that are out for delivery or shipped
    if (!['shipped', 'out_for_delivery'].includes(order.order_status)) {
      return undefined;
    }

    // Simulate delivery person data
    const deliveryPersons = [
      {
        id: 'dp_001',
        name: 'Raj Kumar',
        phone: '+91-98765-43210',
        photo: '/delivery-person-1.jpg',
        rating: 4.8,
        vehicle: 'Motorcycle',
        vehicleNumber: 'MH-12-AB-1234',
        currentLocation: {
          lat: 19.0760,
          lng: 72.8777,
          address: 'Near Bandra West, Mumbai'
        },
        estimatedArrival: this.calculateEstimatedArrival()
      },
      {
        id: 'dp_002',
        name: 'Priya Sharma',
        phone: '+91-98765-43211',
        photo: '/delivery-person-2.jpg',
        rating: 4.9,
        vehicle: 'Van',
        vehicleNumber: 'MH-01-CD-5678',
        currentLocation: {
          lat: 19.0822,
          lng: 72.8704,
          address: 'Near Linking Road, Mumbai'
        },
        estimatedArrival: this.calculateEstimatedArrival()
      }
    ];

    return deliveryPersons[Math.floor(Math.random() * deliveryPersons.length)];
  }

  private async getRealTimeLocation(order: any): Promise<TrackingInfo['realTimeLocation']> {
    // Only show real-time location for orders that are shipped or out for delivery
    if (!['shipped', 'out_for_delivery'].includes(order.order_status)) {
      return undefined;
    }

    // Simulate real-time location
    const locations = [
      {
        lat: 19.0760,
        lng: 72.8777,
        address: 'Bandra West, Mumbai, Maharashtra',
        lastUpdated: new Date().toISOString()
      },
      {
        lat: 19.0822,
        lng: 72.8704,
        address: 'Linking Road, Mumbai, Maharashtra',
        lastUpdated: new Date().toISOString()
      },
      {
        lat: 19.0992,
        lng: 72.8748,
        address: 'Santacruz West, Mumbai, Maharashtra',
        lastUpdated: new Date().toISOString()
      }
    ];

    return locations[Math.floor(Math.random() * locations.length)];
  }

  private calculateEstimatedDelivery(order: any): string {
    const orderDate = new Date(order.order_date);
    const estimatedDays = Math.floor(Math.random() * 3) + 2; // 2-4 days
    const estimatedDate = new Date(orderDate);
    estimatedDate.setDate(estimatedDate.getDate() + estimatedDays);
    
    return estimatedDate.toISOString();
  }

  private calculateEstimatedArrival(): string {
    const now = new Date();
    const arrivalTime = new Date(now.getTime() + (Math.random() * 2 + 1) * 60 * 60 * 1000); // 1-3 hours from now
    return arrivalTime.toISOString();
  }

  private generateTrackingNumber(orderId: string): string {
    return `TRK${orderId.replace('OD', '')}${Date.now().toString().slice(-6)}`;
  }

  private generateNotifications(order: any, stages: TrackingStage[]): TrackingNotification[] {
    const notifications: TrackingNotification[] = [];

    // Add notifications for completed stages
    stages.forEach(stage => {
      if (stage.status === 'completed' && stage.timestamp) {
        notifications.push({
          id: `${order.order_id}_${stage.id}`,
          type: 'success',
          title: stage.name,
          message: stage.description,
          timestamp: stage.timestamp,
          read: false
        });
      }
    });

    // Add custom notifications based on status
    if (order.order_status === 'shipped') {
      notifications.push({
        id: `${order.order_id}_shipped_alert`,
        type: 'info',
        title: 'Order Shipped!',
        message: `Your order has been shipped via ${order.carrier_name || 'Standard Delivery'}. Track your package in real-time.`,
        timestamp: order.shipped_date || new Date().toISOString(),
        read: false
      });
    }

    if (order.order_status === 'out_for_delivery') {
      notifications.push({
        id: `${order.order_id}_delivery_alert`,
        type: 'success',
        title: 'Out for Delivery!',
        message: 'Your order is out for delivery and will arrive soon. Track your delivery partner in real-time.',
        timestamp: new Date().toISOString(),
        read: false
      });
    }

    return notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async subscribeToTrackingUpdates(orderId: string, callback: (tracking: TrackingInfo) => void): Promise<void> {
    if (!this.subscribers.has(orderId)) {
      this.subscribers.set(orderId, []);
    }
    this.subscribers.get(orderId)?.push(callback);

    // Start real-time updates
    this.startRealTimeUpdates(orderId);
  }

  async unsubscribeFromTrackingUpdates(orderId: string, callback: (tracking: TrackingInfo) => void): Promise<void> {
    const subscribers = this.subscribers.get(orderId);
    if (subscribers) {
      const index = subscribers.indexOf(callback);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    }

    // Stop updates if no subscribers
    if (this.subscribers.get(orderId)?.length === 0) {
      this.stopRealTimeUpdates(orderId);
    }
  }

  private startRealTimeUpdates(orderId: string): void {
    // Clear existing interval
    this.stopRealTimeUpdates(orderId);

    // Update every 30 seconds
    const interval = setInterval(async () => {
      try {
        const trackingInfo = await this.getTrackingInfo(orderId);
        
        // Simulate real-time updates
        if (trackingInfo.orderStatus === 'shipped' || trackingInfo.orderStatus === 'out_for_delivery') {
          // Update location
          if (trackingInfo.realTimeLocation) {
            trackingInfo.realTimeLocation = this.simulateLocationUpdate(trackingInfo.realTimeLocation);
          }

          // Update delivery person location
          if (trackingInfo.deliveryPerson?.currentLocation) {
            trackingInfo.deliveryPerson.currentLocation = this.simulateLocationUpdate(trackingInfo.deliveryPerson.currentLocation);
          }

          // Update cache and notify subscribers
          this.trackingCache.set(orderId, trackingInfo);
          this.notifySubscribers(orderId, trackingInfo);
        }
      } catch (error) {
        console.error('Error updating tracking:', error);
      }
    }, 30000); // 30 seconds

    this.updateIntervals.set(orderId, interval);
  }

  private stopRealTimeUpdates(orderId: string): void {
    const interval = this.updateIntervals.get(orderId);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(orderId);
    }
  }

  private simulateLocationUpdate(currentLocation: { lat: number; lng: number; address: string }): { lat: number; lng: number; address: string; lastUpdated: string } {
    // Simulate small movement in location
    const latChange = (Math.random() - 0.5) * 0.01;
    const lngChange = (Math.random() - 0.5) * 0.01;

    return {
      lat: currentLocation.lat + latChange,
      lng: currentLocation.lng + lngChange,
      address: currentLocation.address,
      lastUpdated: new Date().toISOString()
    };
  }

  private notifySubscribers(orderId: string, trackingInfo: TrackingInfo): void {
    const subscribers = this.subscribers.get(orderId);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(trackingInfo);
        } catch (error) {
          console.error('Error notifying subscriber:', error);
        }
      });
    }
  }

  async markNotificationAsRead(orderId: string, notificationId: string): Promise<void> {
    const trackingInfo = this.trackingCache.get(orderId);
    if (trackingInfo) {
      const notification = trackingInfo.notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
        this.notifySubscribers(orderId, trackingInfo);
      }
    }
  }

  async getTrackingHistory(orderId: string): Promise<TrackingStage[]> {
    const trackingInfo = await this.getTrackingInfo(orderId);
    return trackingInfo.stages;
  }

  async updateOrderStatus(orderId: string, newStatus: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          order_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId);

      if (error) {
        throw error;
      }

      // Clear cache to force refresh
      this.trackingCache.delete(orderId);

      // Get updated tracking info
      const updatedTracking = await this.getTrackingInfo(orderId);
      this.notifySubscribers(orderId, updatedTracking);
    } catch (error) {
      console.error('Error updating order status:', error);
      throw new Error('Failed to update order status');
    }
  }

  // Cleanup method
  cleanup(): void {
    // Clear all intervals
    this.updateIntervals.forEach(interval => clearInterval(interval));
    this.updateIntervals.clear();

    // Clear all subscribers
    this.subscribers.clear();

    // Clear cache
    this.trackingCache.clear();
  }
}

export const orderTrackingService = new OrderTrackingService();
