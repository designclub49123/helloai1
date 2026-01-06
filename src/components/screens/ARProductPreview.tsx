import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Camera, 
  Box, 
  Palette, 
  Ruler, 
  Maximize2, 
  Share2, 
  Download,
  RotateCw,
  Move3d,
  Eye,
  Smartphone,
  Tablet,
  Monitor,
  Sparkles,
  Zap,
  Target,
  Layers,
  Settings,
  CheckCircle
} from 'lucide-react';
import { arProductPreviewService, ARProduct, ARPreviewSession } from '@/services/arProductPreviewService';

export function ARProductPreview() {
  const [isARSupported, setIsARSupported] = useState(false);
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ARProduct | null>(null);
  const [selectedColor, setSelectedColor] = useState('Black');
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [deviceType, setDeviceType] = useState<'phone' | 'tablet' | 'desktop'>('phone');
  const [arMode, setArMode] = useState<'camera' | 'webxr'>('camera');
  const [isLoading, setIsLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [arFeatures, setArFeatures] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const arContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check AR support
    const supported = arProductPreviewService.isARSupported();
    setIsARSupported(supported);
    
    // Get supported features
    const features = arProductPreviewService.getSupportedFeatures();
    setArFeatures(features);
    
    // Detect device type
    detectDeviceType();
    
    // Load sample product
    loadSampleProduct();
  }, []);

  const detectDeviceType = () => {
    const width = window.innerWidth;
    if (width < 768) setDeviceType('phone');
    else if (width < 1024) setDeviceType('tablet');
    else setDeviceType('desktop');
  };

  const loadSampleProduct = async () => {
    const sampleProduct: ARProduct = {
      id: 'iphone-15-pro',
      name: 'iPhone 15 Pro',
      category: 'Smartphones',
      brand: 'Apple',
      price: 89999,
      images: ['/iphone-15-pro-front.jpg', '/iphone-15-pro-back.jpg'],
      dimensions: {
        width: 7.6,
        height: 15.0,
        depth: 0.8,
        weight: 0.221
      },
      colors: ['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium'],
      materials: ['Titanium', 'Ceramic Shield', 'Glass'],
      features: ['A17 Pro chip', 'Pro camera system', 'USB-C', 'Dynamic Island'],
      arModel: '/models/iphone-15-pro.glb'
    };
    
    setSelectedProduct(sampleProduct);
  };

  const startARPreview = async () => {
    if (!selectedProduct || !arContainerRef.current) return;
    
    setIsLoading(true);
    try {
      await arProductPreviewService.initializeARPreview(selectedProduct.id, arContainerRef.current);
      setIsPreviewActive(true);
      
      // Start camera if using camera mode
      if (arMode === 'camera') {
        await startCamera();
      }
    } catch (error) {
      console.error('Error starting AR preview:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const stopARPreview = () => {
    arProductPreviewService.endPreviewSession();
    setIsPreviewActive(false);
    
    // Stop camera
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const changeProductColor = (color: string) => {
    setSelectedColor(color);
    // This would update the AR model color
    console.log('Changing product color to:', color);
  };

  const startMeasurement = () => {
    setIsMeasuring(true);
    arProductPreviewService.startMeasurement();
  };

  const resetView = () => {
    arProductPreviewService.resetView();
    setMeasurements([]);
  };

  const capturePhoto = async () => {
    try {
      const imageData = await arProductPreviewService.capturePhoto();
      setCapturedImage(imageData);
    } catch (error) {
      console.error('Error capturing photo:', error);
    }
  };

  const shareARExperience = async () => {
    try {
      await arProductPreviewService.shareARExperience();
    } catch (error) {
      console.error('Error sharing AR experience:', error);
    }
  };

  const getColorHex = (colorName: string): string => {
    const colors: Record<string, string> = {
      'Natural Titanium': '#F2F2F2',
      'Blue Titanium': '#507F9F',
      'White Titanium': '#F3F3F3',
      'Black Titanium': '#1C1C1E'
    };
    return colors[colorName] || '#888888';
  };

  if (!isARSupported) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-4 flex items-center justify-center">
        <Card className="bg-black/20 border-red-500/30 backdrop-blur-sm max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">AR Not Supported</h3>
            <p className="text-red-300 mb-4">
              Your device or browser doesn't support AR features. Please try using a modern mobile device.
            </p>
            <Button variant="outline" className="border-red-500/30 text-red-300">
              Learn More
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-black/20 border-blue-500/30 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="relative">
                <Box className="w-12 h-12 text-blue-400" />
                <Sparkles className="w-6 h-6 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold text-white">AR Product Preview</CardTitle>
                <CardDescription className="text-blue-200">
                  See products in your real world with augmented reality
                </CardDescription>
              </div>
            </div>
            
            {/* AR Features */}
            <div className="flex items-center justify-center space-x-4 text-sm">
              <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30">
                <Eye className="w-3 h-3 mr-1" />
                AR Supported
              </Badge>
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                {deviceType === 'phone' && <Smartphone className="w-3 h-3 mr-1" />}
                {deviceType === 'tablet' && <Tablet className="w-3 h-3 mr-1" />}
                {deviceType === 'desktop' && <Monitor className="w-3 h-3 mr-1" />}
                {deviceType.charAt(0).toUpperCase() + deviceType.slice(1)} Device
              </Badge>
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                <Layers className="w-3 h-3 mr-1" />
                {arFeatures.length} Features
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Main AR Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AR View */}
          <div className="lg:col-span-2">
            <Card className="bg-black/20 border-blue-500/30 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">AR View</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => setArMode(arMode === 'camera' ? 'webxr' : 'camera')}
                      variant="outline"
                      size="sm"
                      className="border-blue-500/30 text-blue-300"
                    >
                      {arMode === 'camera' ? <Camera className="w-4 h-4" /> : <Box className="w-4 h-4" />}
                      {arMode === 'camera' ? 'Camera' : 'WebXR'}
                    </Button>
                    <Button
                      onClick={() => setShowSettings(!showSettings)}
                      variant="outline"
                      size="sm"
                      className="border-blue-500/30 text-blue-300"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* AR Container */}
                <div
                  ref={arContainerRef}
                  className="relative w-full h-96 bg-black/30 rounded-lg border border-blue-500/20 overflow-hidden"
                >
                  {!isPreviewActive ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Move3d className="w-12 h-12 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Ready for AR</h3>
                        <p className="text-blue-300 mb-4">
                          Click "Start AR Preview" to see {selectedProduct?.name} in your space
                        </p>
                        <Button
                          onClick={startARPreview}
                          disabled={isLoading}
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          {isLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                              Loading AR...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-2" />
                              Start AR Preview
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-full h-full">
                      {/* Camera/AR View */}
                      {arMode === 'camera' && (
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                      
                      {/* AR Overlay */}
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-4 left-4 bg-black/50 rounded-lg p-2">
                          <p className="text-white text-sm">AR Active</p>
                        </div>
                        
                        {/* Placement Indicator */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <div className="w-16 h-16 border-4 border-blue-400 rounded-full animate-pulse" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Target className="w-8 h-8 text-blue-400" />
                          </div>
                        </div>
                      </div>
                      
                      {/* AR Controls */}
                      <div className="absolute bottom-4 left-4 right-4 flex justify-center space-x-2 pointer-events-auto">
                        <Button
                          onClick={capturePhoto}
                          variant="outline"
                          size="sm"
                          className="bg-black/50 border-blue-500/30 text-blue-300"
                        >
                          <Camera className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={startMeasurement}
                          variant={isMeasuring ? "default" : "outline"}
                          size="sm"
                          className={isMeasuring ? "bg-green-500 text-white" : "bg-black/50 border-blue-500/30 text-blue-300"}
                        >
                          <Ruler className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={resetView}
                          variant="outline"
                          size="sm"
                          className="bg-black/50 border-blue-500/30 text-blue-300"
                        >
                          <RotateCw className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={shareARExperience}
                          variant="outline"
                          size="sm"
                          className="bg-black/50 border-blue-500/30 text-blue-300"
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={stopARPreview}
                          variant="outline"
                          size="sm"
                          className="bg-red-500/20 border-red-500/30 text-red-300"
                        >
                          Stop AR
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Captured Image */}
                {capturedImage && (
                  <div className="mt-4">
                    <h4 className="text-white font-semibold mb-2">Captured AR Photo</h4>
                    <img src={capturedImage} alt="AR Capture" className="w-full rounded-lg" />
                    <div className="flex space-x-2 mt-2">
                      <Button variant="outline" size="sm" className="border-blue-500/30 text-blue-300">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button variant="outline" size="sm" className="border-blue-500/30 text-blue-300">
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Product Info & Controls */}
          <div className="space-y-6">
            {/* Product Info */}
            <Card className="bg-black/20 border-blue-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Product Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedProduct && (
                  <>
                    <div>
                      <h3 className="text-xl font-bold text-white">{selectedProduct.name}</h3>
                      <p className="text-blue-300">{selectedProduct.brand} • {selectedProduct.category}</p>
                      <p className="text-2xl font-bold text-green-400 mt-2">₹{selectedProduct.price.toLocaleString()}</p>
                    </div>

                    <Separator className="bg-blue-500/20" />

                    <div>
                      <h4 className="text-white font-semibold mb-2">Dimensions</h4>
                      <div className="space-y-1 text-sm text-blue-300">
                        <p>Width: {selectedProduct.dimensions.width} cm</p>
                        <p>Height: {selectedProduct.dimensions.height} cm</p>
                        <p>Depth: {selectedProduct.dimensions.depth} cm</p>
                        <p>Weight: {selectedProduct.dimensions.weight} kg</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold mb-2">Features</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedProduct.features.map((feature, index) => (
                          <Badge key={index} variant="secondary" className="bg-blue-500/10 text-blue-300 text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Color Selection */}
            <Card className="bg-black/20 border-blue-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Palette className="w-5 h-5 mr-2" />
                  Color Options
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedProduct?.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => changeProductColor(color)}
                      className={`w-full p-3 rounded-lg border transition-all duration-200 flex items-center space-x-3 ${
                        selectedColor === color
                          ? 'bg-blue-500/20 border-blue-500/50'
                          : 'bg-black/30 border-blue-500/20 hover:bg-blue-500/10'
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white/20"
                        style={{ backgroundColor: getColorHex(color) }}
                      />
                      <span className="text-white">{color}</span>
                      {selectedColor === color && (
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AR Features */}
            <Card className="bg-black/20 border-blue-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Sparkles className="w-5 h-5 mr-2" />
                  AR Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {arFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-white text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Measurements */}
            {measurements.length > 0 && (
              <Card className="bg-black/20 border-blue-500/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Ruler className="w-5 h-5 mr-2" />
                    Measurements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {measurements.map((measurement, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-blue-300">{measurement.dimension}</span>
                        <span className="text-white">{measurement.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
