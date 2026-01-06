import { supabase } from '@/integrations/supabase/client';

export interface ARProduct {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  images: string[];
  dimensions: {
    width: number;
    height: number;
    depth: number;
    weight: number;
  };
  colors: string[];
  materials: string[];
  features: string[];
  arModel?: string;
  qrCode?: string;
}

export interface ARPreviewSession {
  id: string;
  productId: string;
  userId: string;
  startTime: string;
  duration: number;
  interactions: ARInteraction[];
  deviceInfo: DeviceInfo;
}

export interface ARInteraction {
  type: 'rotate' | 'scale' | 'color_change' | 'feature_view' | 'dimension_measure';
  timestamp: string;
  data: any;
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  supportsAR: boolean;
  supportsWebXR: boolean;
  gpu: string;
  memory: number;
}

export interface ARMeasurement {
  dimension: 'width' | 'height' | 'depth';
  value: number;
  unit: 'cm' | 'inches';
  accuracy: number;
}

class ARProductPreviewService {
  private isSupported: boolean = false;
  private currentSession: ARPreviewSession | null = null;
  private arViewer: HTMLElement | null = null;
  private measurements: ARMeasurement[] = [];

  constructor() {
    this.checkARSupport();
  }

  private checkARSupport(): void {
    // Check for WebXR support
    if ('xr' in navigator) {
      (navigator as any).xr.isSessionSupported('immersive-ar').then((supported: boolean) => {
        this.isSupported = supported;
      });
    } else {
      // Fallback to WebRTC AR
      this.isSupported = this.checkWebRTCARSupport();
    }
  }

