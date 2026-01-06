import { supabase } from '@/integrations/supabase/client';
import { weatherService } from './weatherService';
import { trafficService } from './trafficService';
import { carrierService } from './carrierService';

export interface DeliveryPrediction {
  orderId: string;
  currentStatus: string;
  predictedDeliveryDate: string;
  confidence: number;
  riskFactors: RiskFactor[];
  recommendations: string[];
  delayProbability: number;
  estimatedDelayHours: number;
}

export interface RiskFactor {
  type: 'weather' | 'traffic' | 'carrier' | 'location' | 'seasonal';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
}

export interface WeatherData {
  condition: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  visibility: number;
  precipitation: number;
}

export interface TrafficData {
  congestionLevel: number;
  incidents: string[];
  roadConditions: string;
  peakHours: boolean;
}

export interface CarrierPerformance {
  onTimeRate: number;
  averageDelay: number;
  recentIssues: string[];
  reliability: number;
}

class PredictiveDeliveryService {
  private cache = new Map<string, DeliveryPrediction>();
  private cacheExpiry = new Map<string, number>();

  async predictDeliveryDelays(orderIds?: string[]): Promise<DeliveryPrediction[]> {
    try {
      // Get orders to analyze
      const orders = await this.getOrdersForPrediction(orderIds);
      const predictions: DeliveryPrediction[] = [];

      for (const order of orders) {
        const prediction = await this.generatePrediction(order);
        predictions.push(prediction);
        
        // Cache the prediction
        this.cache.set(order.order_id, prediction);
        this.cacheExpiry.set(order.order_id, Date.now() + 30 * 60 * 1000); // 30 minutes
      }

      return predictions;
    } catch (error) {
      console.error('Error predicting delivery delays:', error);
      throw error;
    }
  }

  private async getOrdersForPrediction(orderIds?: string[]) {
    let query = supabase
      .from('orders')
      .select('*')
      .in('order_status', ['Order Placed', 'Confirmed', 'Packed', 'Shipped', 'In Transit', 'Out for Delivery']);

    if (orderIds && orderIds.length > 0) {
      query = query.in('order_id', orderIds);
    }

    const { data, error } = await query.order('order_date', { ascending: false }).limit(50);
    
    if (error) throw error;
    return data || [];
  }

  private async generatePrediction(order: any): Promise<DeliveryPrediction> {
    const riskFactors: RiskFactor[] = [];
    let delayProbability = 0;
    let estimatedDelayHours = 0;

    // Weather Analysis
    const weatherRisk = await this.analyzeWeatherRisk(order);
    if (weatherRisk) {
      riskFactors.push(weatherRisk);
      delayProbability += this.getDelayProbability(weatherRisk.severity);
      estimatedDelayHours += this.getDelayHours(weatherRisk.severity, weatherRisk.type);
    }

    // Traffic Analysis
    const trafficRisk = await this.analyzeTrafficRisk(order);
    if (trafficRisk) {
      riskFactors.push(trafficRisk);
      delayProbability += this.getDelayProbability(trafficRisk.severity);
      estimatedDelayHours += this.getDelayHours(trafficRisk.severity, trafficRisk.type);
    }

    // Carrier Performance Analysis
    const carrierRisk = await this.analyzeCarrierRisk(order);
    if (carrierRisk) {
      riskFactors.push(carrierRisk);
      delayProbability += this.getDelayProbability(carrierRisk.severity);
      estimatedDelayHours += this.getDelayHours(carrierRisk.severity, carrierRisk.type);
    }

    // Location Risk Analysis
    const locationRisk = this.analyzeLocationRisk(order);
    if (locationRisk) {
      riskFactors.push(locationRisk);
      delayProbability += this.getDelayProbability(locationRisk.severity);
      estimatedDelayHours += this.getDelayHours(locationRisk.severity, locationRisk.type);
    }

    // Seasonal Risk Analysis
    const seasonalRisk = this.analyzeSeasonalRisk(order);
    if (seasonalRisk) {
      riskFactors.push(seasonalRisk);
      delayProbability += this.getDelayProbability(seasonalRisk.severity);
      estimatedDelayHours += this.getDelayHours(seasonalRisk.severity, seasonalRisk.type);
    }

    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(riskFactors, order);

    // Generate predicted delivery date
    const predictedDeliveryDate = this.calculatePredictedDeliveryDate(order, estimatedDelayHours);

    // Generate recommendations
    const recommendations = this.generateRecommendations(riskFactors, delayProbability);

    // Cap delay probability at 95%
    delayProbability = Math.min(delayProbability, 95);

    return {
      orderId: order.order_id,
      currentStatus: order.order_status,
      predictedDeliveryDate,
      confidence,
      riskFactors,
      recommendations,
      delayProbability,
      estimatedDelayHours
    };
  }

