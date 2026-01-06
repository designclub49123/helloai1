import { supabase } from '@/integrations/supabase/client';

export interface DroneDelivery {
  id: string;
  orderId: string;
  droneId: string;
  pilotId: string;
  status: 'preparing' | 'taking_off' | 'in_flight' | 'approaching' | 'delivering' | 'delivered' | 'returning';
  currentPosition: {
    latitude: number;
    longitude: number;
    altitude: number;
    speed: number;
    heading: number;
  };
  route: DroneRoutePoint[];
  estimatedArrival: string;
  batteryLevel: number;
  weatherConditions: WeatherData;
  packageInfo: PackageInfo;
  droneSpecs: DroneSpecs;
  liveVideo: boolean;
  obstacles: Obstacle[];
}

export interface DroneRoutePoint {
  id: string;
  latitude: number;
  longitude: number;
  altitude: number;
  timestamp: string;
  waypointType: 'takeoff' | 'waypoint' | 'delivery' | 'landing';
  completed: boolean;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  visibility: number;
  precipitation: number;
  conditions: 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm';
}

export interface PackageInfo {
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  fragile: boolean;
  temperatureSensitive: boolean;
  specialHandling: string[];
}

export interface DroneSpecs {
  model: string;
  maxSpeed: number;
  maxAltitude: number;
  maxRange: number;
  batteryCapacity: number;
  payloadCapacity: number;
  flightTime: number;
  cameras: string[];
  sensors: string[];
}

export interface Obstacle {
  id: string;
  type: 'building' | 'bird' | 'aircraft' | 'weather' | 'no_fly_zone';
  position: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
  distance: number;
  threatLevel: 'low' | 'medium' | 'high';
}

export interface DroneTelemetry {
  timestamp: string;
  batteryVoltage: number;
  motorSpeeds: number[];
  gpsSignal: number;
  imuData: {
    accelerometer: { x: number; y: number; z: number };
    gyroscope: { x: number; y: number; z: number };
    magnetometer: { x: number; y: number; z: number };
  };
  systemHealth: {
    motors: boolean[];
    sensors: boolean[];
    communication: boolean;
  };
}

class DroneDeliveryTrackingService {
  private activeDeliveries: Map<string, DroneDelivery> = new Map();
  private telemetryData: Map<string, DroneTelemetry[]> = new Map();
  private websocket: WebSocket | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private mapInstance: any = null;
  private isTracking: boolean = false;

  constructor() {
    this.initializeWebSocketConnection();
    this.startRealTimeUpdates();
  }

  private initializeWebSocketConnection(): void {
    try {
      // Connect to drone tracking WebSocket
      this.websocket = new WebSocket('wss://api.drone-tracking.com/live');
      
      this.websocket.onopen = () => {
        console.log('Drone tracking WebSocket connected');
        this.subscribeToDroneUpdates();
      };
      
      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleDroneUpdate(data);
      };
      
      this.websocket.onerror = (error) => {
        console.error('Drone tracking WebSocket error:', error);
        this.handleConnectionError();
      };
      
      this.websocket.onclose = () => {
        console.log('Drone tracking WebSocket disconnected');
        this.attemptReconnection();
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket connection:', error);
    }
  }

  private subscribeToDroneUpdates(): void {
    if (!this.websocket) return;
    
    const subscription = {
      type: 'subscribe',
      channels: ['drone_positions', 'telemetry', 'weather', 'obstacles'],
      filters: {
        status: ['in_flight', 'approaching', 'delivering']
      }
    };
    
    this.websocket.send(JSON.stringify(subscription));
  }

  private handleDroneUpdate(data: any): void {
    switch (data.type) {
      case 'position_update':
        this.updateDronePosition(data.droneId, data.position);
        break;
      case 'telemetry_update':
        this.updateTelemetryData(data.droneId, data.telemetry);
        break;
      case 'status_change':
        this.updateDroneStatus(data.droneId, data.status);
        break;
      case 'obstacle_detected':
        this.handleObstacleDetection(data.obstacle);
        break;
      case 'weather_update':
        this.updateWeatherConditions(data.droneId, data.weather);
        break;
    }
  }

  private updateDronePosition(droneId: string, position: any): void {
    this.activeDeliveries.forEach(delivery => {
      if (delivery.droneId === droneId) {
        delivery.currentPosition = {
          latitude: position.latitude,
          longitude: position.longitude,
          altitude: position.altitude,
          speed: position.speed,
          heading: position.heading
        };
        
        // Update estimated arrival time
        this.calculateEstimatedArrival(delivery);
        
        // Check for route deviations
        this.checkRouteDeviation(delivery);
        
        // Update map visualization
        this.updateDroneOnMap(delivery);
      }
    });
  }

