import { supabase } from '@/integrations/supabase/client';

interface CarrierPerformance {
  carrierName: string;
  onTimeRate: number;
  averageDelay: number;
  totalOrders: number;
  recentIssues: string[];
  reliability: number;
  lastUpdated: string;
}

interface CarrierMetrics {
  totalOrders: number;
  onTimeDeliveries: number;
  delayedOrders: number;
  averageDelayHours: number;
  recentDelays: Array<{
    orderId: string;
    delayHours: number;
    reason: string;
    date: string;
  }>;
}

class CarrierService {
  private cache = new Map<string, CarrierPerformance>();
  private cacheExpiry = new Map<string, number>();

  async getCarrierPerformance(carrierName: string): Promise<CarrierPerformance> {
    // Check cache first
    const cached = this.cache.get(carrierName);
    const expiry = this.cacheExpiry.get(carrierName);
    
    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }

    try {
      // Fetch real performance data from database
      const performance = await this.calculateCarrierPerformance(carrierName);
      
      // Cache for 1 hour
      this.cache.set(carrierName, performance);
      this.cacheExpiry.set(carrierName, Date.now() + 60 * 60 * 1000);
      
      return performance;
    } catch (error) {
      console.error('Error calculating carrier performance:', error);
      return this.getDefaultCarrierPerformance(carrierName);
    }
  }

  private async calculateCarrierPerformance(carrierName: string): Promise<CarrierPerformance> {
    // Get all orders for this carrier
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('carrier_name', carrierName)
      .order('order_date', { ascending: false })
      .limit(100);

    if (error || !orders || orders.length === 0) {
      return this.getDefaultCarrierPerformance(carrierName);
    }

    const metrics = this.calculateMetrics(orders);
    const recentIssues = this.identifyRecentIssues(orders);

    return {
      carrierName,
      onTimeRate: metrics.onTimeDeliveries / metrics.totalOrders * 100,
      averageDelay: metrics.averageDelayHours,
      totalOrders: metrics.totalOrders,
      recentIssues,
      reliability: this.calculateReliability(metrics),
      lastUpdated: new Date().toISOString()
    };
  }

  private calculateMetrics(orders: any[]): CarrierMetrics {
    const totalOrders = orders.length;
    let onTimeDeliveries = 0;
    let delayedOrders = 0;
    let totalDelayHours = 0;
    const recentDelays: Array<{
      orderId: string;
      delayHours: number;
      reason: string;
      date: string;
    }> = [];

    orders.forEach(order => {
      const orderDate = new Date(order.order_date);
      const expectedDate = order.expected_delivery ? new Date(order.expected_delivery) : null;
      const actualDate = order.actual_delivery ? new Date(order.actual_delivery) : null;
      const currentDate = new Date();

      // Calculate if order is on time
      if (order.order_status === 'Delivered' && actualDate && expectedDate) {
        const delayHours = (actualDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60);
        
        if (delayHours <= 24) { // Consider on-time if within 24 hours
          onTimeDeliveries++;
        } else {
          delayedOrders++;
          totalDelayHours += delayHours;
          
          // Add to recent delays if within last 7 days
          if (currentDate.getTime() - actualDate.getTime() <= 7 * 24 * 60 * 60 * 1000) {
            recentDelays.push({
              orderId: order.order_id,
              delayHours: Math.round(delayHours),
              reason: this.inferDelayReason(order),
              date: actualDate.toISOString()
            });
          }
        }
      } else if (order.order_status !== 'Delivered' && expectedDate) {
        // Check if order is already delayed
        if (currentDate > expectedDate) {
          delayedOrders++;
          const delayHours = (currentDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60);
          totalDelayHours += delayHours;
        }
      }
    });

    const averageDelayHours = delayedOrders > 0 ? totalDelayHours / delayedOrders : 0;

    return {
      totalOrders,
      onTimeDeliveries,
      delayedOrders,
      averageDelayHours,
      recentDelays
    };
  }

  private inferDelayReason(order: any): string {
    // Infer delay reason based on order data and patterns
    const reasons = [];

    if (order.current_location?.includes('Hub')) {
      reasons.push('Hub congestion');
    }

    if (order.tracking_number && !order.actual_delivery) {
      reasons.push('Transit delay');
    }

    // Check if it's during monsoon season
    const orderMonth = new Date(order.order_date).getMonth();
    if (orderMonth >= 5 && orderMonth <= 8) {
      reasons.push('Weather conditions');
    }

    // Check location-based delays
    if (order.customer_city?.includes('Ladakh') || order.customer_city?.includes('Sikkim')) {
      reasons.push('Remote location');
    }

    return reasons.length > 0 ? reasons.join(', ') : 'Unknown';
  }

  private identifyRecentIssues(orders: any[]): string[] {
    const issues: string[] = [];
    const recentOrders = orders.filter(order => {
      const orderDate = new Date(order.order_date);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return orderDate > weekAgo;
    });

    // Check for common issues
    const delayedCount = recentOrders.filter(order => {
      if (order.order_status === 'Delivered' && order.actual_delivery && order.expected_delivery) {
        return new Date(order.actual_delivery) > new Date(order.expected_delivery);
      }
      return false;
    }).length;

    if (delayedCount > recentOrders.length * 0.3) {
      issues.push('High delay rate this week');
    }

    // Check for tracking issues
    const noTrackingCount = recentOrders.filter(order => !order.tracking_number).length;
    if (noTrackingCount > recentOrders.length * 0.2) {
      issues.push('Missing tracking information');
    }

    // Check for location update issues
    const noLocationCount = recentOrders.filter(order => !order.current_location).length;
    if (noLocationCount > recentOrders.length * 0.4) {
      issues.push('Location tracking issues');
    }

    return issues;
  }

  private calculateReliability(metrics: CarrierMetrics): number {
    // Calculate reliability score based on multiple factors
    let reliability = 100;

    // On-time rate impact
    const onTimeRate = metrics.onTimeDeliveries / metrics.totalOrders;
    reliability -= (1 - onTimeRate) * 40;

    // Average delay impact
    reliability -= Math.min(metrics.averageDelayHours * 2, 30);

    // Recent issues impact
    const recentIssuePenalty = metrics.recentDelays.length * 5;
    reliability -= Math.min(recentIssuePenalty, 20);

    return Math.max(0, Math.min(100, reliability));
  }

  private getDefaultCarrierPerformance(carrierName: string): CarrierPerformance {
    // Default performance for carriers with no data
    const defaultPerformances: Record<string, Partial<CarrierPerformance>> = {
      'FedEx': { onTimeRate: 92, averageDelay: 2, reliability: 95 },
      'Delhivery': { onTimeRate: 85, averageDelay: 4, reliability: 88 },
      'Blue Dart': { onTimeRate: 88, averageDelay: 3, reliability: 91 },
      'India Post': { onTimeRate: 65, averageDelay: 8, reliability: 70 },
      'DTDC': { onTimeRate: 75, averageDelay: 5, reliability: 78 },
      'Xpressbees': { onTimeRate: 80, averageDelay: 4, reliability: 82 }
    };

    const defaults = defaultPerformances[carrierName] || {
      onTimeRate: 75,
      averageDelay: 5,
      reliability: 78
    };

    return {
      carrierName,
      onTimeRate: defaults.onTimeRate || 75,
      averageDelay: defaults.averageDelay || 5,
      totalOrders: 0,
      recentIssues: ['No recent data available'],
      reliability: defaults.reliability || 78,
      lastUpdated: new Date().toISOString()
    };
  }

  // Get carrier severity for risk assessment
  getCarrierSeverity(performance: CarrierPerformance): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0;

    // On-time rate risk
    if (performance.onTimeRate < 60) riskScore += 3;
    else if (performance.onTimeRate < 75) riskScore += 2;
    else if (performance.onTimeRate < 85) riskScore += 1;

    // Average delay risk
    if (performance.averageDelay > 12) riskScore += 3;
    else if (performance.averageDelay > 6) riskScore += 2;
    else if (performance.averageDelay > 3) riskScore += 1;

    // Reliability risk
    if (performance.reliability < 60) riskScore += 2;
    else if (performance.reliability < 75) riskScore += 1;

    // Recent issues risk
    if (performance.recentIssues.length > 3) riskScore += 2;
    else if (performance.recentIssues.length > 1) riskScore += 1;

    if (riskScore >= 6) return 'critical';
    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  // Get carrier-based delay hours
  getCarrierDelayHours(severity: 'low' | 'medium' | 'high' | 'critical'): number {
    switch (severity) {
      case 'critical': return 12 + Math.random() * 12; // 12-24 hours
      case 'high': return 6 + Math.random() * 6; // 6-12 hours
      case 'medium': return 3 + Math.random() * 3; // 3-6 hours
      case 'low': return Math.random() * 3; // 0-3 hours
      default: return 0;
    }
  }

  // Get all carriers performance comparison
  async getAllCarriersPerformance(): Promise<CarrierPerformance[]> {
    const { data: orders } = await supabase
      .from('orders')
      .select('carrier_name')
      .not('carrier_name', 'is', null);

    if (!orders) return [];

    const uniqueCarriers = [...new Set(orders.map(order => order.carrier_name).filter(Boolean))];
    
    const performances = await Promise.all(
      uniqueCarriers.map(carrier => this.getCarrierPerformance(carrier))
    );

    return performances.sort((a, b) => b.reliability - a.reliability);
  }

  // Update carrier performance with new order data
  async updateCarrierPerformance(orderId: string): Promise<void> {
    // Get the order to find carrier
    const { data: order } = await supabase
      .from('orders')
      .select('carrier_name')
      .eq('order_id', orderId)
      .single();

    if (order?.carrier_name) {
      // Clear cache to force recalculation
      this.cache.delete(order.carrier_name);
      this.cacheExpiry.delete(order.carrier_name);
    }
  }
}

export const carrierService = new CarrierService();
