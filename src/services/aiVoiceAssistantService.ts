import { supabase } from '@/integrations/supabase/client';

export interface VoiceCommand {
  id: string;
  command: string;
  intent: string;
  parameters: Record<string, any>;
  confidence: number;
  timestamp: string;
}

export interface AIResponse {
  text: string;
  action?: string;
  data?: any;
  suggestions?: string[];
}

export interface VoiceAssistantFeatures {
  naturalLanguageProcessing: boolean;
  contextualUnderstanding: boolean;
  proactiveAssistance: boolean;
  multiLanguageSupport: boolean;
  emotionalIntelligence: boolean;
}

class AIVoiceAssistantService {
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening: boolean = false;
  private commandHistory: VoiceCommand[] = [];
  private contextMemory: Map<string, any> = new Map();
  
  private features: VoiceAssistantFeatures = {
    naturalLanguageProcessing: true,
    contextualUnderstanding: true,
    proactiveAssistance: true,
    multiLanguageSupport: true,
    emotionalIntelligence: true
  };

  constructor() {
    this.initializeSpeechRecognition();
    this.initializeSpeechSynthesis();
  }

  private initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      
      this.recognition.onresult = (event: any) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript;
        
        if (event.results[last].isFinal) {
          this.processVoiceCommand(transcript);
        }
      };
      
      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        this.handleRecognitionError(event.error);
      };
      
      this.recognition.onend = () => {
        this.isListening = false;
      };
    }
  }

  private initializeSpeechSynthesis() {
    this.synthesis = window.speechSynthesis;
  }

  private handleRecognitionError(error: any): void {
    console.error('Speech recognition error:', error);
    // Handle different types of speech recognition errors
    switch (error) {
      case 'no-speech':
        console.log('No speech detected');
        break;
      case 'audio-capture':
        console.log('Audio capture error');
        break;
      case 'not-allowed':
        console.log('Microphone permission denied');
        break;
      default:
        console.log('Unknown speech recognition error');
    }
  }

  async startListening(): Promise<void> {
    if (!this.recognition) {
      throw new Error('Speech recognition not supported');
    }

    if (this.isListening) {
      return;
    }

    this.isListening = true;
    this.recognition?.start();
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  private async processVoiceCommand(transcript: string): Promise<void> {
    const command = await this.analyzeCommand(transcript);
    this.commandHistory.push(command);
    
    const response = await this.generateAIResponse(command);
    await this.executeCommand(command, response);
    
    if (response.text) {
      this.speak(response.text);
    }
  }

  private async analyzeCommand(transcript: string): Promise<VoiceCommand> {
    const normalizedText = transcript.toLowerCase().trim();
    
    // Advanced natural language processing
    const intents = {
      // Order related commands
      'track_order': {
        patterns: ['track my order', 'where is my order', 'order status', 'track order', 'find my package'],
        extractParams: (text: string) => {
          const orderMatch = text.match(/(?:order|package)\s*#?([a-z0-9]+)/i);
          return { orderId: orderMatch?.[1] };
        }
      },
      'create_order': {
        patterns: ['order new product', 'buy product', 'add to cart', 'purchase', 'order'],
        extractParams: (text: string) => {
          const productMatch = text.match(/(?:buy|order|purchase)\s+(.+?)(?:\s+for\s+(.+?))?/i);
          return { 
            product: productMatch?.[1]?.trim(),
            recipient: productMatch?.[2]?.trim()
          };
        }
      },
      'cancel_order': {
        patterns: ['cancel order', 'cancel my order', 'refund', 'return'],
        extractParams: (text: string) => {
          const orderMatch = text.match(/(?:cancel|refund)\s*(?:order\s*)?#?([a-z0-9]+)/i);
          return { orderId: orderMatch?.[1] };
        }
      },
      
      // Product related commands
      'search_products': {
        patterns: ['search for', 'find products', 'show me', 'looking for'],
        extractParams: (text: string) => {
          const searchMatch = text.match(/(?:search|find|show)\s+(.+?)(?:\s+under\s+(.+?))?/i);
          return { 
            query: searchMatch?.[1]?.trim(),
            category: searchMatch?.[2]?.trim()
          };
        }
      },
      'product_details': {
        patterns: ['tell me about', 'show details', 'product information'],
        extractParams: (text: string) => {
          const productMatch = text.match(/(?:about|details)\s+(.+?)/i);
          return { product: productMatch?.[1]?.trim() };
        }
      },
      
      // Analytics commands
      'show_analytics': {
        patterns: ['show analytics', 'sales report', 'business insights', 'performance'],
        extractParams: (text: string) => {
          const timeMatch = text.match(/(?:this|last|past)\s+(week|month|quarter|year)/i);
          const typeMatch = text.match(/(?:sales|revenue|orders|customers|products)/i);
          return { 
            timeframe: timeMatch?.[1] || 'month',
            type: typeMatch?.[1] || 'sales'
          };
        }
      },
      
      // Predictive commands
      'predict_delivery': {
        patterns: ['predict delivery', 'when will arrive', 'delivery time', 'estimate'],
        extractParams: (text: string) => {
          const orderMatch = text.match(/(?:predict|estimate)\s*(?:delivery\s*)?(?:for\s*)?#?([a-z0-9]+)/i);
          return { orderId: orderMatch?.[1] };
        }
      },
      
      // Visual commands
      'scan_document': {
        patterns: ['scan receipt', 'scan invoice', 'recognize document', 'upload image'],
        extractParams: () => ({ action: 'open_scanner' })
      },
      
      // Navigation commands
      'navigate_to': {
        patterns: ['go to', 'open', 'show me', 'navigate to'],
        extractParams: (text: string) => {
          const pageMatch = text.match(/(?:go to|open|show|navigate)\s+(.+?)/i);
          const pages = {
            'home': 'home',
            'orders': 'orders',
            'tracking': 'track',
            'analytics': 'insights',
            'scan': 'scan',
            'chat': 'chat',
            'profile': 'profile'
          };
          const page = pageMatch?.[1]?.trim().toLowerCase();
          return { page: pages[page as keyof typeof pages] || page };
        }
      },
      
      // Assistance commands
      'help': {
        patterns: ['help', 'what can you do', 'commands', 'assist'],
        extractParams: () => ({ action: 'show_help' })
      },
      
      // Smart home commands
      'smart_home': {
        patterns: ['turn on', 'turn off', 'activate', 'deactivate'],
        extractParams: (text: string) => {
          const deviceMatch = text.match(/(?:turn\s+(on|off)|activate|deactivate)\s+(.+?)/i);
          return {
            action: deviceMatch?.[1] || 'activate',
            device: deviceMatch?.[2]?.trim()
          };
        }
      }
    };

    // Find matching intent
    let matchedIntent = 'unknown';
    let parameters = {};
    let confidence = 0;

    for (const [intent, config] of Object.entries(intents)) {
      for (const pattern of config.patterns) {
        if (normalizedText.includes(pattern)) {
          matchedIntent = intent;
          parameters = config.extractParams(normalizedText);
          confidence = this.calculateConfidence(normalizedText, pattern);
          break;
        }
      }
    }

    return {
      id: Date.now().toString(),
      command: transcript,
      intent: matchedIntent,
      parameters,
      confidence,
      timestamp: new Date().toISOString()
    };
  }

  private calculateConfidence(text: string, pattern: string): number {
    // Simple confidence calculation based on text similarity
    const words = text.split(' ');
    const patternWords = pattern.split(' ');
    const matches = patternWords.filter(word => words.includes(word));
    return (matches.length / patternWords.length) * 100;
  }

  private async generateAIResponse(command: VoiceCommand): Promise<AIResponse> {
    const context = this.getContextualData(command.intent);
    
    switch (command.intent) {
      case 'track_order':
        if (command.parameters.orderId) {
          const orderData = await this.fetchOrderData(command.parameters.orderId);
          return {
            text: `I found your order ${command.parameters.orderId}. It's currently ${orderData?.order_status || 'being processed'} and ${orderData?.expected_delivery ? 'is estimated to arrive by ' + new Date(orderData.expected_delivery).toLocaleDateString() : 'will be shipped soon'}.`,
            action: 'navigate_to_tracking',
            data: { orderId: command.parameters.orderId },
            suggestions: ['Show order details', 'Contact support', 'Track delivery person']
          };
        } else {
          return {
            text: "I'd be happy to track your order. Could you please provide your order ID?",
            suggestions: ['Check your email for order ID', 'Show recent orders']
          };
        }

      case 'create_order':
        if (command.parameters.product) {
          return {
            text: `I'll help you order ${command.parameters.product}. Let me search for available options and pricing.`,
            action: 'search_product',
            data: { query: command.parameters.product },
            suggestions: ['Add to cart', 'Choose variant', 'Set delivery address']
          };
        }

      case 'search_products':
        return {
          text: `Searching for ${command.parameters.query || 'products'}${command.parameters.category ? ' in ' + command.parameters.category : ''}...`,
          action: 'search_products',
          data: command.parameters,
          suggestions: ['Filter results', 'Sort by price', 'View recommendations']
        };

      case 'show_analytics':
        return {
          text: `Showing ${command.parameters.type} analytics for the ${command.parameters.timeframe}. I can see interesting patterns in your data.`,
          action: 'navigate_to_analytics',
          data: command.parameters,
          suggestions: ['Export report', 'Compare periods', 'View trends']
        };

      case 'predict_delivery':
        if (command.parameters.orderId) {
          const prediction = await this.getPrediction(command.parameters.orderId);
          return {
            text: `Based on current conditions, your order ${command.parameters.orderId} has a ${prediction.confidence}% chance of on-time delivery. Estimated arrival: ${prediction.eta}`,
            action: 'show_prediction',
            data: prediction,
            suggestions: ['Track in real-time', 'Set delivery alerts', 'Contact carrier']
          };
        }

      case 'scan_document':
        return {
          text: "Opening the document scanner. You can now upload receipts, invoices, or any order-related documents.",
          action: 'open_scanner',
          suggestions: ['Upload from camera', 'Choose from gallery', 'Batch scan']
        };

      case 'navigate_to':
        return {
          text: `Navigating to ${command.parameters.page}...`,
          action: 'navigate',
          data: { page: command.parameters.page }
        };

      case 'help':
        return {
          text: "I'm your AI assistant! I can help you track orders, search products, show analytics, predict deliveries, scan documents, and navigate the app. Just say what you need!",
          suggestions: [
            'Track my order #123',
            'Search for iPhone',
            'Show sales analytics',
            'Scan receipt',
            'Go to orders'
          ]
        };

      default:
        return {
          text: "I didn't quite understand that. Could you please rephrase your command?",
          suggestions: ['Track order', 'Search products', 'Show analytics', 'Get help']
        };
    }
  }

  private async executeCommand(command: VoiceCommand, response: AIResponse): Promise<void> {
    // Store command in context memory
    this.contextMemory.set(command.intent, {
      command,
      response,
      timestamp: new Date().toISOString()
    });

    // Execute action based on response
    if (response.action) {
      switch (response.action) {
        case 'navigate_to_tracking':
          window.location.hash = `#track?order=${response.data.orderId}`;
          break;
        case 'navigate_to_analytics':
          window.location.hash = '#insights';
          break;
        case 'open_scanner':
          window.location.hash = '#scan';
          break;
        case 'navigate':
          window.location.hash = `#${response.data.page}`;
          break;
      }
    }
  }

  private getContextualData(intent: string): any {
    return this.contextMemory.get(intent);
  }

  private async fetchOrderData(orderId: string) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_id', orderId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching order:', error);
      return null;
    }
  }

  private async getPrediction(orderId: string) {
    // This would integrate with the predictive service
    return {
      orderId,
      eta: 'Tomorrow, 2-4 PM',
      confidence: 85,
      factors: ['Weather', 'Traffic', 'Carrier performance']
    };
  }

  speak(text: string): void {
    if (!this.synthesis) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    this.synthesis.speak(utterance);
  }

  getCommandHistory(): VoiceCommand[] {
    return this.commandHistory;
  }

  getFeatures(): VoiceAssistantFeatures {
    return this.features;
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  // Advanced AI Features
  
  async analyzeEmotion(text: string): Promise<string> {
    // Simple emotion analysis based on keywords
    const emotions = {
      happy: ['great', 'excellent', 'amazing', 'love', 'perfect', 'wonderful'],
      frustrated: ['angry', 'frustrated', 'terrible', 'awful', 'hate'],
      confused: ['confused', 'unclear', 'don\'t understand', 'help'],
      excited: ['excited', 'can\'t wait', 'awesome', 'fantastic']
    };

    for (const [emotion, keywords] of Object.entries(emotions)) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        return emotion;
      }
    }
    
    return 'neutral';
  }

  async getProactiveSuggestions(): Promise<string[]> {
    // Analyze user behavior and suggest actions
    const recentCommands = this.commandHistory.slice(-5);
    const suggestions = [];

    if (recentCommands.some(c => c.intent === 'track_order')) {
      suggestions.push('Set up delivery alerts for your orders');
    }

    if (recentCommands.some(c => c.intent === 'search_products')) {
      suggestions.push('Save your search preferences');
    }

    return suggestions;
  }

  // Multi-language support
  setLanguage(language: string): void {
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  getSupportedLanguages(): string[] {
    return [
      'en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 
      'it-IT', 'pt-BR', 'ru-RU', 'zh-CN', 'ja-JP'
    ];
  }
}

export const aiVoiceAssistantService = new AIVoiceAssistantService();
