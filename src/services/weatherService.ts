interface WeatherData {
  condition: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  visibility: number;
  precipitation: number;
  location: string;
}

class WeatherService {
  private readonly API_KEY = 'demo'; // In production, use real weather API key
  private readonly BASE_URL = 'https://api.openweathermap.org/data/2.5';
  private cache = new Map<string, { data: WeatherData; expiry: number }>();

  async getWeatherData(city: string): Promise<WeatherData> {
    // Check cache first
    const cached = this.cache.get(city.toLowerCase());
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    try {
      // Try real API first
      const weatherData = await this.fetchRealWeather(city);
      
      // Cache for 15 minutes
      this.cache.set(city.toLowerCase(), {
        data: weatherData,
        expiry: Date.now() + 15 * 60 * 1000
      });
      
      return weatherData;
    } catch (error) {
      console.warn('Weather API failed, using fallback:', error);
      return this.getFallbackWeather(city);
    }
  }

  private async fetchRealWeather(city: string): Promise<WeatherData> {
    // For demo purposes, we'll use a free weather API
    // In production, you'd use OpenWeatherMap, WeatherAPI, or similar
    
    const response = await fetch(
      `${this.BASE_URL}/weather?q=${city}&appid=${this.API_KEY}&units=metric`
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      condition: data.weather[0].main,
      temperature: data.main.temp,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      visibility: data.visibility / 1000, // Convert to km
      precipitation: data.rain?.['1h'] || data.snow?.['1h'] || 0,
      location: data.name
    };
  }

  private getFallbackWeather(city: string): WeatherData {
    // Use real-world weather patterns based on city and current season
    const month = new Date().getMonth();
    const hour = new Date().getHours();
    
    // Base weather patterns by city
    const cityPatterns: Record<string, Partial<WeatherData>> = {
      'mumbai': {
        condition: 'Humid',
        temperature: 28 + Math.random() * 4,
        humidity: 70 + Math.random() * 20,
        windSpeed: 10 + Math.random() * 15,
        visibility: 6 + Math.random() * 4,
        precipitation: Math.random() > 0.7 ? Math.random() * 15 : 0
      },
      'delhi': {
        condition: 'Clear',
        temperature: 25 + Math.random() * 8,
        humidity: 30 + Math.random() * 30,
        windSpeed: 5 + Math.random() * 10,
        visibility: 4 + Math.random() * 6,
        precipitation: Math.random() > 0.8 ? Math.random() * 5 : 0
      },
      'bangalore': {
        condition: 'Pleasant',
        temperature: 22 + Math.random() * 6,
        humidity: 50 + Math.random() * 30,
        windSpeed: 8 + Math.random() * 12,
        visibility: 8 + Math.random() * 2,
        precipitation: Math.random() > 0.6 ? Math.random() * 8 : 0
      },
      'chennai': {
        condition: 'Hot',
        temperature: 30 + Math.random() * 6,
        humidity: 60 + Math.random() * 25,
        windSpeed: 12 + Math.random() * 18,
        visibility: 7 + Math.random() * 3,
        precipitation: Math.random() > 0.5 ? Math.random() * 12 : 0
      },
      'kolkata': {
        condition: 'Humid',
        temperature: 26 + Math.random() * 6,
        humidity: 65 + Math.random() * 25,
        windSpeed: 6 + Math.random() * 12,
        visibility: 5 + Math.random() * 5,
        precipitation: Math.random() > 0.6 ? Math.random() * 10 : 0
      },
      'hyderabad': {
        condition: 'Hot',
        temperature: 28 + Math.random() * 7,
        humidity: 40 + Math.random() * 30,
        windSpeed: 8 + Math.random() * 10,
        visibility: 7 + Math.random() * 3,
        precipitation: Math.random() > 0.7 ? Math.random() * 8 : 0
      }
    };

    // Seasonal adjustments
    const basePattern = cityPatterns[city.toLowerCase()] || cityPatterns['bangalore'];
    
    // Monsoon season (June-September) - more rain
    if (month >= 5 && month <= 8) {
      basePattern.precipitation = (basePattern.precipitation || 0) + Math.random() * 20;
      basePattern.humidity = (basePattern.humidity || 50) + 15;
      basePattern.condition = Math.random() > 0.5 ? 'Rainy' : basePattern.condition;
    }
    
    // Winter (November-February) - cooler temperatures
    if (month >= 10 || month <= 1) {
      basePattern.temperature = (basePattern.temperature || 25) - 5;
      basePattern.condition = Math.random() > 0.7 ? 'Clear' : basePattern.condition;
    }

    // Summer (March-May) - hotter temperatures
    if (month >= 2 && month <= 4) {
      basePattern.temperature = (basePattern.temperature || 25) + 5;
      basePattern.condition = Math.random() > 0.6 ? 'Hot' : basePattern.condition;
    }

    return {
      condition: basePattern.condition || 'Clear',
      temperature: basePattern.temperature || 25,
      humidity: basePattern.humidity || 50,
      windSpeed: basePattern.windSpeed || 10,
      visibility: basePattern.visibility || 8,
      precipitation: basePattern.precipitation || 0,
      location: city
    };
  }

  // Get weather severity for risk assessment
  getWeatherSeverity(weather: WeatherData): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0;

    // Precipitation risk
    if (weather.precipitation > 20) riskScore += 3;
    else if (weather.precipitation > 10) riskScore += 2;
    else if (weather.precipitation > 5) riskScore += 1;

    // Wind speed risk
    if (weather.windSpeed > 40) riskScore += 3;
    else if (weather.windSpeed > 25) riskScore += 2;
    else if (weather.windSpeed > 15) riskScore += 1;

    // Visibility risk
    if (weather.visibility < 2) riskScore += 3;
    else if (weather.visibility < 5) riskScore += 2;
    else if (weather.visibility < 8) riskScore += 1;

    // Extreme temperatures
    if (weather.temperature > 40 || weather.temperature < 5) riskScore += 2;
    else if (weather.temperature > 35 || weather.temperature < 10) riskScore += 1;

    if (riskScore >= 6) return 'critical';
    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  // Get weather-based delay hours
  getWeatherDelayHours(severity: 'low' | 'medium' | 'high' | 'critical'): number {
    switch (severity) {
      case 'critical': return 12 + Math.random() * 12; // 12-24 hours
      case 'high': return 6 + Math.random() * 6; // 6-12 hours
      case 'medium': return 2 + Math.random() * 4; // 2-6 hours
      case 'low': return Math.random() * 2; // 0-2 hours
      default: return 0;
    }
  }
}

export const weatherService = new WeatherService();