  private updateTelemetryData(droneId: string, telemetry: DroneTelemetry): void {
    if (!this.telemetryData.has(droneId)) {
      this.telemetryData.set(droneId, []);
    }
    
    const telemetryHistory = this.telemetryData.get(droneId)!;
    telemetryHistory.push(telemetry);
    
    // Keep only last 100 telemetry records
    if (telemetryHistory.length > 100) {
      telemetryHistory.shift();
    }
    
    // Check for system alerts
    this.checkSystemAlerts(droneId, telemetry);
  }

  private updateDroneStatus(droneId: string, status: string): void {
    this.activeDeliveries.forEach(delivery => {
      if (delivery.droneId === droneId) {
        delivery.status = status as DroneDelivery['status'];
        
        // Trigger status-specific actions
        this.handleStatusChange(delivery, status);
      }
    });
  }

  private handleObstacleDetection(obstacle: Obstacle): void {
    // Find nearby deliveries
    this.activeDeliveries.forEach(delivery => {
      const distance = this.calculateDistance(
        delivery.currentPosition,
        obstacle.position
      );
      
      if (distance < 1000) { // Within 1km
        delivery.obstacles.push(obstacle);
        
        // Trigger collision avoidance
        if (obstacle.threatLevel === 'high') {
          this.triggerCollisionAvoidance(delivery, obstacle);
        }
      }
    });
  }

  private updateWeatherConditions(droneId: string, weather: WeatherData): void {
    this.activeDeliveries.forEach(delivery => {
      if (delivery.droneId === droneId) {
        delivery.weatherConditions = weather;
        
        // Check weather safety
        if (!this.isWeatherSafeForFlight(weather)) {
          this.triggerWeatherAlert(delivery, weather);
        }
      }
    });
  }

  private calculateEstimatedArrival(delivery: DroneDelivery): void {
    const remainingDistance = this.calculateRemainingDistance(delivery);
    const currentSpeed = delivery.currentPosition.speed || 10; // m/s
    
    const estimatedTimeSeconds = remainingDistance / currentSpeed;
    const arrivalTime = new Date(Date.now() + estimatedTimeSeconds * 1000);
    
    delivery.estimatedArrival = arrivalTime.toISOString();
  }

  private checkRouteDeviation(delivery: DroneDelivery): void {
    const currentPoint = {
      latitude: delivery.currentPosition.latitude,
      longitude: delivery.currentPosition.longitude
    };
    
    // Find the nearest route point
    let nearestPoint = null;
    let minDistance = Infinity;
    
    delivery.route.forEach(point => {
      if (!point.completed) {
        const distance = this.calculateDistance(currentPoint, point);
        if (distance < minDistance) {
          minDistance = distance;
          nearestPoint = point;
        }
      }
    });
    
    // Check if drone is too far from route
    if (minDistance > 500) { // 500 meters deviation
      this.triggerRouteDeviationAlert(delivery, nearestPoint);
    }
  }

  private checkSystemAlerts(droneId: string, telemetry: DroneTelemetry): void {
    const alerts = [];
    
    // Battery alert
    if (telemetry.batteryVoltage < 10.5) {
      alerts.push({
        type: 'low_battery',
        severity: 'high',
        message: 'Critical battery level - immediate landing required'
      });
    } else if (telemetry.batteryVoltage < 11.5) {
      alerts.push({
        type: 'low_battery',
        severity: 'medium',
        message: 'Low battery - consider returning to base'
      });
    }
    
    // Motor alerts
    telemetry.systemHealth.motors.forEach((motor, index) => {
      if (!motor) {
        alerts.push({
          type: 'motor_failure',
          severity: 'critical',
          message: `Motor ${index + 1} failure detected`
        });
      }
    });
    
    // Sensor alerts
    telemetry.systemHealth.sensors.forEach((sensor, index) => {
      if (!sensor) {
        alerts.push({
          type: 'sensor_failure',
          severity: 'high',
          message: `Sensor ${index + 1} malfunction detected`
        });
      }
    });
    
    // GPS signal alert
    if (telemetry.gpsSignal < 50) {
      alerts.push({
        type: 'poor_gps',
        severity: 'medium',
        message: 'Weak GPS signal - position accuracy reduced'
      });
    }
    
    if (alerts.length > 0) {
      this.triggerSystemAlerts(droneId, alerts);
    }
  }