  private async analyzeWeatherRisk(order: any): Promise<RiskFactor | null> {
    try {
      const weatherData = await weatherService.getWeatherData(order.customer_city);
      const severity = weatherService.getWeatherSeverity(weatherData);
      
      if (severity !== 'low') {
        return {
          type: 'weather',
          severity,
          description: `${weatherData.condition} in ${order.customer_city} (${weatherData.temperature}°C, ${weatherData.precipitation}mm rain)`,
          impact: this.getWeatherImpactDescription(weatherData, severity)
        };
      }
    } catch (error) {
      console.error('Weather analysis failed:', error);
    }
    
    return null;
  }

  private getWeatherImpactDescription(weatherData: any, severity: string): string {
    switch (severity) {
      case 'critical':
        return `Severe weather conditions may cause significant delays (${weatherData.precipitation}mm precipitation, ${weatherData.windSpeed}km/h winds)`;
      case 'high':
        return `Adverse weather may delay delivery by several hours`;
      case 'medium':
        return `Weather conditions may cause minor delays`;
      default:
        return 'Weather conditions are favorable for delivery';
    }
  }

  private async analyzeTrafficRisk(order: any): Promise<RiskFactor | null> {
    try {
      const trafficData = await trafficService.getTrafficData(order.customer_city);
      const severity = trafficService.getTrafficSeverity(trafficData);
      
      if (severity !== 'low') {
        return {
          type: 'traffic',
          severity,
          description: `Traffic congestion: ${trafficData.congestionLevel}%${trafficData.peakHours ? ' (peak hours)' : ''} in ${order.customer_city}`,
          impact: this.getTrafficImpactDescription(trafficData, severity)
        };
      }
    } catch (error) {
      console.error('Traffic analysis failed:', error);
    }
    
    return null;
  }

  private getTrafficImpactDescription(trafficData: any, severity: string): string {
    const incidentText = trafficData.incidents.length > 0 
      ? ` Incidents: ${trafficData.incidents.join(', ')}` 
      : '';
    
    switch (severity) {
      case 'critical':
        return `Very heavy traffic${trafficData.peakHours ? ' during peak hours' : ''}${incidentText}. Expect significant delays`;
      case 'high':
        return `Heavy traffic conditions${incidentText}. Delivery may be delayed`;
      case 'medium':
        return `Moderate traffic. Minor delays possible`;
      default:
        return 'Traffic conditions are normal';
    }
  }

  private async analyzeCarrierRisk(order: any): Promise<RiskFactor | null> {
    if (!order.carrier_name) return null;
    
    try {
      const carrierPerformance = await carrierService.getCarrierPerformance(order.carrier_name);
      const severity = carrierService.getCarrierSeverity(carrierPerformance);
      
      if (severity !== 'low') {
        return {
          type: 'carrier',
          severity,
          description: `${order.carrier_name} performance: ${carrierPerformance.onTimeRate.toFixed(1)}% on-time rate, ${carrierPerformance.averageDelay.toFixed(1)}h avg delay`,
          impact: this.getCarrierImpactDescription(carrierPerformance, severity)
        };
      }
    } catch (error) {
      console.error('Carrier analysis failed:', error);
    }
    
    return null;
  }

  private getCarrierImpactDescription(carrierPerformance: any, severity: string): string {
    const issues = carrierPerformance.recentIssues.length > 0 
      ? ` Recent issues: ${carrierPerformance.recentIssues.join(', ')}`
      : '';
    
    switch (severity) {
      case 'critical':
        return `Poor carrier performance may cause significant delays${issues}. Consider alternative carrier`;
      case 'high':
        return `Carrier has reliability issues${issues}. Monitor closely`;
      case 'medium':
        return `Carrier performance is acceptable but may cause occasional delays`;
      default:
        return 'Carrier has good performance record';
    }
  }

  private analyzeLocationRisk(order: any): RiskFactor | null {
    // Analyze location-based risks
    const remoteAreas = ['Ladakh', 'Sikkim', 'Andaman', 'Lakshadweep'];
    const metroCities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad'];
    
    if (remoteAreas.some(area => order.customer_city.includes(area))) {
      return {
        type: 'location',
        severity: 'high',
        description: `Remote location: ${order.customer_city}`,
        impact: 'Remote areas typically have longer delivery times'
      };
    }

    // Check for difficult delivery addresses
    if (order.customer_address?.includes('floor') && !order.customer_address?.includes('elevator')) {
      return {
        type: 'location',
        severity: 'low',
        description: 'Multi-floor building without elevator access',
        impact: 'May require additional delivery time'
      };
    }

    return null;
  }

  private analyzeSeasonalRisk(order: any): RiskFactor | null {
    const orderDate = new Date(order.order_date);
    const month = orderDate.getMonth();
    
    // Festival seasons (Oct-Nov, Mar-Apr)
    if ((month >= 9 && month <= 10) || (month >= 2 && month <= 3)) {
      return {
        type: 'seasonal',
        severity: 'medium',
        description: 'Festival season - high order volume',
        impact: 'Increased order volume may cause delivery delays'
      };
    }

    // Monsoon season (Jun-Sep)
    if (month >= 5 && month <= 8) {
      return {
        type: 'seasonal',
        severity: 'low',
        description: 'Monsoon season',
        impact: 'Rain may affect delivery operations'
      };
    }

    return null;
  }

