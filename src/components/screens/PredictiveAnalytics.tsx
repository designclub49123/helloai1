import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, Clock, MapPin, Cloud, Truck, Calendar, BarChart3, Activity, Zap, Shield } from 'lucide-react';
import { predictiveService, DeliveryPrediction, RiskFactor } from '@/services/predictiveService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function PredictiveAnalytics() {
  const [predictions, setPredictions] = useState<DeliveryPrediction[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRisk, setSelectedRisk] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPredictiveData();
  }, []);

  const loadPredictiveData = async () => {
    try {
      setLoading(true);
      const [predictionsData, analyticsData] = await Promise.all([
        predictiveService.predictDeliveryDelays(),
        predictiveService.getPredictiveAnalytics()
      ]);
      
      setPredictions(predictionsData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading predictive data:', error);
      toast({
        title: "Error",
        description: "Failed to load predictive analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskIcon = (type: RiskFactor['type']) => {
    switch (type) {
      case 'weather': return <Cloud size={16} />;
      case 'traffic': return <Truck size={16} />;
      case 'carrier': return <Activity size={16} />;
      case 'location': return <MapPin size={16} />;
      case 'seasonal': return <Calendar size={16} />;
      default: return <AlertTriangle size={16} />;
    }
  };

  const getRiskColor = (severity: RiskFactor['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getDelayColor = (probability: number) => {
    if (probability >= 70) return 'text-red-500';
    if (probability >= 50) return 'text-orange-500';
    if (probability >= 30) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-500';
    if (confidence >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const filteredPredictions = selectedRisk
    ? predictions.filter(p => p.riskFactors.some(rf => rf.type === selectedRisk))
    : predictions;

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
    <div className="flex flex-col gap-6 p-4">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 rounded-lg bg-primary/20">
            <Zap className="text-primary" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Predictive Intelligence</h1>
            <p className="text-sm text-muted-foreground">AI-powered delivery delay predictions</p>
          </div>
        </div>
      </div>

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={20} className="text-primary" />
              <span className="text-sm text-muted-foreground">Orders Analyzed</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{analytics.totalOrdersAnalyzed}</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={20} className="text-orange-500" />
              <span className="text-sm text-muted-foreground">High Risk</span>
            </div>
            <div className="text-2xl font-bold text-orange-500">{analytics.highRiskOrders}</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={20} className="text-blue-500" />
              <span className="text-sm text-muted-foreground">Avg Risk</span>
            </div>
            <div className="text-2xl font-bold text-blue-500">
              {analytics.averageDelayProbability.toFixed(1)}%
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={20} className="text-green-500" />
              <span className="text-sm text-muted-foreground">Confidence</span>
            </div>
            <div className="text-2xl font-bold text-green-500">High</div>
          </Card>
        </div>
      )}

      {/* Risk Filter */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Risk Factors</h3>
          <Button variant="outline" size="sm" onClick={loadPredictiveData}>
            Refresh
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedRisk === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedRisk(null)}
          >
            All Risks
          </Button>
          {['weather', 'traffic', 'carrier', 'location', 'seasonal'].map(risk => (
            <Button
              key={risk}
              variant={selectedRisk === risk ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRisk(risk)}
              className="capitalize"
            >
              {risk}
            </Button>
          ))}
        </div>
      </Card>

      {/* Predictions List */}
      <div className="space-y-4">
        {filteredPredictions.map((prediction) => (
          <Card key={prediction.orderId} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground">{prediction.orderId}</span>
                  <Badge variant="outline">{prediction.currentStatus}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Predicted: {new Date(prediction.predictedDeliveryDate).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${getDelayColor(prediction.delayProbability)}`}>
                  {prediction.delayProbability.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">Delay Risk</div>
              </div>
            </div>

            {/* Risk Factors */}
            <div className="flex gap-2 flex-wrap mb-3">
              {prediction.riskFactors.map((risk, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getRiskColor(risk.severity)}`}
                >
                  {getRiskIcon(risk.type)}
                  <span className="capitalize">{risk.type}</span>
                </div>
              ))}
            </div>

            {/* Progress Bars */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Delay Probability</span>
                  <span className={getDelayColor(prediction.delayProbability)}>
                    {prediction.delayProbability.toFixed(0)}%
                  </span>
                </div>
                <Progress value={prediction.delayProbability} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className={getConfidenceColor(prediction.confidence)}>
                    {prediction.confidence.toFixed(0)}%
                  </span>
                </div>
                <Progress value={prediction.confidence} className="h-2" />
              </div>
            </div>

            {/* Recommendations */}
            <div className="border-t pt-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-primary" />
                <span className="text-sm font-medium text-foreground">Recommendations</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                {prediction.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>

      {filteredPredictions.length === 0 && (
        <Card className="p-8 text-center">
          <Shield size={48} className="text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {selectedRisk ? `No orders with ${selectedRisk} risk factors found` : 'No active orders to analyze'}
          </p>
        </Card>
      )}
    </div>
  );
}
