import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Camera, 
  Upload, 
  Scan, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  FileText,
  Search,
  Eye,
  Download,
  RefreshCw,
  Zap,
  Target,
  Image as ImageIcon
} from 'lucide-react';
import { visualRecognitionService, RecognitionResult } from '@/services/visualRecognitionService';

export function VisualRecognition() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setResult(null);
    }
  };

  const handleCameraCapture = async () => {
    try {
      const file = await visualRecognitionService.captureFromCamera();
      handleFileSelect(file);
    } catch (error) {
      console.error('Camera capture failed:', error);
    }
  };

  const handleGalleryUpload = async () => {
    try {
      const file = await visualRecognitionService.uploadFromGallery();
      handleFileSelect(file);
    } catch (error) {
      console.error('File upload failed:', error);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const processImage = async () => {
    if (!selectedFile) return;
    
    setProcessing(true);
    try {
      const recognitionResult = await visualRecognitionService.processImage(selectedFile);
      setResult(recognitionResult);
    } catch (error) {
      console.error('Processing failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatProcessingTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Scan className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Visual Order Recognition</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Revolutionary AI-powered order recognition. Simply upload or capture an image of your receipt, invoice, or order document to instantly extract and match order information.
        </p>
      </div>

      {/* Upload Area */}
      {!selectedFile && (
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-primary" />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold">Upload Order Image</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Drag and drop or choose from options below
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={handleCameraCapture} className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Take Photo
                  </Button>
                  <Button onClick={handleGalleryUpload} variant="outline" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Choose from Gallery
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  Supported formats: JPEG, PNG, WebP (Max 10MB)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Preview and Processing */}
      {selectedFile && (
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Image Preview
                  </CardTitle>
                  <CardDescription>
                    {selectedFile.name} • {formatFileSize(selectedFile.size)}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={processImage} disabled={processing} className="flex items-center gap-2">
                    {processing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        Analyze Image
                      </>
                    )}
                  </Button>
                  <Button onClick={reset} variant="outline">
                    Reset
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <img 
                    src={imagePreview || ''} 
                    alt="Preview" 
                    className="w-full h-auto rounded-lg border"
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Image Analysis</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Quality Score:</span>
                        <span className="font-medium">
                          {result ? `${(result.imageAnalysis.qualityScore * 100).toFixed(0)}%` : 'Pending'}
                        </span>
                      </div>
                      {result && (
                        <>
                          <div className="flex justify-between">
                            <span>Brightness:</span>
                            <span className="font-medium">
                              {(result.imageAnalysis.brightness * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Contrast:</span>
                            <span className="font-medium">
                              {(result.imageAnalysis.contrast * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Processing Time:</span>
                            <span className="font-medium">
                              {formatProcessingTime(result.processingTime)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {result && (
                    <div>
                      <h4 className="font-medium mb-2">Detected Elements</h4>
                      <div className="flex flex-wrap gap-1">
                        {result.imageAnalysis.detectedElements.map((element, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {element}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.success ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Recognition Results
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      Recognition Failed
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  Confidence: {(result.extractedData.confidence * 100).toFixed(0)}%
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="extracted" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="extracted">Extracted Data</TabsTrigger>
                    <TabsTrigger value="raw">Raw Text</TabsTrigger>
                    <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                    {result.extractedData.matchedOrder && (
                      <TabsTrigger value="matched">Matched Order</TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="extracted" className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <h4 className="font-medium">Order Information</h4>
                        {result.extractedData.orderId && (
                          <div className="flex justify-between text-sm">
                            <span>Order ID:</span>
                            <span className="font-mono">{result.extractedData.orderId}</span>
                          </div>
                        )}
                        {result.extractedData.orderDate && (
                          <div className="flex justify-between text-sm">
                            <span>Order Date:</span>
                            <span>{result.extractedData.orderDate}</span>
                          </div>
                        )}
                        {result.extractedData.orderStatus && (
                          <div className="flex justify-between text-sm">
                            <span>Status:</span>
                            <Badge variant="outline">{result.extractedData.orderStatus}</Badge>
                          </div>
                        )}
                        {result.extractedData.trackingNumber && (
                          <div className="flex justify-between text-sm">
                            <span>Tracking:</span>
                            <span className="font-mono">{result.extractedData.trackingNumber}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-medium">Customer Information</h4>
                        {result.extractedData.customerName && (
                          <div className="flex justify-between text-sm">
                            <span>Name:</span>
                            <span>{result.extractedData.customerName}</span>
                          </div>
                        )}
                        {result.extractedData.customerEmail && (
                          <div className="flex justify-between text-sm">
                            <span>Email:</span>
                            <span className="text-blue-600">{result.extractedData.customerEmail}</span>
                          </div>
                        )}
                        {result.extractedData.customerPhone && (
                          <div className="flex justify-between text-sm">
                            <span>Phone:</span>
                            <span>{result.extractedData.customerPhone}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-medium">Product Information</h4>
                        {result.extractedData.productName && (
                          <div className="flex justify-between text-sm">
                            <span>Product:</span>
                            <span>{result.extractedData.productName}</span>
                          </div>
                        )}
                        {result.extractedData.productCategory && (
                          <div className="flex justify-between text-sm">
                            <span>Category:</span>
                            <span>{result.extractedData.productCategory}</span>
                          </div>
                        )}
                        {result.extractedData.productBrand && (
                          <div className="flex justify-between text-sm">
                            <span>Brand:</span>
                            <span>{result.extractedData.productBrand}</span>
                          </div>
                        )}
                        {result.extractedData.productPrice && (
                          <div className="flex justify-between text-sm">
                            <span>Price:</span>
                            <span>${result.extractedData.productPrice.toFixed(2)}</span>
                          </div>
                        )}
                        {result.extractedData.quantity && (
                          <div className="flex justify-between text-sm">
                            <span>Quantity:</span>
                            <span>{result.extractedData.quantity}</span>
                          </div>
                        )}
                        {result.extractedData.totalAmount && (
                          <div className="flex justify-between text-sm font-medium">
                            <span>Total:</span>
                            <span>${result.extractedData.totalAmount.toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-medium">Confidence Analysis</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Overall Confidence</span>
                            <span>{(result.extractedData.confidence * 100).toFixed(0)}%</span>
                          </div>
                          <Progress value={result.extractedData.confidence * 100} />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="raw">
                    <div className="bg-muted p-4 rounded-lg">
                      <pre className="text-sm whitespace-pre-wrap font-mono">
                        {result.extractedData.extractedText}
                      </pre>
                    </div>
                  </TabsContent>

                  <TabsContent value="suggestions">
                    <div className="space-y-3">
                      {result.suggestions.map((suggestion, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                          <p className="text-sm">{suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {result.extractedData.matchedOrder && (
                    <TabsContent value="matched">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Order Matched Successfully
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-medium mb-2">Order Details</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span>Order ID:</span>
                                    <span className="font-mono">{result.extractedData.matchedOrder.order_id}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Status:</span>
                                    <Badge>{result.extractedData.matchedOrder.order_status}</Badge>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Total Amount:</span>
                                    <span>${result.extractedData.matchedOrder.total_amount}</span>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">Actions</h4>
                                <div className="space-y-2">
                                  <Button className="w-full" size="sm">
                                    <Search className="h-4 w-4 mr-2" />
                                    View Full Order Details
                                  </Button>
                                  <Button variant="outline" className="w-full" size="sm">
                                    <FileText className="h-4 w-4 mr-2" />
                                    Download Order Summary
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
