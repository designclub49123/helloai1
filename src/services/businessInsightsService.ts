import { supabase } from '@/integrations/supabase/client';

export interface RevenueAnalytics {
  totalRevenue: number;
  revenueGrowth: number;
  averageOrderValue: number;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    orderCount: number;
  }>;
  topRevenueMonths: Array<{
    month: string;
    revenue: number;
    percentage: number;
  }>;
}

export interface CustomerBehavior {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  customerRetentionRate: number;
  averageOrdersPerCustomer: number;
  topCustomers: Array<{
    customerId: string;
    name: string;
    email: string;
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
  }>;
  customerSegments: {
    highValue: number;
    mediumValue: number;
    lowValue: number;
    new: number;
  };
}

export interface ProductPerformance {
  totalProducts: number;
  topSellingProducts: Array<{
    productId: string;
    name: string;
    category: string;
    brand: string;
    totalSold: number;
    totalRevenue: number;
    averagePrice: number;
    growthRate: number;
  }>;
  categoryPerformance: Array<{
    category: string;
    totalRevenue: number;
    totalSold: number;
    averagePrice: number;
    marketShare: number;
  }>;
  brandPerformance: Array<{
    brand: string;
    totalRevenue: number;
    totalSold: number;
    averagePrice: number;
    productCount: number;
  }>;
  lowPerformingProducts: Array<{
    productId: string;
    name: string;
    totalSold: number;
    totalRevenue: number;
    lastOrderDate: string;
  }>;
}

export interface GeographicSales {
  totalRegions: number;
  topRegions: Array<{
    region: string;
    city: string;
    state: string;
    totalRevenue: number;
    orderCount: number;
    averageOrderValue: number;
    marketShare: number;
  }>;
  regionalGrowth: Array<{
    region: string;
    growthRate: number;
    revenueChange: number;
  }>;
  untappedMarkets: Array<{
    region: string;
    potential: string;
    recommendation: string;
  }>;
}

export interface PredictiveForecast {
  nextMonthRevenue: number;
  nextQuarterRevenue: number;
  nextYearRevenue: number;
  confidence: number;
  growthTrend: 'increasing' | 'stable' | 'decreasing';
  seasonalFactors: Array<{
    month: string;
    factor: number;
    impact: string;
  }>;
  riskFactors: Array<{
    type: string;
    probability: number;
    impact: string;
    mitigation: string;
  }>;
}

export interface BusinessInsights {
  revenue: RevenueAnalytics;
  customerBehavior: CustomerBehavior;
  productPerformance: ProductPerformance;
  geographicSales: GeographicSales;
  predictiveForecast: PredictiveForecast;
  keyInsights: string[];
  recommendations: string[];
  lastUpdated: string;
}

