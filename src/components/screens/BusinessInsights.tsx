import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package, 
  MapPin, 
  DollarSign,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { businessInsightsService, type BusinessInsights } from '@/services/businessInsightsService';

export function BusinessInsights() {
  const [insights, setInsights] = useState<BusinessInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInsights = async () => {
    try {
      const data = await businessInsightsService.getBusinessInsights();
      setInsights(data);
    } catch (error) {
      console.error('Failed to fetch business insights:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInsights();
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading business insights...</p>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-4" />
          <p className="text-destructive">Failed to load business insights</p>
          <Button onClick={fetchInsights} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    if (growth < 0) return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Business Insights</h1>
          <p className="text-muted-foreground">
            Last updated: {new Date(insights.lastUpdated).toLocaleString()}
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(insights.revenue.totalRevenue)}</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              {getGrowthIcon(insights.revenue.revenueGrowth)}
              <span className={getGrowthColor(insights.revenue.revenueGrowth)}>
                {formatPercentage(insights.revenue.revenueGrowth)} from last period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.customerBehavior.totalCustomers.toLocaleString()}</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>{formatPercentage(insights.customerBehavior.customerRetentionRate)} retention</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.productPerformance.totalProducts}</div>
            <div className="text-xs text-muted-foreground">
              {insights.productPerformance.topSellingProducts[0]?.name || 'N/A'} is top performer
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Regions</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.geographicSales.totalRegions}</div>
            <div className="text-xs text-muted-foreground">
              {insights.geographicSales.topRegions[0]?.region || 'N/A'} leads market
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Insights and Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.keyInsights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm">{insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="geographic">Geographic</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>Monthly revenue performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.revenue.monthlyRevenue.slice(-6).map((month) => (
                    <div key={month.month} className="flex items-center justify-between">
                      <span className="text-sm">{month.month}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{formatCurrency(month.revenue)}</span>
                        <Badge variant="secondary">{month.orderCount} orders</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Revenue Months</CardTitle>
                <CardDescription>Best performing months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.revenue.topRevenueMonths.map((month, index) => (
                    <div key={month.month} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={index === 0 ? "default" : "secondary"}>
                          #{index + 1}
                        </Badge>
                        <span className="text-sm">{month.month}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatCurrency(month.revenue)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatPercentage(month.percentage)} of total
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Segments</CardTitle>
                <CardDescription>Distribution by customer value</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>High Value</span>
                      <span>{insights.customerBehavior.customerSegments.highValue}</span>
                    </div>
                    <Progress 
                      value={(insights.customerBehavior.customerSegments.highValue / insights.customerBehavior.totalCustomers) * 100} 
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Medium Value</span>
                      <span>{insights.customerBehavior.customerSegments.mediumValue}</span>
                    </div>
                    <Progress 
                      value={(insights.customerBehavior.customerSegments.mediumValue / insights.customerBehavior.totalCustomers) * 100} 
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Low Value</span>
                      <span>{insights.customerBehavior.customerSegments.lowValue}</span>
                    </div>
                    <Progress 
                      value={(insights.customerBehavior.customerSegments.lowValue / insights.customerBehavior.totalCustomers) * 100} 
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>New Customers</span>
                      <span>{insights.customerBehavior.customerSegments.new}</span>
                    </div>
                    <Progress 
                      value={(insights.customerBehavior.customerSegments.new / insights.customerBehavior.totalCustomers) * 100} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
                <CardDescription>Highest value customers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.customerBehavior.topCustomers.slice(0, 5).map((customer) => (
                    <div key={customer.customerId} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{customer.name}</div>
                        <div className="text-xs text-muted-foreground">{customer.email}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatCurrency(customer.totalSpent)}</div>
                        <div className="text-xs text-muted-foreground">
                          {customer.totalOrders} orders
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>Best performing products</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.productPerformance.topSellingProducts.slice(0, 5).map((product) => (
                    <div key={product.productId} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {product.category} • {product.brand}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatCurrency(product.totalRevenue)}</div>
                        <div className="text-xs text-muted-foreground">
                          {product.totalSold} sold
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
                <CardDescription>Revenue by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.productPerformance.categoryPerformance.slice(0, 5).map((category) => (
                    <div key={category.category} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{category.category}</div>
                        <div className="text-xs text-muted-foreground">
                          {category.totalSold} products sold
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatCurrency(category.totalRevenue)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatPercentage(category.marketShare)} share
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="geographic" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Regions</CardTitle>
                <CardDescription>Best performing geographic areas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.geographicSales.topRegions.slice(0, 5).map((region) => (
                    <div key={region.region} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{region.region}</div>
                        <div className="text-xs text-muted-foreground">
                          {region.orderCount} orders
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatCurrency(region.totalRevenue)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatPercentage(region.marketShare)} share
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Untapped Markets</CardTitle>
                <CardDescription>Potential expansion opportunities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.geographicSales.untappedMarkets.map((market, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{market.region}</span>
                        <Badge variant={market.potential === 'High' ? 'default' : 'secondary'}>
                          {market.potential} Potential
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{market.recommendation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Forecast</CardTitle>
                <CardDescription>Predicted future revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Next Month</span>
                    <span className="text-sm font-medium">{formatCurrency(insights.predictiveForecast.nextMonthRevenue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Next Quarter</span>
                    <span className="text-sm font-medium">{formatCurrency(insights.predictiveForecast.nextQuarterRevenue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Next Year</span>
                    <span className="text-sm font-medium">{formatCurrency(insights.predictiveForecast.nextYearRevenue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Growth Trend</span>
                    <Badge variant={insights.predictiveForecast.growthTrend === 'increasing' ? 'default' : 'secondary'}>
                      {insights.predictiveForecast.growthTrend}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Confidence</span>
                    <div className="flex items-center gap-2">
                      <Progress value={insights.predictiveForecast.confidence} className="w-20" />
                      <span className="text-sm">{formatPercentage(insights.predictiveForecast.confidence)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Factors</CardTitle>
                <CardDescription>Potential business risks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.predictiveForecast.riskFactors.map((risk, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{risk.type}</span>
                        <Badge variant={risk.probability > 0.3 ? 'destructive' : 'secondary'}>
                          {formatPercentage(risk.probability * 100)} probability
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{risk.impact}</p>
                      <p className="text-xs text-blue-600">{risk.mitigation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
