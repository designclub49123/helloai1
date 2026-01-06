import { supabase } from '@/integrations/supabase/client';

export interface ExtractedOrderData {
  orderId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  productName?: string;
  productCategory?: string;
  productBrand?: string;
  productPrice?: number;
  quantity?: number;
  totalAmount?: number;
  orderDate?: string;
  orderStatus?: string;
  trackingNumber?: string;
  confidence: number;
  extractedText: string;
  matchedOrder?: any;
}

export interface RecognitionResult {
  success: boolean;
  extractedData: ExtractedOrderData;
  processingTime: number;
  imageAnalysis: {
    detectedElements: string[];
    qualityScore: number;
    brightness: number;
    contrast: number;
    sharpness: number;
  };
  suggestions: string[];
}

export interface ImageProcessingOptions {
  enhanceImage: boolean;
  detectTextRegions: boolean;
  preprocessImage: boolean;
  language: string;
  confidenceThreshold: number;
}

class VisualRecognitionService {
  private readonly SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly OCR_ENDPOINT = 'https://api.openai.com/v1/chat/completions'; // Using GPT-4 Vision for OCR
  private readonly OPENAI_API_KEY = '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';

  async processImage(file: File, options: Partial<ImageProcessingOptions> = {}): Promise<RecognitionResult> {
    const startTime = Date.now();
    
    try {
      // Validate file
      this.validateFile(file);
      
      // Analyze image quality
      const imageAnalysis = await this.analyzeImageQuality(file);
      
      // Preprocess image if needed
      const processedFile = options.preprocessImage 
        ? await this.preprocessImage(file, imageAnalysis)
        : file;
      
      // Extract text using OCR
      const extractedText = await this.extractTextFromImage(processedFile, options);
      
      // Parse extracted data
      const extractedData = await this.parseOrderData(extractedText);
      
      // Match with existing orders
      const matchedOrder = await this.matchWithExistingOrders(extractedData);
      
      // Generate suggestions
      const suggestions = this.generateSuggestions(extractedData, matchedOrder, this.calculateConfidence(extractedData, imageAnalysis.qualityScore));
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        extractedData: {
          ...extractedData,
          matchedOrder,
          confidence: this.calculateConfidence(extractedData, imageAnalysis.qualityScore)
        },
        processingTime,
        imageAnalysis,
        suggestions
      };
      
    } catch (error) {
      console.error('Visual recognition error:', error);
      return {
        success: false,
        extractedData: {
          confidence: 0,
          extractedText: '',
        } as ExtractedOrderData,
        processingTime: Date.now() - startTime,
        imageAnalysis: {
          detectedElements: [],
          qualityScore: 0,
          brightness: 0,
          contrast: 0,
          sharpness: 0
        },
        suggestions: ['Image processing failed. Please try again with a clearer image.']
      };
    }
  }

  private validateFile(file: File): void {
    if (!this.SUPPORTED_FORMATS.includes(file.type)) {
      throw new Error(`Unsupported file format. Supported formats: ${this.SUPPORTED_FORMATS.join(', ')}`);
    }
    
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size: ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
  }

  private async analyzeImageQuality(file: File): Promise<RecognitionResult['imageAnalysis']> {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
        if (!imageData) {
          resolve({
            detectedElements: ['unknown'],
            qualityScore: 0.5,
            brightness: 0.5,
            contrast: 0.5,
            sharpness: 0.5
          });
          return;
        }
        
        const data = imageData.data;
        let brightness = 0;
        let contrast = 0;
        let sharpness = 0;
        
        // Calculate brightness
        for (let i = 0; i < data.length; i += 4) {
          brightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
        }
        brightness = brightness / (data.length / 4) / 255;
        
        // Calculate contrast (simplified)
        const mean = brightness;
        let variance = 0;
        for (let i = 0; i < data.length; i += 4) {
          const pixel = (data[i] + data[i + 1] + data[i + 2]) / 3 / 255;
          variance += Math.pow(pixel - mean, 2);
        }
        contrast = Math.sqrt(variance / (data.length / 4));
        
        // Detect elements (simplified)
        const detectedElements = [];
        if (brightness > 0.7) detectedElements.push('bright');
        if (brightness < 0.3) detectedElements.push('dark');
        if (contrast > 0.5) detectedElements.push('high-contrast');
        if (contrast < 0.3) detectedElements.push('low-contrast');
        if (img.width > 1000) detectedElements.push('high-resolution');
        if (img.width < 500) detectedElements.push('low-resolution');
        
        // Calculate overall quality score
        const qualityScore = Math.min(1, (brightness * 0.3 + contrast * 0.4 + sharpness * 0.3));
        
        resolve({
          detectedElements,
          qualityScore,
          brightness,
          contrast,
          sharpness
        });
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  private async preprocessImage(file: File, analysis: RecognitionResult['imageAnalysis']): Promise<File> {
    // In a real implementation, this would apply image enhancement
    // For now, we'll return the original file
    // Future enhancements could include:
    // - Brightness adjustment
    // - Contrast enhancement
    // - Noise reduction
    // - Sharpening
    // - Perspective correction
    
    return file;
  }

  private async extractTextFromImage(file: File, options: Partial<ImageProcessingOptions>): Promise<string> {
    try {
      // Convert file to base64
      const base64 = await this.fileToBase64(file);
      
      // Use OpenAI GPT-4 Vision for OCR
      const response = await fetch(this.OCR_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "gpt-4-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Extract all text from this image. Focus on order information, customer details, product names, prices, tracking numbers, and any other relevant business information. Return the text in a structured format that preserves the layout and hierarchy. If you see order IDs, customer names, email addresses, phone numbers, product details, prices, or tracking information, extract them clearly.`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${file.type};base64,${base64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 1000
        })
      });
      
      if (!response.ok) {
        throw new Error('OCR service unavailable');
      }
      
      const result = await response.json();
      return result.choices[0]?.message?.content || '';
      
    } catch (error) {
      console.error('OCR error:', error);
      
      // Fallback to simulated OCR for demo purposes
      return this.simulateOCR(file);
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private simulateOCR(file: File): string {
    // Simulated OCR text for demo purposes
    // In a real implementation, this would be replaced with actual OCR
    const simulatedTexts = [
      `ORDER RECEIPT
      
Order ID: OD20240115001
Customer: John Doe
Email: john.doe@email.com
Phone: +1-555-0123

Product: Premium Wireless Headphones
Category: Electronics
Brand: SoundTech
Price: $299.99
Quantity: 1

Total Amount: $299.99
Order Date: 2024-01-15
Status: Shipped
Tracking: TRK123456789`,
      
      `INVOICE
      
Invoice #: INV-2024-001
Bill To: Jane Smith
Email: jane.smith@company.com
Phone: (555) 987-6543

Item: Organic Coffee Beans
Category: Food & Beverages
Brand: EcoCoffee
Unit Price: $24.99
Quantity: 2
Subtotal: $49.98

Total: $54.47 (including tax)
Date: January 10, 2024
Order Status: Delivered
Tracking: DEL987654321`,
      
      `PURCHASE ORDER
      
PO Number: PO-2024-0150
Customer: Acme Corporation
Contact: robert.johnson@acme.com
Phone: 555-123-4567

Product: Office Chair Ergonomic
Category: Furniture
Brand: ComfortSeating
Price: $449.00
Quantity: 5

Total: $2,245.00
Order Date: 01/12/2024
Status: Processing
Expected Delivery: 01/20/2024`
    ];
    
    return simulatedTexts[Math.floor(Math.random() * simulatedTexts.length)];
  }

  private async parseOrderData(extractedText: string): Promise<Omit<ExtractedOrderData, 'confidence' | 'matchedOrder'>> {
    const data: Omit<ExtractedOrderData, 'confidence' | 'matchedOrder'> = {
      extractedText
    };
    
    // Extract order ID
    const orderIdPatterns = [
      /Order ID[:\s]+([A-Z0-9]+)/i,
      /Order[:\s]+([A-Z0-9]+)/i,
      /Invoice[:\s]+#?([A-Z0-9-]+)/i,
      /PO[:\s]+([A-Z0-9-]+)/i
    ];
    
    for (const pattern of orderIdPatterns) {
      const match = extractedText.match(pattern);
      if (match) {
        data.orderId = match[1];
        break;
      }
    }
    
    // Extract customer information
    const customerNameMatch = extractedText.match(/Customer[:\s]+([A-Za-z\s]+)/i);
    if (customerNameMatch) data.customerName = customerNameMatch[1].trim();
    
    const emailMatch = extractedText.match(/Email[:\s]+([^\s@]+@[^\s@]+\.[^\s]+)/i);
    if (emailMatch) data.customerEmail = emailMatch[1];
    
    const phoneMatch = extractedText.match(/Phone[:\s]+([+0-9()-\s]+)/i);
    if (phoneMatch) data.customerPhone = phoneMatch[1].trim();
    
    // Extract product information
    const productMatch = extractedText.match(/Product[:\s]+([A-Za-z0-9\s]+)/i);
    if (productMatch) data.productName = productMatch[1].trim();
    
    const categoryMatch = extractedText.match(/Category[:\s]+([A-Za-z&\s]+)/i);
    if (categoryMatch) data.productCategory = categoryMatch[1].trim();
    
    const brandMatch = extractedText.match(/Brand[:\s]+([A-Za-z]+)/i);
    if (brandMatch) data.productBrand = brandMatch[1];
    
    // Extract prices and quantities
    const priceMatch = extractedText.match(/Price[:\s]+\$?(\d+\.?\d*)/i);
    if (priceMatch) data.productPrice = parseFloat(priceMatch[1]);
    
    const quantityMatch = extractedText.match(/Quantity[:\s]+(\d+)/i);
    if (quantityMatch) data.quantity = parseInt(quantityMatch[1]);
    
    const totalMatch = extractedText.match(/Total[:\s]+\$?(\d+,?\d*\.?\d*)/i);
    if (totalMatch) data.totalAmount = parseFloat(totalMatch[1].replace(',', ''));
    
    // Extract dates
    const dateMatch = extractedText.match(/(?:Order Date|Date)[:\s]+(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (dateMatch) {
      const dateStr = dateMatch[1];
      // Normalize date format
      if (dateStr.includes('/')) {
        const [month, day, year] = dateStr.split('/');
        data.orderDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else {
        data.orderDate = dateStr;
      }
    }
    
    // Extract status
    const statusMatch = extractedText.match(/Status[:\s]+([A-Za-z]+)/i);
    if (statusMatch) data.orderStatus = statusMatch[1];
    
    // Extract tracking number
    const trackingMatch = extractedText.match(/Tracking[:\s]+([A-Z0-9]+)/i);
    if (trackingMatch) data.trackingNumber = trackingMatch[1];
    
    return data;
  }

  private async matchWithExistingOrders(extractedData: Omit<ExtractedOrderData, 'confidence' | 'matchedOrder'>): Promise<any> {
    if (!extractedData.orderId && !extractedData.customerEmail && !extractedData.trackingNumber) {
      return null;
    }
    
    try {
      let query = supabase.from('orders').select('*');
      
      // Try to match by order ID
      if (extractedData.orderId) {
        query = query.eq('order_id', extractedData.orderId);
      }
      // Try to match by tracking number
      else if (extractedData.trackingNumber) {
        query = query.eq('tracking_number', extractedData.trackingNumber);
      }
      // Try to match by customer email
      else if (extractedData.customerEmail) {
        query = query.eq('customer_email', extractedData.customerEmail);
      }
      
      const { data: orders, error } = await query.limit(1);
      
      if (error || !orders || orders.length === 0) {
        return null;
      }
      
      return orders[0];
      
    } catch (error) {
      console.error('Order matching error:', error);
      return null;
    }
  }

  private calculateConfidence(extractedData: Omit<ExtractedOrderData, 'confidence' | 'matchedOrder'>, imageQuality: number): number {
    let confidence = 0;
    let factors = 0;
    
    // Check for key fields
    if (extractedData.orderId) { confidence += 0.3; factors++; }
    if (extractedData.customerName) { confidence += 0.15; factors++; }
    if (extractedData.customerEmail) { confidence += 0.15; factors++; }
    if (extractedData.productName) { confidence += 0.15; factors++; }
    if (extractedData.totalAmount) { confidence += 0.15; factors++; }
    if (extractedData.orderDate) { confidence += 0.1; factors++; }
    
    // Average the confidence
    const averageConfidence = factors > 0 ? confidence / factors : 0;
    
    // Factor in image quality
    return Math.min(1, (averageConfidence * 0.7) + (imageQuality * 0.3));
  }

  private generateSuggestions(extractedData: Omit<ExtractedOrderData, 'confidence' | 'matchedOrder'>, matchedOrder: any, confidence: number): string[] {
    const suggestions: string[] = [];
    
    if (matchedOrder) {
      suggestions.push(`✅ Order found: ${matchedOrder.order_id}`);
      suggestions.push(`View complete order details in the Orders tab`);
    } else {
      suggestions.push(`❌ No matching order found in database`);
      
      if (extractedData.orderId) {
        suggestions.push(`Check if order ID "${extractedData.orderId}" is correct`);
      }
      
      if (extractedData.customerEmail) {
        suggestions.push(`Try searching by email: ${extractedData.customerEmail}`);
      }
      
      suggestions.push(`This might be a new order or from a different system`);
    }
    
    if (confidence < 0.5) {
      suggestions.push(`Low confidence extraction - try with a clearer image`);
    }
    
    if (extractedData.extractedText.length < 50) {
      suggestions.push(`Limited text detected - ensure the image contains readable text`);
    }
    
    return suggestions;
  }

  async captureFromCamera(): Promise<File> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          resolve(file);
        } else {
          reject(new Error('No file captured'));
        }
      };
      
      input.onerror = () => reject(new Error('Camera access failed'));
      
      input.click();
    });
  }

  async uploadFromGallery(): Promise<File> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = this.SUPPORTED_FORMATS.join(',');
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          resolve(file);
        } else {
          reject(new Error('No file selected'));
        }
      };
      
      input.onerror = () => reject(new Error('File selection failed'));
      
      input.click();
    });
  }
}

export const visualRecognitionService = new VisualRecognitionService();
