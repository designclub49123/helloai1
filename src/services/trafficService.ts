interface TrafficData {
  congestionLevel: number;
  incidents: string[];
  roadConditions: string;
  peakHours: boolean;
  location: string;
}

class TrafficService {
  private readonly API_KEY = 'demo'; // In production, use real traffic API key
  private cache = new Map<string, { data: TrafficData; expiry: number }>();

  async getTrafficData(city: string): Promise<TrafficData> {
    // Check cache first
    const cached = this.cache.get(city.toLowerCase());
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    try {
      // Try real API first
      const trafficData = await this.fetchRealTraffic(city);
      
      // Cache for 10 minutes
      this.cache.set(city.toLowerCase(), {
        data: trafficData,
        expiry: Date.now() + 10 * 60 * 1000
      });
      
      return trafficData;
    } catch (error) {
      console.warn('Traffic API failed, using fallback:', error);
      return this.getFallbackTraffic(city);
    }
  }

  private async fetchRealTraffic(city: string): Promise<TrafficData> {
    // For demo purposes, simulate real traffic API
    // In production, you'd use Google Maps API, TomTom, or similar
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return this.getFallbackTraffic(city);
  }

  private getFallbackTraffic(city: string): TrafficData {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Peak hours: 8-10 AM and 5-7 PM on weekdays
    const isMorningPeak = hour >= 8 && hour <= 10 && !isWeekend;
    const isEveningPeak = hour >= 17 && hour <= 19 && !isWeekend;
    const peakHours = isMorningPeak || isEveningPeak;

    // Base traffic patterns by city
    const cityPatterns: Record<string, Partial<TrafficData>> = {
      'mumbai': {
        congestionLevel: peakHours ? 85 : 60,
        incidents: this.generateIncidents(peakHours ? 2 : 1),
        roadConditions: peakHours ? 'Heavy' : 'Moderate'
      },
      'delhi': {
        congestionLevel: peakHours ? 90 : 65,
        incidents: this.generateIncidents(peakHours ? 3 : 1),
        roadConditions: peakHours ? 'Very Heavy' : 'Moderate'
      },
      'bangalore': {
        congestionLevel: peakHours ? 75 : 50,
        incidents: this.generateIncidents(peakHours ? 1 : 0),
        roadConditions: peakHours ? 'Heavy' : 'Light'
      },
      'chennai': {
        congestionLevel: peakHours ? 70 : 45,
        incidents: this.generateIncidents(peakHours ? 1 : 0),
        roadConditions: peakHours ? 'Moderate' : 'Light'
      },
      'kolkata': {
        congestionLevel: peakHours ? 80 : 55,
        incidents: this.generateIncidents(peakHours ? 2 : 1),
        roadConditions: peakHours ? 'Heavy' : 'Moderate'
      },
      'hyderabad': {
        congestionLevel: peakHours ? 75 : 50,
        incidents: this.generateIncidents(peakHours ? 1 : 0),
        roadConditions: peakHours ? 'Moderate' : 'Light'
      }
    };

    const basePattern = cityPatterns[city.toLowerCase()] || cityPatterns['bangalore'];

    // Add some randomness
    const congestionLevel = Math.max(20, Math.min(95, 
      (basePattern.congestionLevel || 50) + (Math.random() - 0.5) * 20));

    return {
      congestionLevel: Math.round(congestionLevel),
      incidents: basePattern.incidents || [],
      roadConditions: basePattern.roadConditions || 'Moderate',
      peakHours,
      location: city
    };
  }

  private generateIncidents(count: number): string[] {
    const incidentTypes = [
      'Accident on main highway',
      'Road construction work',
      'Vehicle breakdown',
      'Water logging',
      'Signal failure',
      'Protest demonstration',
      'Tree fallen on road',
      'Bridge maintenance'
    ];

    const incidents: string[] = [];
    for (let i = 0; i < count; i++) {
      const randomIncident = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
      if (!incidents.includes(randomIncident)) {
        incidents.push(randomIncident);
      }
    }
    return incidents;
  }

  // Get traffic severity for risk assessment
  getTrafficSeverity(traffic: TrafficData): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0;

    // Congestion level risk
    if (traffic.congestionLevel > 85) riskScore += 3;
    else if (traffic.congestionLevel > 70) riskScore += 2;
    else if (traffic.congestionLevel > 50) riskScore += 1;

    // Incidents risk
    if (traffic.incidents.length > 2) riskScore += 2;
    else if (traffic.incidents.length > 0) riskScore += 1;

    // Peak hours risk
    if (traffic.peakHours) riskScore += 1;

    if (riskScore >= 5) return 'critical';
    if (riskScore >= 3) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  // Get traffic-based delay hours
  getTrafficDelayHours(severity: 'low' | 'medium' | 'high' | 'critical'): number {
    switch (severity) {
      case 'critical': return 8 + Math.random() * 8; // 8-16 hours
      case 'high': return 4 + Math.random() * 4; // 4-8 hours
      case 'medium': return 2 + Math.random() * 2; // 2-4 hours
      case 'low': return Math.random() * 2; // 0-2 hours
      default: return 0;
    }
  }

  // Get real-time traffic conditions for specific routes
  async getRouteTraffic(origin: string, destination: string): Promise<{
    estimatedTravelTime: number;
    normalTravelTime: number;
    delayMinutes: number;
    congestionLevel: number;
  }> {
    // Simulate route analysis
    const normalTravelTime = 30 + Math.random() * 60; // 30-90 minutes
    const currentTraffic = await this.getTrafficData(origin);
    
    const delayMultiplier = 1 + (currentTraffic.congestionLevel / 100) * 0.5;
    const estimatedTravelTime = normalTravelTime * delayMultiplier;
    const delayMinutes = estimatedTravelTime - normalTravelTime;

    return {
      estimatedTravelTime: Math.round(estimatedTravelTime),
      normalTravelTime: Math.round(normalTravelTime),
      delayMinutes: Math.round(delayMinutes),
      congestionLevel: currentTraffic.congestionLevel
    };
  }
}

export const trafficService = new TrafficService();
