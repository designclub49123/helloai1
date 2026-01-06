import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Package, 
  Truck, 
  MapPin, 
  Phone, 
  Star, 
  Clock,
  CheckCircle,
  Circle,
  AlertCircle,
  Navigation,
  User,
  MessageCircle,
  RefreshCw,
  Bell,
  Home,
  ShoppingCart,
  Box,
  Send,
  ChevronDown,
  ChevronUp,
  UserCheck,
  PackageCheck,
  Warehouse,
  Route,
  Calendar,
  FileText
} from 'lucide-react';
import { orderTrackingService, TrackingInfo, TrackingStage, DeliveryPerson } from '@/services/orderTrackingService';
import { supabase } from '@/integrations/supabase/client';

interface OrderTrackingProps {
  orderId?: string;
}

export function OrderTracking({ orderId: propOrderId }: OrderTrackingProps) {
  const [orderId, setOrderId] = useState(propOrderId || '');
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [activeTab, setActiveTab] = useState<'tracking' | 'details' | 'notifications'>('tracking');
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [stageDetails, setStageDetails] = useState<Record<string, any>>({});

  useEffect(() => {
    if (orderId) {
      loadTrackingInfo(orderId);
    }
  }, [orderId]);

  useEffect(() => {
    if (trackingInfo) {
      // Subscribe to real-time updates
      orderTrackingService.subscribeToTrackingUpdates(orderId, (updatedTracking) => {
        setTrackingInfo(updatedTracking);
      });

      return () => {
        orderTrackingService.unsubscribeFromTrackingUpdates(orderId, (updatedTracking) => {
          setTrackingInfo(updatedTracking);
        });
      };
    }
  }, [orderId, trackingInfo]);

  const loadTrackingInfo = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const info = await orderTrackingService.getTrackingInfo(id);
      setTrackingInfo(info);
    } catch (err) {
      setError('Order not found. Please check your order ID and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchInput.trim()) {
      setOrderId(searchInput.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleStageExpansion = async (stageId: string) => {
    setExpandedStages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stageId)) {
        newSet.delete(stageId);
      } else {
        newSet.add(stageId);
        // Load stage details when expanding
        loadStageDetails(stageId);
      }
      return newSet;
    });
  };

  const loadStageDetails = async (stageId: string) => {
    if (!trackingInfo || stageDetails[stageId]) return; // Already loaded

    try {
      // Fetch real order data from database
      const { data: orderData, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_id', trackingInfo.orderId)
        .single();

      if (error || !orderData) {
        // Fallback to basic details if no data found
        setStageDetails(prev => ({
          ...prev,
          [stageId]: {
            handler: 'System',
            handlerRole: 'Processing',
            location: 'Facility',
            method: 'Standard Process',
            reference: trackingInfo.orderId,
            notes: 'Processing in progress',
            nextStep: 'Moving to next stage'
          }
        }));
        return;
      }

      // Return real data based on stage and order information
      const realDetails = {
        'order_placed': {
          handler: orderData.customer_name || 'Customer',
          handlerRole: 'Order Initiator',
          location: orderData.customer_city || 'Online',
          method: 'Web Application',
          reference: `Order #${trackingInfo.orderId}`,
          notes: `Order for ${orderData.product_name} placed successfully. Amount: ₹${orderData.total_amount}`,
          nextStep: 'Order confirmation will be sent via email and SMS'
        },
        'order_confirmed': {
          handler: 'Verification Team',
          handlerRole: 'Order Processing',
          location: orderData.seller_name || 'Processing Center',
          method: 'Automated Verification',
          reference: `Confirmation #${trackingInfo.orderId}-CONF`,
          notes: `Order verified and confirmed. Product: ${orderData.product_name} (${orderData.product_brand})`,
          nextStep: 'Order will be sent to packing department'
        },
        'order_packed': {
          handler: 'Packing Team',
          handlerRole: 'Quality Assurance',
          location: orderData.seller_name || 'Warehouse - Packing Section',
          method: 'Manual Packing',
          reference: `Package #${trackingInfo.orderId}-PKG`,
          notes: `${orderData.product_name} (${orderData.product_category}) carefully packed with quality check`,
          nextStep: 'Package ready for shipment'
        },
        'shipped': {
          handler: orderData.carrier_name || 'Shipping Department',
          handlerRole: 'Logistics Coordinator',
          location: orderData.current_location || 'Main Warehouse',
          method: orderData.carrier_name || 'Standard Shipping',
          reference: orderData.tracking_number || `Shipment #${trackingInfo.orderId}-SHP`,
          notes: `Package handed over to ${orderData.carrier_name || 'shipping carrier'}. Tracking: ${orderData.tracking_number || 'N/A'}`,
          nextStep: 'Package will be delivered to delivery partner'
        },
        'out_for_delivery': {
          handler: trackingInfo?.deliveryPerson?.name || 'Delivery Partner',
          handlerRole: 'Delivery Executive',
          location: trackingInfo?.deliveryPerson?.currentLocation?.address || orderData.customer_address || 'In Transit',
          method: trackingInfo?.deliveryPerson?.vehicle || 'Delivery Vehicle',
          reference: trackingInfo?.trackingNumber || orderData.tracking_number || `Delivery #${trackingInfo.orderId}-DEL`,
          notes: `Package for ${orderData.customer_name} is out for delivery. Address: ${orderData.customer_address}`,
          nextStep: 'Package will be delivered to your address'
        },
        'delivered': {
          handler: trackingInfo?.deliveryPerson?.name || 'Delivery Partner',
          handlerRole: 'Delivery Executive',
          location: orderData.customer_address || 'Your Address',
          method: 'Hand Delivery',
          reference: `Delivery Confirmation #${trackingInfo.orderId}-DELV`,
          notes: `${orderData.product_name} successfully delivered to ${orderData.customer_name} at ${orderData.customer_address}`,
          nextStep: 'Please rate your delivery experience'
        }
      };

      const details = realDetails[stageId as keyof typeof realDetails] || {
        handler: 'System',
        handlerRole: 'Processing',
        location: orderData.customer_city || 'Facility',
        method: 'Standard Process',
        reference: trackingInfo.orderId,
        notes: 'Processing in progress',
        nextStep: 'Moving to next stage'
      };

      setStageDetails(prev => ({
        ...prev,
        [stageId]: details
      }));
    } catch (error) {
      console.error('Error fetching stage details:', error);
      setStageDetails(prev => ({
        ...prev,
        [stageId]: {
          handler: 'System',
          handlerRole: 'Processing',
          location: 'Facility',
          method: 'Standard Process',
          reference: trackingInfo?.orderId || 'Unknown',
          notes: 'Error loading details',
          nextStep: 'Moving to next stage'
        }
      }));
    }
  };

  const getStageIcon = (stageId: string) => {
    const icons: Record<string, any> = {
      'order_placed': ShoppingCart,
      'order_confirmed': CheckCircle,
      'order_packed': Package,
      'shipped': Truck,
      'out_for_delivery': Send,
      'delivered': Home
    };
    return icons[stageId] || Package;
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Pending';
    return new Date(timestamp).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateProgress = (current: number, total: number) => {
    return ((current / total) * 100);
  };

  if (!orderId) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-primary" />
            <CardTitle className="text-2xl">Track Your Order</CardTitle>
            <CardDescription>
              Enter your order ID to track your package in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Order ID (e.g., OD20240115001)"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button onClick={handleSearch} disabled={!searchInput.trim()}>
                  Track Order
                </Button>
              </div>
              <div className="text-center text-sm text-muted-foreground">
                Example: OD20240115001, OD20240115002
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Tracking your order...</p>
        </div>
      </div>
    );
  }

  if (error || !trackingInfo) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-semibold mb-2">Order Not Found</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => setOrderId('')} variant="outline">
              Track Another Order
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Order Tracking</h1>
          <p className="text-muted-foreground">Order ID: {trackingInfo.orderId}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loadTrackingInfo(orderId)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setOrderId('')} variant="outline">
            Track Another
          </Button>
        </div>
      </div>

      {/* Order Status Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                {trackingInfo.currentStage}/{trackingInfo.totalStages}
              </div>
              <div className="text-sm text-muted-foreground">Stage Progress</div>
              <Progress value={calculateProgress(trackingInfo.currentStage, trackingInfo.totalStages)} className="mt-2" />
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {trackingInfo.orderStatus.charAt(0).toUpperCase() + trackingInfo.orderStatus.slice(1)}
              </div>
              <div className="text-sm text-muted-foreground">Current Status</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {trackingInfo.trackingNumber}
              </div>
              <div className="text-sm text-muted-foreground">Tracking Number</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <Button
          variant={activeTab === 'tracking' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('tracking')}
          className="flex-1"
        >
          Tracking
        </Button>
        <Button
          variant={activeTab === 'details' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('details')}
          className="flex-1"
        >
          Details
        </Button>
        <Button
          variant={activeTab === 'notifications' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('notifications')}
          className="flex-1 relative"
        >
          Notifications
          {trackingInfo.notifications.filter(n => !n.read).length > 0 && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
          )}
        </Button>
      </div>

      {/* Tracking Tab */}
      {activeTab === 'tracking' && (
        <div className="space-y-6">
          {/* Tracking Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Order Journey</CardTitle>
              <CardDescription>Track your order's progress in real-time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {trackingInfo.stages.map((stage, index) => {
                  const Icon = getStageIcon(stage.id);
                  const isActive = stage.status === 'in_progress';
                  const isCompleted = stage.status === 'completed';
                  const isPending = stage.status === 'pending';
                  const isExpanded = expandedStages.has(stage.id);
                  const currentStageDetails = stageDetails[stage.id] || {
                    handler: 'Loading...',
                    handlerRole: 'Loading...',
                    location: 'Loading...',
                    method: 'Loading...',
                    reference: 'Loading...',
                    notes: 'Loading details...',
                    nextStep: 'Loading...'
                  };

                  return (
                    <div key={stage.id} className="space-y-4">
                      <Collapsible open={isExpanded} onOpenChange={() => toggleStageExpansion(stage.id)}>
                        <CollapsibleTrigger asChild>
                          <div className="flex items-start space-x-4 cursor-pointer hover:bg-muted/50 p-3 rounded-lg transition-colors">
                            <div className="flex flex-col items-center">
                              <div className={`
                                w-12 h-12 rounded-full flex items-center justify-center
                                ${isCompleted ? 'bg-green-100 text-green-600' : 
                                  isActive ? 'bg-blue-100 text-blue-600' : 
                                  'bg-gray-100 text-gray-400'}
                              `}>
                                <Icon className="h-6 w-6" />
                              </div>
                              {index < trackingInfo.stages.length - 1 && (
                                <div className={`
                                  w-0.5 h-16 mt-2
                                  ${isCompleted ? 'bg-green-200' : 'bg-gray-200'}
                                `} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className={`font-semibold ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                                  {stage.name}
                                </h3>
                                <div className="flex items-center gap-2">
                                  <Badge variant={isCompleted ? 'default' : isActive ? 'secondary' : 'outline'}>
                                    {stage.status}
                                  </Badge>
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{stage.description}</p>
                              {stage.details && (
                                <p className="text-sm mb-2">{stage.details}</p>
                              )}
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{formatTimestamp(stage.timestamp)}</span>
                                {stage.location && (
                                  <span className="flex items-center">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {stage.location}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="ml-16 space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
                            {/* Handler Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                  <UserCheck className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Handled By</p>
                                  <p className="text-sm text-muted-foreground">{currentStageDetails.handler}</p>
                                  <p className="text-xs text-muted-foreground">{currentStageDetails.handlerRole}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                  <MapPin className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Location</p>
                                  <p className="text-sm text-muted-foreground">{currentStageDetails.location}</p>
                                </div>
                              </div>

                              <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                  <Package className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Processing Method</p>
                                  <p className="text-sm text-muted-foreground">{currentStageDetails.method}</p>
                                </div>
                              </div>

                              <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                  <FileText className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Reference</p>
                                  <p className="text-sm text-muted-foreground">{currentStageDetails.reference}</p>
                                </div>
                              </div>
                            </div>

                            {/* Additional Details */}
                            <div className="space-y-3">
                              <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-blue-10 rounded-full flex items-center justify-center">
                                  <AlertCircle className="h-4 w-4 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">Status Notes</p>
                                  <p className="text-sm text-muted-foreground">{currentStageDetails.notes}</p>
                                </div>
                              </div>

                              <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-green-10 rounded-full flex items-center justify-center">
                                  <Route className="h-4 w-4 text-green-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">Next Step</p>
                                  <p className="text-sm text-muted-foreground">{currentStageDetails.nextStep}</p>
                                </div>
                              </div>
                            </div>

                            {/* Timestamp Details */}
                            {stage.timestamp && (
                              <div className="flex items-center space-x-3 pt-3 border-t border-border">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Completed At</p>
                                  <p className="text-sm">{new Date(stage.timestamp).toLocaleString('en-IN', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}</p>
                                </div>
                              </div>
                            )}

                            {/* Special details for specific stages */}
                            {stage.id === 'out_for_delivery' && trackingInfo.deliveryPerson && (
                              <div className="pt-3 border-t border-border">
                                <p className="text-sm font-medium mb-2">Delivery Partner Details</p>
                                <div className="bg-background p-3 rounded-lg border border-border">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                        <User className="h-5 w-5 text-primary" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium">{trackingInfo.deliveryPerson.name}</p>
                                        <p className="text-xs text-muted-foreground">{trackingInfo.deliveryPerson.vehicle} - {trackingInfo.deliveryPerson.vehicleNumber}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <div className="flex items-center">
                                        <Star className="h-3 w-3 text-yellow-500 mr-1" />
                                        <span className="text-xs">{trackingInfo.deliveryPerson.rating}</span>
                                      </div>
                                      <Button size="sm" variant="outline">
                                        <Phone className="h-3 w-3 mr-1" />
                                        Call
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {stage.id === 'delivered' && (
                              <div className="pt-3 border-t border-border">
                                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                  <p className="text-sm font-medium text-green-900 mb-1">Delivery Confirmed! 🎉</p>
                                  <p className="text-sm text-green-700">Your package has been successfully delivered. Thank you for choosing our service!</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Real-time Location */}
          {trackingInfo.realTimeLocation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-5 w-5" />
                  Real-time Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Current Location</p>
                      <p className="text-sm text-muted-foreground">{trackingInfo.realTimeLocation.address}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Last Updated</p>
                      <p className="text-sm">{formatTimestamp(trackingInfo.realTimeLocation.lastUpdated)}</p>
                    </div>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="text-center text-sm text-muted-foreground">
                      <MapPin className="h-8 w-8 mx-auto mb-2" />
                      Live tracking map would be displayed here
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delivery Person Info */}
          {trackingInfo.deliveryPerson && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Delivery Partner
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{trackingInfo.deliveryPerson.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Star className="h-4 w-4 mr-1 text-yellow-500" />
                          {trackingInfo.deliveryPerson.rating}
                        </span>
                        <span>{trackingInfo.deliveryPerson.vehicle}</span>
                        <span>{trackingInfo.deliveryPerson.vehicleNumber}</span>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <Button className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Call Delivery Partner
                    </Button>
                    <Button variant="outline" className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Send Message
                    </Button>
                  </div>
                  {trackingInfo.deliveryPerson.estimatedArrival && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-blue-900">
                        Estimated Arrival: {formatTimestamp(trackingInfo.deliveryPerson.estimatedArrival)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Details Tab */}
      {activeTab === 'details' && (
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order ID</p>
                  <p className="font-medium">{trackingInfo.orderId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tracking Number</p>
                  <p className="font-medium">{trackingInfo.trackingNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Carrier</p>
                  <p className="font-medium">{trackingInfo.carrier}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Status</p>
                  <p className="font-medium">{trackingInfo.orderStatus}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                  <p className="font-medium">{formatTimestamp(trackingInfo.estimatedDelivery)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Actual Delivery</p>
                  <p className="font-medium">
                    {trackingInfo.actualDelivery ? formatTimestamp(trackingInfo.actualDelivery) : 'Pending'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trackingInfo.notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                trackingInfo.notifications.map((notification) => (
                  <div key={notification.id} className={`p-4 rounded-lg border ${notification.read ? 'bg-muted' : 'bg-blue-50 border-blue-200'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatTimestamp(notification.timestamp)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