  private isWeatherSafeForFlight(weather: WeatherData): boolean {
    return (
      weather.windSpeed < 15 && // Wind speed < 15 m/s
      weather.visibility > 1000 && // Visibility > 1km
      weather.precipitation < 5 && // Precipitation < 5mm/h
      !['storm', 'heavy_rain', 'snow'].includes(weather.conditions)
    );
  }

  private triggerCollisionAvoidance(delivery: DroneDelivery, obstacle: Obstacle): void {
    // Calculate avoidance maneuver
    const avoidanceVector = this.calculateAvoidanceVector(delivery, obstacle);
    
    // Send avoidance command to drone
    this.sendDroneCommand(delivery.droneId, {
      type: 'avoidance_maneuver',
      vector: avoidanceVector,
      priority: 'high'
    });
    
    // Notify ground control
    this.notifyGroundControl({
      type: 'collision_avoidance',
      droneId: delivery.droneId,
      obstacle,
      action: 'avoidance_maneuver'
    });
  }

  private triggerWeatherAlert(delivery: DroneDelivery, weather: WeatherData): void {
    this.sendDroneCommand(delivery.droneId, {
      type: 'weather_alert',
      severity: 'high',
      action: 'return_to_base',
      reason: 'Unsafe weather conditions'
    });
    
    this.notifyGroundControl({
      type: 'weather_alert',
      droneId: delivery.droneId,
      weather,
      action: 'return_to_base'
    });
  }

  private triggerRouteDeviationAlert(delivery: DroneDelivery, nearestPoint: any): void {
    this.sendDroneCommand(delivery.droneId, {
      type: 'route_correction',
      targetPoint: nearestPoint,
      priority: 'medium'
    });
    
    this.notifyGroundControl({
      type: 'route_deviation',
      droneId: delivery.droneId,
      currentPosition: delivery.currentPosition,
      nearestPoint
    });
  }

  private triggerSystemAlerts(droneId: string, alerts: any[]): void {
    alerts.forEach(alert => {
      this.notifyGroundControl({
        type: 'system_alert',
        droneId,
        alert
      });
    });
  }

  private calculateAvoidanceVector(delivery: DroneDelivery, obstacle: Obstacle): any {
    const currentPos = delivery.currentPosition;
    const obstaclePos = obstacle.position;
    
    // Calculate perpendicular avoidance vector
    const dx = obstaclePos.longitude - currentPos.longitude;
    const dy = obstaclePos.latitude - currentPos.latitude;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize and scale avoidance vector
    const avoidanceDistance = 100; // 100 meters
    const avoidX = (-dy / distance) * avoidanceDistance;
    const avoidY = (dx / distance) * avoidanceDistance;
    
    return {
      latitude: currentPos.latitude + avoidY,
      longitude: currentPos.longitude + avoidX,
      altitude: currentPos.altitude + 20 // Climb 20 meters
    };
  }

  private calculateDistance(point1: any, point2: any): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private calculateRemainingDistance(delivery: DroneDelivery): number {
    let totalDistance = 0;
    let currentPos = delivery.currentPosition;
    
    for (const point of delivery.route) {
      if (!point.completed) {
        totalDistance += this.calculateDistance(currentPos, point);
        currentPos = point;
      }
    }
    
    return totalDistance;
  }