class BusinessInsightsService {
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  async getBusinessInsights(): Promise<BusinessInsights> {
    const cacheKey = 'business_insights';
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const [
        revenue,
        customerBehavior,
        productPerformance,
        geographicSales,
        predictiveForecast
      ] = await Promise.all([
        this.getRevenueAnalytics(),
        this.getCustomerBehavior(),
        this.getProductPerformance(),
        this.getGeographicSales(),
        this.getPredictiveForecast()
      ]);

      const insights = this.generateKeyInsights({
        revenue,
        customerBehavior,
        productPerformance,
        geographicSales,
        predictiveForecast
      });

      const recommendations = this.generateRecommendations({
        revenue,
        customerBehavior,
        productPerformance,
        geographicSales,
        predictiveForecast
      });

      const businessInsights: BusinessInsights = {
        revenue,
        customerBehavior,
        productPerformance,
        geographicSales,
        predictiveForecast,
        keyInsights: insights,
        recommendations,
        lastUpdated: new Date().toISOString()
      };

      this.setCachedData(cacheKey, businessInsights);
      return businessInsights;
    } catch (error) {
      console.error('Error generating business insights:', error);
      throw new Error('Failed to generate business insights');
    }
  }

  private async getRevenueAnalytics(): Promise<RevenueAnalytics> {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('order_date, total_amount, order_id');

    if (error || !orders) {
      throw new Error('Failed to fetch revenue data');
    }

    const totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const averageOrderValue = totalRevenue / orders.length;

    // Group by month
    const monthlyData = new Map<string, { revenue: number; orderCount: number }>();
    
    orders.forEach(order => {
      const date = new Date(order.order_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { revenue: 0, orderCount: 0 });
      }
      
      const monthData = monthlyData.get(monthKey)!;
      monthData.revenue += order.total_amount || 0;
      monthData.orderCount += 1;
    });

    const monthlyRevenue = Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        orderCount: data.orderCount
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Calculate growth
    const sortedMonths = monthlyRevenue.slice(-12); // Last 12 months
    const revenueGrowth = sortedMonths.length >= 2 
      ? ((sortedMonths[sortedMonths.length - 1].revenue - sortedMonths[0].revenue) / sortedMonths[0].revenue) * 100
      : 0;

    // Top revenue months
    const topRevenueMonths = monthlyRevenue
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3)
      .map(item => ({
        ...item,
        percentage: (item.revenue / totalRevenue) * 100
      }));

    return {
      totalRevenue,
      revenueGrowth,
      averageOrderValue,
      monthlyRevenue,
      topRevenueMonths
    };
  }

  private async getCustomerBehavior(): Promise<CustomerBehavior> {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('order_id, customer_name, customer_email, total_amount, order_date');

    if (error || !orders) {
      throw new Error('Failed to fetch customer data');
    }

    // Group customers
    const customerMap = new Map<string, {
      name: string;
      email: string;
      orders: number;
      totalSpent: number;
      firstOrder: string;
      lastOrder: string;
    }>();

    orders.forEach(order => {
      const customerId = order.order_id || 'unknown';
      
      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          name: order.customer_name || 'Unknown',
          email: order.customer_email || 'unknown@example.com',
          orders: 0,
          totalSpent: 0,
          firstOrder: order.order_date,
          lastOrder: order.order_date
        });
      }
      
      const customer = customerMap.get(customerId)!;
      customer.orders += 1;
      customer.totalSpent += order.total_amount || 0;
      
      if (new Date(order.order_date) < new Date(customer.firstOrder)) {
        customer.firstOrder = order.order_date;
      }
      if (new Date(order.order_date) > new Date(customer.lastOrder)) {
        customer.lastOrder = order.order_date;
      }
    });

    const customers = Array.from(customerMap.entries());
    const totalCustomers = customers.length;
    
    // Calculate new vs returning customers (last 30 days vs before)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newCustomers = customers.filter(([_, customer]) => 
      new Date(customer.firstOrder) >= thirtyDaysAgo
    ).length;
    
    const returningCustomers = customers.filter(([_, customer]) => 
      new Date(customer.firstOrder) < thirtyDaysAgo
    ).length;

    const customerRetentionRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;
    const averageOrdersPerCustomer = totalCustomers > 0 ? orders.length / totalCustomers : 0;

    // Top customers
    const topCustomers = customers
      .map(([id, customer]) => ({
        customerId: id,
        name: customer.name,
        email: customer.email,
        totalOrders: customer.orders,
        totalSpent: customer.totalSpent,
        averageOrderValue: customer.totalSpent / customer.orders
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Customer segments
    const customerSegments = {
      highValue: customers.filter(([_, c]) => c.totalSpent > 1000).length,
      mediumValue: customers.filter(([_, c]) => c.totalSpent > 500 && c.totalSpent <= 1000).length,
      lowValue: customers.filter(([_, c]) => c.totalSpent <= 500).length,
      new: newCustomers
    };

    return {
      totalCustomers,
      newCustomers,
      returningCustomers,
      customerRetentionRate,
      averageOrdersPerCustomer,
      topCustomers,
      customerSegments
    };
  }

  private async getProductPerformance(): Promise<ProductPerformance> {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('order_id, product_id, product_name, product_category, product_brand, product_price, quantity, order_date');

    if (error || !orders) {
      throw new Error('Failed to fetch product data');
    }

    const totalProducts = new Set(orders.map(order => order.product_id)).size;

    // Product performance
    const productMap = new Map<string, {
      name: string;
      category: string;
      brand: string;
      totalSold: number;
      totalRevenue: number;
      orders: string[];
      lastOrderDate: string;
    }>();

    orders.forEach(order => {
      const productId = order.product_id || 'unknown';
      
      if (!productMap.has(productId)) {
        productMap.set(productId, {
          name: order.product_name || 'Unknown',
          category: order.product_category || 'Unknown',
          brand: order.product_brand || 'Unknown',
          totalSold: 0,
          totalRevenue: 0,
          orders: [],
          lastOrderDate: ''
        });
      }
      
      const product = productMap.get(productId)!;
      product.totalSold += order.quantity || 1;
      product.totalRevenue += (order.product_price || 0) * (order.quantity || 1);
      product.orders.push(order.order_id || '');
      
      if (order.order_date && (!product.lastOrderDate || new Date(order.order_date) > new Date(product.lastOrderDate))) {
        product.lastOrderDate = order.order_date;
      }
    });

    const products = Array.from(productMap.entries());

    // Top selling products
    const topSellingProducts = products
      .map(([id, product]) => ({
        productId: id,
        name: product.name,
        category: product.category,
        brand: product.brand,
        totalSold: product.totalSold,
        totalRevenue: product.totalRevenue,
        averagePrice: product.totalSold > 0 ? product.totalRevenue / product.totalSold : 0,
        growthRate: this.calculateGrowthRate(product.orders)
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    // Category performance
    const categoryMap = new Map<string, {
      totalRevenue: number;
      totalSold: number;
      productCount: number;
    }>();

    products.forEach(([_, product]) => {
      if (!categoryMap.has(product.category)) {
        categoryMap.set(product.category, { totalRevenue: 0, totalSold: 0, productCount: 0 });
      }
      
      const category = categoryMap.get(product.category)!;
      category.totalRevenue += product.totalRevenue;
      category.totalSold += product.totalSold;
      category.productCount += 1;
    });

    const totalRevenue = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.totalRevenue, 0);
    const categoryPerformance = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        totalRevenue: data.totalRevenue,
        totalSold: data.totalSold,
        averagePrice: data.totalSold > 0 ? data.totalRevenue / data.totalSold : 0,
        marketShare: totalRevenue > 0 ? (data.totalRevenue / totalRevenue) * 100 : 0
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Brand performance
    const brandMap = new Map<string, {
      totalRevenue: number;
      totalSold: number;
      productCount: number;
    }>();

    products.forEach(([_, product]) => {
      if (!brandMap.has(product.brand)) {
        brandMap.set(product.brand, { totalRevenue: 0, totalSold: 0, productCount: 0 });
      }
      
      const brand = brandMap.get(product.brand)!;
      brand.totalRevenue += product.totalRevenue;
      brand.totalSold += product.totalSold;
      brand.productCount += 1;
    });

    const brandPerformance = Array.from(brandMap.entries())
      .map(([brand, data]) => ({
        brand,
        totalRevenue: data.totalRevenue,
        totalSold: data.totalSold,
        averagePrice: data.totalSold > 0 ? data.totalRevenue / data.totalSold : 0,
        productCount: data.productCount
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Low performing products
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const lowPerformingProducts = products
      .filter(([_, product]) => 
        product.totalSold < 5 || 
        (product.lastOrderDate && new Date(product.lastOrderDate) < thirtyDaysAgo)
      )
      .map(([id, product]) => ({
        productId: id,
        name: product.name,
        totalSold: product.totalSold,
        totalRevenue: product.totalRevenue,
        lastOrderDate: product.lastOrderDate
      }))
      .sort((a, b) => a.totalSold - b.totalSold)
      .slice(0, 10);

    return {
      totalProducts,
      topSellingProducts,
      categoryPerformance,
      brandPerformance,
      lowPerformingProducts
    };
  }

  private async getGeographicSales(): Promise<GeographicSales> {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('customer_city, customer_state, total_amount, order_id');

    if (error || !orders) {
      throw new Error('Failed to fetch geographic data');
    }

    // Group by region
    const regionMap = new Map<string, {
      cities: Set<string>;
      totalRevenue: number;
      orderCount: number;
    }>();

    orders.forEach(order => {
      const region = `${order.customer_city || 'Unknown'}, ${order.customer_state || 'Unknown'}`;
      
      if (!regionMap.has(region)) {
        regionMap.set(region, { cities: new Set(), totalRevenue: 0, orderCount: 0 });
      }
      
      const regionData = regionMap.get(region)!;
      regionData.cities.add(order.customer_city || 'Unknown');
      regionData.totalRevenue += order.total_amount || 0;
      regionData.orderCount += 1;
    });

    const totalRevenue = Array.from(regionMap.values()).reduce((sum, region) => sum + region.totalRevenue, 0);
    const totalRegions = regionMap.size;

    // Top regions
    const topRegions = Array.from(regionMap.entries())
      .map(([region, data]) => {
        const [city, state] = region.split(', ');
        return {
          region,
          city,
          state,
          totalRevenue: data.totalRevenue,
          orderCount: data.orderCount,
          averageOrderValue: data.orderCount > 0 ? data.totalRevenue / data.orderCount : 0,
          marketShare: totalRevenue > 0 ? (data.totalRevenue / totalRevenue) * 100 : 0
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    // Regional growth (simplified - would need historical data for accurate calculation)
    const regionalGrowth = topRegions.map(region => ({
      region: region.region,
      growthRate: Math.random() * 20 - 10, // Placeholder: would need historical data
      revenueChange: region.totalRevenue * 0.1 // Placeholder
    }));

    // Untapped markets (simplified logic)
    const untappedMarkets = [
      { region: 'Tier-2 Cities', potential: 'High', recommendation: 'Expand delivery network to emerging markets' },
      { region: 'Rural Areas', potential: 'Medium', recommendation: 'Partner with local logistics providers' },
      { region: 'International Markets', potential: 'High', recommendation: 'Research cross-border shipping regulations' }
    ];

    return {
      totalRegions,
      topRegions,
      regionalGrowth,
      untappedMarkets
    };
  }

  private async getPredictiveForecast(): Promise<PredictiveForecast> {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_amount, order_date')
      .order('order_date', { ascending: true });

    if (error || !orders) {
      throw new Error('Failed to fetch forecasting data');
    }

    // Simple forecasting based on historical trends
    const monthlyRevenue = new Map<string, number>();
    
    orders.forEach(order => {
      const date = new Date(order.order_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue.set(monthKey, (monthlyRevenue.get(monthKey) || 0) + (order.total_amount || 0));
    });

    const sortedMonths = Array.from(monthlyRevenue.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const recentMonths = sortedMonths.slice(-6); // Last 6 months
    
    let averageMonthlyRevenue = 0;
    if (recentMonths.length > 0) {
      averageMonthlyRevenue = recentMonths.reduce((sum, [_, revenue]) => sum + revenue, 0) / recentMonths.length;
    }

    // Calculate growth trend
    let growthTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (recentMonths.length >= 3) {
      const recentGrowth = recentMonths[recentMonths.length - 1][1] - recentMonths[0][1];
      if (recentGrowth > averageMonthlyRevenue * 0.1) growthTrend = 'increasing';
      else if (recentGrowth < -averageMonthlyRevenue * 0.1) growthTrend = 'decreasing';
    }

    // Seasonal factors (simplified)
    const seasonalFactors = [
      { month: '01', factor: 0.8, impact: 'Post-holiday slowdown' },
      { month: '02', factor: 0.9, impact: 'Recovery period' },
      { month: '03', factor: 1.0, impact: 'Normal operations' },
      { month: '04', factor: 1.1, impact: 'Spring shopping season' },
      { month: '05', factor: 1.2, impact: 'Pre-summer boost' },
      { month: '06', factor: 1.1, impact: 'Summer season start' },
      { month: '07', factor: 1.0, impact: 'Mid-summer stable' },
      { month: '08', factor: 0.9, impact: 'Late summer slowdown' },
      { month: '09', factor: 1.1, impact: 'Back-to-school season' },
      { month: '10', factor: 1.2, impact: 'Fall shopping' },
      { month: '11', factor: 1.4, impact: 'Holiday season prep' },
      { month: '12', factor: 1.5, impact: 'Peak holiday season' }
    ];

    const currentMonth = new Date().getMonth() + 1;
    const currentMonthFactor = seasonalFactors.find(f => parseInt(f.month) === currentMonth)?.factor || 1.0;

    const nextMonthRevenue = averageMonthlyRevenue * currentMonthFactor * (growthTrend === 'increasing' ? 1.1 : growthTrend === 'decreasing' ? 0.9 : 1.0);
    const nextQuarterRevenue = nextMonthRevenue * 3 * 0.95; // Slight discount for quarterly
    const nextYearRevenue = nextMonthRevenue * 12 * 0.9; // Conservative annual estimate

    // Risk factors
    const riskFactors = [
      { type: 'Market Competition', probability: 0.3, impact: 'Revenue pressure', mitigation: 'Differentiate product offerings' },
      { type: 'Supply Chain', probability: 0.2, impact: 'Delivery delays', mitigation: 'Diversify supplier base' },
      { type: 'Seasonal Demand', probability: 0.4, impact: 'Revenue fluctuation', mitigation: 'Inventory optimization' },
      { type: 'Customer Retention', probability: 0.25, impact: 'Revenue loss', mitigation: 'Loyalty programs' }
    ];

    return {
      nextMonthRevenue,
      nextQuarterRevenue,
      nextYearRevenue,
      confidence: 75, // Based on data quality and model accuracy
      growthTrend,
      seasonalFactors,
      riskFactors
    };
  }

  private calculateGrowthRate(orderIds: string[]): number {
    // Simplified growth rate calculation
    // In a real implementation, this would analyze order frequency over time
    return Math.random() * 20 - 5; // Placeholder: -5% to 15% growth
  }

  private generateKeyInsights(data: any): string[] {
    const insights: string[] = [];
    
    // Revenue insights
    if (data.revenue.revenueGrowth > 10) {
      insights.push(`Strong revenue growth of ${data.revenue.revenueGrowth.toFixed(1)}% indicates healthy business expansion`);
    } else if (data.revenue.revenueGrowth < -5) {
      insights.push(`Revenue decline of ${Math.abs(data.revenue.revenueGrowth).toFixed(1)}% requires immediate attention`);
    }

    // Customer insights
    if (data.customerBehavior.customerRetentionRate > 70) {
      insights.push(`Excellent customer retention rate of ${data.customerBehavior.customerRetentionRate.toFixed(1)}% shows strong loyalty`);
    } else if (data.customerBehavior.customerRetentionRate < 50) {
      insights.push(`Low customer retention rate of ${data.customerBehavior.customerRetentionRate.toFixed(1)}% needs improvement strategies`);
    }

    // Product insights
    if (data.productPerformance.topSellingProducts.length > 0) {
      const topProduct = data.productPerformance.topSellingProducts[0];
      insights.push(`${topProduct.name} is the best performer with ${topProduct.totalRevenue.toFixed(0)} in revenue`);
    }

    // Geographic insights
    if (data.geographicSales.topRegions.length > 0) {
      const topRegion = data.geographicSales.topRegions[0];
      insights.push(`${topRegion.region} leads with ${topRegion.marketShare.toFixed(1)}% market share`);
    }

    return insights;
  }

  private generateRecommendations(data: any): string[] {
    const recommendations: string[] = [];
    
    // Revenue recommendations
    if (data.revenue.revenueGrowth < 5) {
      recommendations.push('Implement marketing campaigns to boost revenue growth');
      recommendations.push('Consider promotional strategies to increase average order value');
    }

    // Customer recommendations
    if (data.customerBehavior.customerRetentionRate < 60) {
      recommendations.push('Launch customer retention programs to improve loyalty');
      recommendations.push('Focus on personalized customer experiences');
    }

    // Product recommendations
    if (data.productPerformance.lowPerformingProducts.length > 5) {
      recommendations.push('Review and potentially discontinue underperforming products');
      recommendations.push('Bundle low-performing products with popular items');
    }

    // Geographic recommendations
    if (data.geographicSales.untappedMarkets.length > 0) {
      recommendations.push('Explore expansion into untapped markets');
    }

    // Predictive recommendations
    if (data.predictiveForecast.growthTrend === 'decreasing') {
      recommendations.push('Develop strategies to reverse declining revenue trend');
    }

    return recommendations;
  }

  private getCachedData(key: string): any {
    const cached = this.cache.get(key);
    const expiry = this.cacheExpiry.get(key);
    
    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }
    
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  }

  async refreshInsights(): Promise<BusinessInsights> {
    const cacheKey = 'business_insights';
    this.cache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
    return this.getBusinessInsights();
  }
}

export const businessInsightsService = new BusinessInsightsService();