  private getDelayProbability(severity: RiskFactor['severity']): number {
    switch (severity) {
      case 'critical': return 35;
      case 'high': return 25;
      case 'medium': return 15;
      case 'low': return 5;
      default: return 0;
    }
  }

  private getDelayHours(severity: RiskFactor['severity'], type: RiskFactor['type']): number {
    switch (type) {
      case 'weather':
        return weatherService.getWeatherDelayHours(severity);
      case 'traffic':
        return trafficService.getTrafficDelayHours(severity);
      case 'carrier':
        return carrierService.getCarrierDelayHours(severity);
      case 'location':
        switch (severity) {
          case 'critical': return 24;
          case 'high': return 12;
          case 'medium': return 6;
          case 'low': return 2;
          default: return 0;
        }
      case 'seasonal':
        switch (severity) {
          case 'critical': return 18;
          case 'high': return 10;
          case 'medium': return 5;
          case 'low': return 2;
          default: return 0;
        }
      default:
        return 0;
    }
  }

  private calculateConfidence(riskFactors: RiskFactor[], order: any): number {
    let confidence = 85; // Base confidence

    // Increase confidence if we have tracking information
    if (order.tracking_number) confidence += 5;
    
    // Increase confidence if carrier is reliable
    if (order.carrier_name && ['FedEx', 'Delhivery', 'Blue Dart'].includes(order.carrier_name)) {
      confidence += 5;
    }

    // Decrease confidence if order is very new
    const orderAge = Date.now() - new Date(order.order_date).getTime();
    if (orderAge < 24 * 60 * 60 * 1000) confidence -= 10; // Less than 24 hours old

    // Decrease confidence if many risk factors
    if (riskFactors.length > 3) confidence -= 10;

    return Math.min(Math.max(confidence, 50), 95); // Keep between 50-95%
  }

  private calculatePredictedDeliveryDate(order: any, delayHours: number): string {
    const baseDate = order.expected_delivery ? new Date(order.expected_delivery) : new Date();
    const adjustedDate = new Date(baseDate.getTime() + (delayHours * 60 * 60 * 1000));
    
    return adjustedDate.toISOString().split('T')[0];
  }

  private generateRecommendations(riskFactors: RiskFactor[], delayProbability: number): string[] {
    const recommendations: string[] = [];

    if (delayProbability > 50) {
      recommendations.push('Consider upgrading to express shipping');
      recommendations.push('Inform customer about potential delays');
    }

    if (riskFactors.some(rf => rf.type === 'weather')) {
      recommendations.push('Monitor weather conditions closely');
    }

    if (riskFactors.some(rf => rf.type === 'traffic')) {
      recommendations.push('Schedule delivery during off-peak hours');
    }

    if (riskFactors.some(rf => rf.type === 'carrier')) {
      recommendations.push('Consider alternative carrier for future orders');
    }

    if (recommendations.length === 0) {
      recommendations.push('Delivery is on track - no action needed');
    }

    return recommendations;
  }

  // Public methods for getting cached predictions
  async getCachedPrediction(orderId: string): Promise<DeliveryPrediction | null> {
    const cached = this.cache.get(orderId);
    const expiry = this.cacheExpiry.get(orderId);
    
    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }
    
    return null;
  }

  async refreshPrediction(orderId: string): Promise<DeliveryPrediction> {
    const orders = await this.getOrdersForPrediction([orderId]);
    if (orders.length === 0) {
      throw new Error('Order not found');
    }
    
    const prediction = await this.generatePrediction(orders[0]);
    this.cache.set(orderId, prediction);
    this.cacheExpiry.set(orderId, Date.now() + 30 * 60 * 1000);
    
    return prediction;
  }

  // Analytics methods
  async getPredictiveAnalytics(): Promise<{
    totalOrdersAnalyzed: number;
    highRiskOrders: number;
    averageDelayProbability: number;
    topRiskFactors: { type: string; count: number }[];
    carrierPerformance: { carrier: string; avgDelayProbability: number }[];
  }> {
    const predictions = await this.predictDeliveryDelays();
    
    const highRiskOrders = predictions.filter(p => p.delayProbability > 50).length;
    const avgDelayProbability = predictions.reduce((sum, p) => sum + p.delayProbability, 0) / predictions.length;
    
    // Count risk factor types
    const riskFactorCounts: Record<string, number> = {};
    predictions.forEach(p => {
      p.riskFactors.forEach(rf => {
        riskFactorCounts[rf.type] = (riskFactorCounts[rf.type] || 0) + 1;
      });
    });
    
    const topRiskFactors = Object.entries(riskFactorCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalOrdersAnalyzed: predictions.length,
      highRiskOrders,
      averageDelayProbability: avgDelayProbability,
      topRiskFactors,
      carrierPerformance: [] // Would be calculated with more data
    };
  }
}

export const predictiveService = new PredictiveDeliveryService();