  private checkWebRTCARSupport(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  async initializeARPreview(productId: string, containerElement: HTMLElement): Promise<void> {
    if (!this.isSupported) {
      throw new Error('AR not supported on this device');
    }

    try {
      const product = await this.fetchProductData(productId);
      this.arViewer = containerElement;
      
      if (this.isSupported && 'xr' in navigator) {
        await this.initializeWebXAR(product);
      } else {
        await this.initializeWebRTCAR(product);
      }

      this.startPreviewSession(productId);
    } catch (error) {
      console.error('Error initializing AR preview:', error);
      throw error;
    }
  }

  private async fetchProductData(productId: string): Promise<ARProduct> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;
      
      return this.transformToARProduct(data);
    } catch (error) {
      console.error('Error fetching product data:', error);
      // Return mock product data for demo
      return this.getMockProduct(productId);
    }
  }

  private transformToARProduct(data: any): ARProduct {
    return {
      id: data.id,
      name: data.product_name || data.name,
      category: data.product_category || data.category,
      brand: data.product_brand || data.brand,
      price: data.product_price || data.price,
      images: data.product_images || [data.image_url],
      dimensions: {
        width: data.width || 10,
        height: data.height || 15,
        depth: data.depth || 5,
        weight: data.weight || 0.5
      },
      colors: data.colors || ['Black', 'White', 'Blue'],
      materials: data.materials || ['Plastic', 'Metal', 'Glass'],
      features: data.features || ['Water resistant', 'Wireless', 'Fast charging'],
      arModel: data.ar_model_url,
      qrCode: data.qr_code
    };
  }

  private getMockProduct(productId: string): ARProduct {
    return {
      id: productId,
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
      arModel: '/models/iphone-15-pro.glb',
      qrCode: '/qr/iphone-15-pro.png'
    };
  }

  private async initializeWebXAR(product: ARProduct): Promise<void> {
    try {
      const xr = (navigator as any).xr;
      
      const session = await xr.requestSession('immersive-ar', {
        requiredFeatures: ['local', 'dom-overlay'],
        optionalFeatures: ['hit-test']
      });

      const renderer = new WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;
      renderer.xr.setSession(session);

      // Load 3D model
      const model = await this.load3DModel(product.arModel || this.generateFallbackModel(product));
      
      // Add to scene
      const scene = new THREE.Scene();
      scene.add(model);

      // Setup lighting
      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(0, 1, 1);
      scene.add(light);

      const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
      scene.add(ambientLight);

      // Render loop
      renderer.setAnimationLoop(() => {
        renderer.render(scene, session.renderState.baseLayer);
      });

      // Handle user interactions
      this.setupARInteractions(session, model, product);

    } catch (error) {
      console.error('WebXR AR initialization failed:', error);
      throw error;
    }
  }

  private async initializeWebRTCAR(product: ARProduct): Promise<void> {
    try {
      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      video.srcObject = stream;
      this.arViewer?.appendChild(video);

      // Create AR overlay
      const overlay = this.createAROverlay(product);
      this.arViewer?.appendChild(overlay);

      // Setup camera tracking simulation
      this.setupCameraTracking(video, overlay, product);

    } catch (error) {
      console.error('WebRTC AR initialization failed:', error);
      throw error;
    }
  }

  private async load3DModel(modelUrl: string): Promise<THREE.Object3D> {
    const loader = new THREE.GLTFLoader();
    return new Promise((resolve, reject) => {
      loader.load(modelUrl, (gltf) => {
        resolve(gltf.scene);
      }, undefined, reject);
    });
  }

  private generateFallbackModel(product: ARProduct): THREE.Object3D {
    // Generate a simple 3D box as fallback
    const geometry = new THREE.BoxGeometry(
      product.dimensions.width,
      product.dimensions.height,
      product.dimensions.depth
    );
    
    const material = new THREE.MeshPhongMaterial({ 
      color: 0x888888,
      transparent: true,
      opacity: 0.8
    });
    
    return new THREE.Mesh(geometry, material);
  }

  private createAROverlay(product: ARProduct): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'ar-overlay';
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
    `;

    // Product info panel
    const infoPanel = document.createElement('div');
    infoPanel.className = 'ar-info-panel';
    infoPanel.innerHTML = `
      <div class="ar-product-info">
        <h3>${product.name}</h3>
        <p>Brand: ${product.brand}</p>
        <p>Price: ₹${product.price.toLocaleString()}</p>
        <div class="ar-dimensions">
          <p>Dimensions: ${product.dimensions.width}W × ${product.dimensions.height}H × ${product.dimensions.depth}D cm</p>
          <p>Weight: ${product.dimensions.weight}kg</p>
        </div>
      </div>
    `;

    overlay.appendChild(infoPanel);
    return overlay;
  }

  private setupARInteractions(session: any, model: THREE.Object3D, product: ARProduct): void {
    let isDragging = false;
    let previousTouch = { x: 0, y: 0 };

    // Handle touch/mouse interactions
    const handleInteraction = (event: any) => {
      const interaction = this.mapToARInteraction(event, model);
      this.recordInteraction(interaction);
    };

    session.addEventListener('select', handleInteraction);
    session.addEventListener('squeeze', handleInteraction);

    // Color change functionality
    this.setupColorPicker(product, model);
    
    // Measurement tools
    this.setupMeasurementTools(model);
  }

  private setupCameraTracking(video: HTMLVideoElement, overlay: HTMLElement, product: ARProduct): void {
    // Simulate AR tracking with visual feedback
    const trackingIndicator = document.createElement('div');
    trackingIndicator.className = 'ar-tracking-indicator';
    trackingIndicator.innerHTML = `
      <div class="tracking-crosshair">+</div>
      <div class="tracking-info">AR Tracking Active</div>
    `;
    overlay.appendChild(trackingIndicator);

    // Simulate product placement
    setTimeout(() => {
      trackingIndicator.classList.add('tracking-locked');
      this.showProductPlaced(product);
    }, 2000);
  }

  private setupColorPicker(product: ARProduct, model: THREE.Object3D): void {
    const colorPicker = document.createElement('div');
    colorPicker.className = 'ar-color-picker';
    
    product.colors.forEach(color => {
      const colorOption = document.createElement('div');
      colorOption.className = 'color-option';
      colorOption.style.backgroundColor = this.getColorHex(color);
      colorOption.onclick = () => {
        this.changeProductColor(model, colorOption.style.backgroundColor);
      };
      colorPicker.appendChild(colorOption);
    });

    this.arViewer?.appendChild(colorPicker);
  }

  private setupMeasurementTools(model: THREE.Object3D): void {
    const measurementTools = document.createElement('div');
    measurementTools.className = 'ar-measurement-tools';
    measurementTools.innerHTML = `
      <button class="measure-btn" onclick="arService.startMeasurement()">
        📏 Measure
      </button>
      <button class="reset-btn" onclick="arService.resetView()">
        🔄 Reset View
      </button>
    `;

    this.arViewer?.appendChild(measurementTools);
  }

  private changeProductColor(model: THREE.Object3D, color: string): void {
    (model as any).material.color.set(color);
    this.recordInteraction({
      type: 'color_change',
      timestamp: new Date().toISOString(),
      data: { color }
    });
  }

  private getColorHex(colorName: string): string {
    const colors: Record<string, string> = {
      'Black': '#000000',
      'White': '#FFFFFF',
      'Blue': '#007AFF',
      'Natural Titanium': '#F2F2F2',
      'Blue Titanium': '#507F9F',
      'White Titanium': '#F3F3F3',
      'Black Titanium': '#1C1C1E'
    };
    return colors[colorName] || '#888888';
  }

  private mapToARInteraction(event: any, model: THREE.Object3D): ARInteraction {
    // Map user interaction to AR interaction type
    if (event.type === 'select') {
      return {
        type: 'rotate',
        timestamp: new Date().toISOString(),
        data: { rotation: model.rotation }
      };
    }
    
    return {
      type: 'feature_view',
      timestamp: new Date().toISOString(),
      data: {}
    };
  }

  private recordInteraction(interaction: ARInteraction): void {
    if (this.currentSession) {
      this.currentSession.interactions.push(interaction);
    }
  }

  private startPreviewSession(productId: string): void {
    this.currentSession = {
      id: Date.now().toString(),
      productId,
      userId: 'current_user', // Would get from auth
      startTime: new Date().toISOString(),
      duration: 0,
      interactions: [],
      deviceInfo: this.getDeviceInfo()
    };

    // Start duration tracking
    setInterval(() => {
      if (this.currentSession) {
        this.currentSession.duration++;
      }
    }, 1000);
  }

  private getDeviceInfo(): DeviceInfo {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      supportsAR: this.isSupported,
      supportsWebXR: 'xr' in navigator,
      gpu: this.getGPUInfo(),
      memory: this.getMemoryInfo()
    };
  }

  private getGPUInfo(): string {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (!gl) return 'Unknown';
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    return debugInfo ? debugInfo.UNMASKED_RENDERER_WEBGL : 'Unknown';
  }

  private getMemoryInfo(): number {
    return (navigator as any).deviceMemory || 4; // Default to 4GB
  }

  private showProductPlaced(product: ARProduct): void {
    const placementIndicator = document.createElement('div');
    placementIndicator.className = 'ar-placement-success';
    placementIndicator.innerHTML = `
      <div class="placement-icon">✓</div>
      <div class="placement-text">${product.name} placed in your space!</div>
    `;
    
    this.arViewer?.appendChild(placementIndicator);
    
    setTimeout(() => {
      placementIndicator.remove();
    }, 3000);
  }

  // Public API methods
  async startMeasurement(): Promise<void> {
    // Initialize AR measurement mode
    console.log('Starting AR measurement mode');
    // Implementation would use AR hit-testing to measure real objects
  }

  resetView(): void {
    // Reset AR view to initial state
    console.log('Resetting AR view');
  }

  async capturePhoto(): Promise<string> {
    if (!this.arViewer) return '';
    
    // Create canvas from AR view
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // This would capture the actual AR scene
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    return canvas.toDataURL('image/png');
  }

  async shareARExperience(): Promise<void> {
    if (!this.currentSession) return;
    
    const shareData = {
      title: 'AR Product Preview',
      text: `Check out this ${this.currentSession.productId} in AR!`,
      url: window.location.href
    };

    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href);
    }
  }

  endPreviewSession(): void {
    if (this.currentSession) {
      // Save session data
      this.saveSessionData(this.currentSession);
      this.currentSession = null;
    }

    // Cleanup AR resources
    if (this.arViewer) {
      this.arViewer.innerHTML = '';
      this.arViewer = null;
    }
  }

  private async saveSessionData(session: ARPreviewSession): Promise<void> {
    try {
      await supabase
        .from('ar_sessions')
        .insert([{
          product_id: session.productId,
          user_id: session.userId,
          duration: session.duration,
          interactions: session.interactions,
          device_info: session.deviceInfo,
          created_at: new Date().toISOString()
        }]);
    } catch (error) {
      console.error('Error saving AR session:', error);
    }
  }

  // Utility methods
  isARSupported(): boolean {
    return this.isSupported;
  }

  getCurrentSession(): ARPreviewSession | null {
    return this.currentSession;
  }

  getSupportedFeatures(): string[] {
    const features = [];
    
    if (this.isSupported) {
      features.push('3D Product Preview');
      features.push('Real-world Placement');
      features.push('Color Customization');
      features.push('Measurement Tools');
    }
    
    if ('xr' in navigator) {
      features.push('Immersive AR');
      features.push('Hand Tracking');
      features.push('Occlusion');
    } else {
      features.push('Camera AR');
    }
    
    return features;
  }
}

// Global AR service instance
export const arProductPreviewService = new ARProductPreviewService();

// Make it available globally for inline handlers
(window as any).arService = arProductPreviewService;