  private sendDroneCommand(droneId: string, command: any): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'drone_command',
        droneId,
        command,
        timestamp: new Date().toISOString()
      }));
    }
  }

  private notifyGroundControl(notification: any): void {
    // Send notification to ground control system
    console.log('Ground Control Notification:', notification);
    
    // Could also send to a monitoring dashboard
    this.sendAlertToDashboard(notification);
  }

  private sendAlertToDashboard(alert: any): void {
    // Implementation for dashboard alerts
    const alertElement = document.createElement('div');
    alertElement.className = 'drone-alert';
    alertElement.innerHTML = `
      <div class="alert-content">
        <h3>${alert.type.replace('_', ' ').toUpperCase()}</h3>
        <p>Drone: ${alert.droneId}</p>
        <p>Time: ${new Date().toLocaleTimeString()}</p>
      </div>
    `;
    
    document.body.appendChild(alertElement);
    
    setTimeout(() => {
      alertElement.remove();
    }, 5000);
  }

  private handleStatusChange(delivery: DroneDelivery, newStatus: string): void {
    switch (newStatus) {
      case 'taking_off':
        this.triggerTakeoffEffect(delivery);
        break;
      case 'in_flight':
        this.startFlightTracking(delivery);
        break;
      case 'approaching':
        this.triggerApproachAlert(delivery);
        break;
      case 'delivering':
        this.triggerDeliverySequence(delivery);
        break;
      case 'delivered':
        this.triggerDeliveryComplete(delivery);
        break;
    }
  }

  private triggerTakeoffEffect(delivery: DroneDelivery): void {
    // Visual effect for drone takeoff
    console.log(`Drone ${delivery.droneId} taking off with order ${delivery.orderId}`);
  }

  private startFlightTracking(delivery: DroneDelivery): void {
    // Start detailed flight tracking
    console.log(`Tracking flight for drone ${delivery.droneId}`);
  }

  private triggerApproachAlert(delivery: DroneDelivery): void {
    // Notify customer of approaching drone
    this.notifyCustomerApproaching(delivery);
  }

  private triggerDeliverySequence(delivery: DroneDelivery): void {
    // Start automated delivery sequence
    console.log(`Starting delivery sequence for drone ${delivery.droneId}`);
  }

  private triggerDeliveryComplete(delivery: DroneDelivery): void {
    // Mark delivery as complete
    console.log(`Delivery complete for order ${delivery.orderId}`);
    this.updateOrderStatus(delivery.orderId, 'delivered');
  }

  private notifyCustomerApproaching(delivery: DroneDelivery): void {
    // Send notification to customer
    console.log(`Notifying customer: Drone approaching with order ${delivery.orderId}`);
  }

  private async updateOrderStatus(orderId: string, status: string): Promise<void> {
    try {
      await supabase
        .from('orders')
        .update({ order_status: status, updated_at: new Date().toISOString() })
        .eq('order_id', orderId);
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  }

  private startRealTimeUpdates(): void {
    this.updateInterval = setInterval(() => {
      this.updateAllDeliveries();
    }, 1000); // Update every second
  }

  private updateAllDeliveries(): void {
    this.activeDeliveries.forEach(delivery => {
      // Update position based on current speed and heading
      if (delivery.status === 'in_flight') {
        this.updatePositionBasedOnSpeed(delivery);
      }
      
      // Update battery level
      this.updateBatteryLevel(delivery);
      
      // Check for new obstacles
      this.scanForObstacles(delivery);
    });
  }

  private updatePositionBasedOnSpeed(delivery: DroneDelivery): void {
    const speed = delivery.currentPosition.speed; // m/s
    const heading = delivery.currentPosition.heading; // degrees
    const timeDelta = 1; // 1 second
    
    const distance = speed * timeDelta; // meters
    const headingRad = heading * Math.PI / 180;
    
    // Update position (simplified)
    const deltaLat = (distance * Math.cos(headingRad)) / 111320; // meters to degrees
    const deltaLon = (distance * Math.sin(headingRad)) / (111320 * Math.cos(delivery.currentPosition.latitude * Math.PI / 180));
    
    delivery.currentPosition.latitude += deltaLat;
    delivery.currentPosition.longitude += deltaLon;
  }

  private updateBatteryLevel(delivery: DroneDelivery): void {
    // Simulate battery drain
    const drainRate = 0.01; // 1% per minute
    delivery.batteryLevel = Math.max(0, delivery.batteryLevel - drainRate / 60);
  }

  private scanForObstacles(delivery: DroneDelivery): void {
    // Simulate obstacle scanning
    if (Math.random() < 0.01) { // 1% chance per update
      const obstacle: Obstacle = {
        id: Math.random().toString(36).substr(2, 9),
        type: ['bird', 'aircraft', 'weather'][Math.floor(Math.random() * 3)] as Obstacle['type'],
        position: {
          latitude: delivery.currentPosition.latitude + (Math.random() - 0.5) * 0.01,
          longitude: delivery.currentPosition.longitude + (Math.random() - 0.5) * 0.01,
          altitude: delivery.currentPosition.altitude + (Math.random() - 0.5) * 50
        },
        distance: Math.random() * 1000,
        threatLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as Obstacle['threatLevel']
      };
      
      this.handleObstacleDetection(obstacle);
    }
  }

  private handleConnectionError(): void {
    console.log('Attempting to reconnect to drone tracking...');
    setTimeout(() => {
      this.initializeWebSocketConnection();
    }, 5000);
  }

  private attemptReconnection(): void {
    setTimeout(() => {
      console.log('Attempting to reconnect to drone tracking...');
      this.initializeWebSocketConnection();
    }, 3000);
  }

  // Public API methods
  async startDroneDelivery(orderId: string): Promise<DroneDelivery> {
    try {
      // Create drone delivery
      const delivery: DroneDelivery = {
        id: Math.random().toString(36).substr(2, 9),
        orderId,
        droneId: `DRONE-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        pilotId: `PILOT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        status: 'preparing',
        currentPosition: {
          latitude: 19.0760, // Mumbai coordinates
          longitude: 72.8777,
          altitude: 0,
          speed: 0,
          heading: 0
        },
        route: await this.generateDeliveryRoute(orderId),
        estimatedArrival: '',
        batteryLevel: 100,
        weatherConditions: await this.getCurrentWeather(),
        packageInfo: await this.getPackageInfo(orderId),
        droneSpecs: await this.getDroneSpecs(),
        liveVideo: true,
        obstacles: []
      };

      this.activeDeliveries.set(delivery.id, delivery);
      
      // Start delivery sequence
      await this.initiateDeliverySequence(delivery);
      
      return delivery;
    } catch (error) {
      console.error('Error starting drone delivery:', error);
      throw error;
    }
  }

  private async generateDeliveryRoute(orderId: string): Promise<DroneRoutePoint[]> {
    // Generate optimized flight route
    const orderData = await this.getOrderData(orderId);
    const destination = {
      latitude: orderData.customer_latitude || 19.0760,
      longitude: orderData.customer_longitude || 72.8777
    };

    return [
      {
        id: '1',
        latitude: 19.0760,
        longitude: 72.8777,
        altitude: 50,
        timestamp: new Date().toISOString(),
        waypointType: 'takeoff',
        completed: false
      },
      {
        id: '2',
        latitude: destination.latitude,
        longitude: destination.longitude,
        altitude: 100,
        timestamp: new Date(Date.now() + 600000).toISOString(),
        waypointType: 'delivery',
        completed: false
      },
      {
        id: '3',
        latitude: 19.0760,
        longitude: 72.8777,
        altitude: 0,
        timestamp: new Date(Date.now() + 1200000).toISOString(),
        waypointType: 'landing',
        completed: false
      }
    ];
  }

  private async getCurrentWeather(): Promise<WeatherData> {
    // Simulate weather data
    return {
      temperature: 25,
      humidity: 60,
      windSpeed: 5,
      windDirection: 180,
      visibility: 10000,
      precipitation: 0,
      conditions: 'clear'
    };
  }

  private async getPackageInfo(orderId: string): Promise<PackageInfo> {
    // Get package information from order
    return {
      weight: 0.5,
      dimensions: {
        length: 20,
        width: 15,
        height: 10
      },
      fragile: false,
      temperatureSensitive: false,
      specialHandling: []
    };
  }

  private async getDroneSpecs(): Promise<DroneSpecs> {
    return {
      model: 'ARKIO-Delivery-X1',
      maxSpeed: 20,
      maxAltitude: 500,
      maxRange: 25000,
      batteryCapacity: 5000,
      payloadCapacity: 5,
      flightTime: 30,
      cameras: ['4K', 'Thermal', 'Night Vision'],
      sensors: ['GPS', 'LiDAR', 'Ultrasonic', 'IMU']
    };
  }

  private async getOrderData(orderId: string): Promise<any> {
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
      return {};
    }
  }

  private async initiateDeliverySequence(delivery: DroneDelivery): Promise<void> {
    // Simulate delivery sequence
    setTimeout(() => {
      delivery.status = 'taking_off';
      this.updateDroneStatus(delivery.droneId, 'taking_off');
    }, 5000);

    setTimeout(() => {
      delivery.status = 'in_flight';
      this.updateDroneStatus(delivery.droneId, 'in_flight');
    }, 10000);

    setTimeout(() => {
      delivery.status = 'approaching';
      this.updateDroneStatus(delivery.droneId, 'approaching');
    }, 300000); // 5 minutes

    setTimeout(() => {
      delivery.status = 'delivering';
      this.updateDroneStatus(delivery.droneId, 'delivering');
    }, 360000); // 6 minutes

    setTimeout(() => {
      delivery.status = 'delivered';
      this.updateDroneStatus(delivery.droneId, 'delivered');
    }, 420000); // 7 minutes
  }

  getActiveDeliveries(): DroneDelivery[] {
    return Array.from(this.activeDeliveries.values());
  }

  getDeliveryById(deliveryId: string): DroneDelivery | undefined {
    return this.activeDeliveries.get(deliveryId);
  }

  getTelemetryData(droneId: string): DroneTelemetry[] {
    return this.telemetryData.get(droneId) || [];
  }

  isTrackingActive(): boolean {
    return this.isTracking;
  }

  stopTracking(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.isTracking = false;
  }
}

export const droneDeliveryTrackingService = new DroneDeliveryTrackingService();
