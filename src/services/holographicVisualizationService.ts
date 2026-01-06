import { supabase } from '@/integrations/supabase/client';

export interface HolographicOrder {
  id: string;
  orderId: string;
  productName: string;
  productImage: string;
  status: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation: {
    x: number;
    y: number;
    z: number;
  };
  scale: number;
  opacity: number;
  glowIntensity: number;
  particles: Particle[];
  timeline: TimelineEvent[];
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  icon: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  color: string;
  completed: boolean;
}

export interface HolographicScene {
  id: string;
  orders: HolographicOrder[];
  camera: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    zoom: number;
  };
  lighting: {
    ambient: number;
    directional: number;
    point: number;
  };
  effects: {
    fog: boolean;
    particles: boolean;
    glow: boolean;
    reflections: boolean;
  };
}

class HolographicVisualizationService {
  private scene: any = null;
  private renderer: any = null;
  private camera: any = null;
  private canvas: HTMLCanvasElement | null = null;
  private animationId: number | null = null;
  private particles: Particle[] = [];
  private holographicOrders: Map<string, HolographicOrder> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    this.initializeHolographicEngine();
  }

  private async initializeHolographicEngine(): Promise<void> {
    try {
      // Initialize WebGL context for holographic rendering
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'holographic-canvas';
      this.canvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 9999;
        pointer-events: none;
        background: radial-gradient(ellipse at center, rgba(0,20,40,0.9) 0%, rgba(0,0,0,0.95) 100%);
      `;

      // Initialize holographic rendering engine
      this.scene = this.createHolographicScene();
      this.camera = this.createHolographicCamera();
      this.renderer = this.createHolographicRenderer();

      this.setupHolographicLighting();
      this.setupParticleEffects();
      this.setupPostProcessingEffects();

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize holographic engine:', error);
    }
  }

  private createHolographicScene(): any {
    // Create scene with holographic properties
    const scene = {
      objects: [],
      lights: [],
      fog: {
        density: 0.02,
        color: { r: 0, g: 0.1, b: 0.2 }
      },
      background: {
        type: 'gradient',
        colors: [
          { position: 0, color: { r: 0, g: 0.05, b: 0.1 } },
          { position: 1, color: { r: 0, g: 0, b: 0 } }
        ]
      }
    };

    return scene;
  }

  private createHolographicCamera(): any {
    return {
      position: { x: 0, y: 0, z: 5 },
      rotation: { x: 0, y: 0, z: 0 },
      fov: 75,
      near: 0.1,
      far: 1000,
      zoom: 1
    };
  }

  private createHolographicRenderer(): any {
    const gl = this.canvas?.getContext('webgl2', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false
    });

    if (!gl) {
      throw new Error('WebGL2 not supported');
    }

    return {
      context: gl,
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio,
      effects: {
        bloom: true,
        godRays: true,
        chromaticAberration: true,
        filmGrain: true,
        vignette: true
      }
    };
  }

  private setupHolographicLighting(): void {
    this.scene.lights = [
      {
        type: 'ambient',
        color: { r: 0.2, g: 0.3, b: 0.5 },
        intensity: 0.3
      },
      {
        type: 'directional',
        position: { x: 5, y: 10, z: 5 },
        color: { r: 0.4, g: 0.6, b: 1.0 },
        intensity: 0.8
      },
      {
        type: 'point',
        position: { x: 0, y: 2, z: 0 },
        color: { r: 0, g: 1, b: 1 },
        intensity: 1.5,
        distance: 10
      }
    ];
  }

  private setupParticleEffects(): void {
    // Initialize particle system for holographic effects
    for (let i = 0; i < 200; i++) {
      this.particles.push(this.createParticle());
    }
  }

  private createParticle(): Particle {
    return {
      id: Math.random().toString(36).substr(2, 9),
      x: (Math.random() - 0.5) * 10,
      y: (Math.random() - 0.5) * 10,
      z: (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 0.02,
      vy: (Math.random() - 0.5) * 0.02,
      vz: (Math.random() - 0.5) * 0.02,
      size: Math.random() * 3 + 1,
      color: this.getRandomHolographicColor(),
      life: Math.random() * 100,
      maxLife: 100
    };
  }

  private getRandomHolographicColor(): string {
    const colors = [
      '#00ffff', // Cyan
      '#ff00ff', // Magenta
      '#00ff00', // Green
      '#ffff00', // Yellow
      '#ff0080', // Pink
      '#80ff00', // Lime
      '#00ff80', // Aqua
      '#ff8000'  // Orange
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private setupPostProcessingEffects(): void {
    // Setup advanced post-processing for holographic look
    this.renderer.effects = {
      bloom: {
        enabled: true,
        intensity: 1.5,
        radius: 0.4,
        threshold: 0.85
      },
      chromaticAberration: {
        enabled: true,
        offset: 0.002
      },
      filmGrain: {
        enabled: true,
        intensity: 0.15
      },
      vignette: {
        enabled: true,
        darkness: 0.5,
        offset: 0.8
      },
      scanlines: {
        enabled: true,
        density: 100,
        opacity: 0.1
      }
    };
  }

  async createHolographicOrder(orderData: any): Promise<HolographicOrder> {
    const holographicOrder: HolographicOrder = {
      id: Math.random().toString(36).substr(2, 9),
      orderId: orderData.order_id,
      productName: orderData.product_name,
      productImage: orderData.product_image || '/default-product.png',
      status: orderData.order_status,
      position: {
        x: (Math.random() - 0.5) * 4,
        y: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 2
      },
      rotation: {
        x: 0,
        y: 0,
        z: 0
      },
      scale: 1,
      opacity: 0.8,
      glowIntensity: 1,
      particles: this.generateOrderParticles(orderData.order_status),
      timeline: this.generateTimelineEvents(orderData)
    };

    this.holographicOrders.set(holographicOrder.orderId, holographicOrder);
    return holographicOrder;
  }

  private generateOrderParticles(status: string): Particle[] {
    const particleCount = status === 'delivered' ? 50 : 20;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const particle = this.createParticle();
      particle.color = this.getStatusColor(status);
      particles.push(particle);
    }

    return particles;
  }

  private generateTimelineEvents(orderData: any): TimelineEvent[] {
    const events: TimelineEvent[] = [
      {
        id: '1',
        timestamp: orderData.created_at,
        title: 'Order Placed',
        description: `Order ${orderData.order_id} created`,
        icon: '🛒',
        position: { x: -3, y: 2, z: 0 },
        color: '#00ff00',
        completed: true
      },
      {
        id: '2',
        timestamp: orderData.confirmed_date,
        title: 'Order Confirmed',
        description: 'Order verified and confirmed',
        icon: '✅',
        position: { x: -1.5, y: 2, z: 0 },
        color: '#00ff00',
        completed: orderData.order_status !== 'pending'
      },
      {
        id: '3',
        timestamp: orderData.shipped_date,
        title: 'Shipped',
        description: 'Package handed to carrier',
        icon: '📦',
        position: { x: 0, y: 2, z: 0 },
        color: '#ffaa00',
        completed: ['shipped', 'out_for_delivery', 'delivered'].includes(orderData.order_status)
      },
      {
        id: '4',
        timestamp: orderData.expected_delivery,
        title: 'Out for Delivery',
        description: 'Package is with delivery partner',
        icon: '🚚',
        position: { x: 1.5, y: 2, z: 0 },
        color: '#ff6600',
        completed: ['out_for_delivery', 'delivered'].includes(orderData.order_status)
      },
      {
        id: '5',
        timestamp: orderData.actual_delivery,
        title: 'Delivered',
        description: 'Package successfully delivered',
        icon: '🏠',
        position: { x: 3, y: 2, z: 0 },
        color: '#00ff00',
        completed: orderData.order_status === 'delivered'
      }
    ];

    return events;
  }

  private getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'pending': '#ffff00',
      'confirmed': '#00ff00',
      'shipped': '#ffaa00',
      'out_for_delivery': '#ff6600',
      'delivered': '#00ff00',
      'cancelled': '#ff0000'
    };
    return colors[status] || '#ffffff';
  }

  async startHolographicVisualization(containerElement: HTMLElement): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeHolographicEngine();
    }

    // Add canvas to container
    containerElement.appendChild(this.canvas!);

    // Start animation loop
    this.animate();

    // Add interactive controls
    this.setupInteractiveControls();
  }

  private animate(): void {
    if (!this.isInitialized) return;

    this.animationId = requestAnimationFrame(() => this.animate());

    // Update particles
    this.updateParticles();

    // Update holographic orders
    this.updateHolographicOrders();

    // Render scene
    this.renderHolographicScene();
  }

  private updateParticles(): void {
    this.particles.forEach(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.z += particle.vz;
      particle.life--;

      // Respawn dead particles
      if (particle.life <= 0) {
        Object.assign(particle, this.createParticle());
      }
    });
  }

  private updateHolographicOrders(): void {
    this.holographicOrders.forEach(order => {
      // Rotate orders slowly
      order.rotation.y += 0.01;
      order.rotation.x += 0.005;

      // Floating animation
      order.position.y += Math.sin(Date.now() * 0.001) * 0.002;

      // Pulsing glow effect
      order.glowIntensity = 1 + Math.sin(Date.now() * 0.003) * 0.3;

      // Update order particles
      order.particles.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.z += particle.vz;
        particle.life--;

        if (particle.life <= 0) {
          Object.assign(particle, this.createParticle());
          particle.color = this.getStatusColor(order.status);
        }
      });
    });
  }

  private renderHolographicScene(): void {
    const gl = this.renderer.context;
    const canvas = this.canvas!;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Render background gradient
    this.renderBackground();

    // Render particles
    this.renderParticles();

    // Render holographic orders
    this.renderHolographicOrders();

    // Render timeline
    this.renderTimeline();

    // Apply post-processing effects
    this.applyPostProcessingEffects();
  }

  private renderBackground(): void {
    const gl = this.renderer.context;
    
    // Create holographic background with gradient
    const gradient = gl.createLinearGradient(0, 0, 0, gl.canvas.height);
    gradient.addColorStop(0, 'rgba(0, 20, 40, 0.9)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
    
    gl.fillStyle = gradient;
    gl.fillRect(0, 0, gl.canvas.width, gl.canvas.height);
  }

  private renderParticles(): void {
    const gl = this.renderer.context;
    
    this.particles.forEach(particle => {
      const opacity = particle.life / particle.maxLife;
      
      gl.save();
      gl.globalAlpha = opacity;
      gl.fillStyle = particle.color;
      gl.shadowBlur = 10;
      gl.shadowColor = particle.color;
      
      // Draw particle as glowing circle
      gl.beginPath();
      gl.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      gl.fill();
      gl.restore();
    });
  }

  private renderHolographicOrders(): void {
    const gl = this.renderer.context;
    
    this.holographicOrders.forEach(order => {
      gl.save();
      
      // Apply transformations
      gl.translate(order.position.x, order.position.y, order.position.z);
      gl.rotate(order.rotation.x, 1, 0, 0);
      gl.rotate(order.rotation.y, 0, 1, 0);
      gl.rotate(order.rotation.z, 0, 0, 1);
      gl.scale(order.scale, order.scale, order.scale);
      
      // Apply holographic glow
      gl.shadowBlur = 20 * order.glowIntensity;
      gl.shadowColor = this.getStatusColor(order.status);
      gl.globalAlpha = order.opacity;
      
      // Render order as holographic cube
      this.renderHolographicCube(gl, order);
      
      // Render order particles
      order.particles.forEach(particle => {
        gl.fillStyle = particle.color;
        gl.globalAlpha = (particle.life / particle.maxLife) * 0.8;
        gl.beginPath();
        gl.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        gl.fill();
      });
      
      gl.restore();
    });
  }

  private renderHolographicCube(gl: any, order: HolographicOrder): void {
    const size = 0.5;
    const color = this.getStatusColor(order.status);
    
    // Draw wireframe cube with holographic effect
    gl.strokeStyle = color;
    gl.lineWidth = 2;
    gl.strokeRect(-size, -size, size * 2, size * 2);
    
    // Draw front face
    gl.strokeRect(-size, -size, size * 2, size * 2);
    
    // Draw back face (offset)
    gl.strokeRect(-size + 0.2, -size + 0.2, size * 2, size * 2);
    
    // Connect corners
    gl.beginPath();
    gl.moveTo(-size, -size);
    gl.lineTo(-size + 0.2, -size + 0.2);
    gl.moveTo(size, -size);
    gl.lineTo(size + 0.2, -size + 0.2);
    gl.moveTo(size, size);
    gl.lineTo(size + 0.2, size + 0.2);
    gl.moveTo(-size, size);
    gl.lineTo(-size + 0.2, size + 0.2);
    gl.stroke();
  }

  private renderTimeline(): void {
    const gl = this.renderer.context;
    
    this.holographicOrders.forEach(order => {
      order.timeline.forEach((event, index) => {
        if (!event.completed) return;
        
        gl.save();
        gl.translate(event.position.x, event.position.y, event.position.z);
        
        // Draw event marker
        gl.fillStyle = event.color;
        gl.shadowBlur = 15;
        gl.shadowColor = event.color;
        gl.beginPath();
        gl.arc(0, 0, 0.2, 0, Math.PI * 2);
        gl.fill();
        
        // Draw connecting lines
        if (index > 0) {
          const prevEvent = order.timeline[index - 1];
          gl.strokeStyle = '#00ffff';
          gl.lineWidth = 1;
          gl.globalAlpha = 0.5;
          gl.beginPath();
          gl.moveTo(prevEvent.position.x, prevEvent.position.y);
          gl.lineTo(event.position.x, event.position.y);
          gl.stroke();
        }
        
        gl.restore();
      });
    });
  }

  private applyPostProcessingEffects(): void {
    const gl = this.renderer.context;
    
    // Apply bloom effect
    if (this.renderer.effects.bloom.enabled) {
      this.applyBloomEffect(gl);
    }
    
    // Apply chromatic aberration
    if (this.renderer.effects.chromaticAberration.enabled) {
      this.applyChromaticAberration(gl);
    }
    
    // Apply scanlines
    if (this.renderer.effects.scanlines.enabled) {
      this.applyScanlines(gl);
    }
  }

  private applyBloomEffect(gl: any): void {
    // Simplified bloom effect
    gl.save();
    gl.globalCompositeOperation = 'screen';
    gl.globalAlpha = 0.3;
    gl.filter = 'blur(2px)';
    gl.drawImage(gl.canvas, 0, 0);
    gl.restore();
  }

  private applyChromaticAberration(gl: any): void {
    // Simplified chromatic aberration
    const offset = this.renderer.effects.chromaticAberration.offset;
    
    gl.save();
    gl.globalCompositeOperation = 'screen';
    gl.globalAlpha = 0.5;
    
    // Red channel
    gl.fillStyle = 'rgba(255, 0, 0, 0.5)';
    gl.translate(-offset, 0);
    gl.drawImage(gl.canvas, 0, 0);
    
    // Blue channel
    gl.fillStyle = 'rgba(0, 0, 255, 0.5)';
    gl.translate(offset * 2, 0);
    gl.drawImage(gl.canvas, 0, 0);
    
    gl.restore();
  }

  private applyScanlines(gl: any): void {
    const density = this.renderer.effects.scanlines.density;
    const opacity = this.renderer.effects.scanlines.opacity;
    
    gl.save();
    gl.globalAlpha = opacity;
    
    for (let y = 0; y < gl.canvas.height; y += density) {
      gl.fillStyle = 'rgba(0, 255, 255, 0.1)';
      gl.fillRect(0, y, gl.canvas.width, 1);
    }
    
    gl.restore();
  }

  private setupInteractiveControls(): void {
    // Mouse/touch controls for holographic scene
    let isDragging = false;
    let previousMouse = { x: 0, y: 0 };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMouse = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - previousMouse.x;
      const deltaY = e.clientY - previousMouse.y;
      
      // Rotate camera
      this.camera.rotation.y += deltaX * 0.01;
      this.camera.rotation.x += deltaY * 0.01;
      
      previousMouse = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      // Zoom camera
      this.camera.zoom += e.deltaY * -0.001;
      this.camera.zoom = Math.max(0.5, Math.min(3, this.camera.zoom));
    };

    // Add event listeners
    this.canvas?.addEventListener('mousedown', handleMouseDown);
    this.canvas?.addEventListener('mousemove', handleMouseMove);
    this.canvas?.addEventListener('mouseup', handleMouseUp);
    this.canvas?.addEventListener('wheel', handleWheel);
  }

  // Public API methods
  async addOrderToVisualization(orderId: string): Promise<void> {
    try {
      const orderData = await this.fetchOrderData(orderId);
      const holographicOrder = await this.createHolographicOrder(orderData);
      this.scene.objects.push(holographicOrder);
    } catch (error) {
      console.error('Error adding order to visualization:', error);
    }
  }

  private async fetchOrderData(orderId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching order data:', error);
      return this.getMockOrderData(orderId);
    }
  }

  private getMockOrderData(orderId: string): any {
    return {
      order_id: orderId,
      product_name: 'iPhone 15 Pro',
      product_image: '/iphone-15-pro.jpg',
      order_status: 'shipped',
      created_at: '2024-01-15T10:00:00Z',
      confirmed_date: '2024-01-15T12:00:00Z',
      shipped_date: '2024-01-16T09:00:00Z',
      expected_delivery: '2024-01-18T14:00:00Z',
      actual_delivery: null
    };
  }

  stopHolographicVisualization(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }

  isVisualizationActive(): boolean {
    return this.animationId !== null;
  }

  getHolographicOrders(): HolographicOrder[] {
    return Array.from(this.holographicOrders.values());
  }

  // Special effects
  triggerExplosionEffect(position: { x: number; y: number; z: number }): void {
    const explosionParticles: Particle[] = [];
    
    for (let i = 0; i < 50; i++) {
      const particle = this.createParticle();
      particle.x = position.x;
      particle.y = position.y;
      particle.z = position.z;
      
      // Random explosion velocity
      const angle = (Math.PI * 2 * i) / 50;
      const speed = Math.random() * 0.1 + 0.05;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.vz = (Math.random() - 0.5) * speed;
      
      particle.color = this.getRandomHolographicColor();
      particle.size = Math.random() * 5 + 2;
      
      explosionParticles.push(particle);
    }
    
    this.particles.push(...explosionParticles);
  }

  triggerWaveEffect(): void {
    // Create a wave effect through all holographic orders
    this.holographicOrders.forEach((order, index) => {
      setTimeout(() => {
        order.scale = 1.5;
        order.glowIntensity = 2;
        
        setTimeout(() => {
          order.scale = 1;
          order.glowIntensity = 1;
        }, 300);
      }, index * 100);
    });
  }
}

export const holographicVisualizationService = new HolographicVisualizationService();
