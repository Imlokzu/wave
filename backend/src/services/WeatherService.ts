import axios from 'axios';

interface WeatherData {
  temperature: number;
  conditions: string;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  forecast: Array<{
    date: string;
    tempMax: number;
    tempMin: number;
    conditions: string;
  }>;
}

interface CityCoordinates {
  latitude: number;
  longitude: number;
  name: string;
  country: string;
}

export class WeatherService {
  private geocodingCache: Map<string, CityCoordinates> = new Map();

  /**
   * Get coordinates for a city using Open-Meteo Geocoding API
   */
  async getCityCoordinates(cityName: string): Promise<CityCoordinates | null> {
    try {
      const cacheKey = cityName.toLowerCase();
      if (this.geocodingCache.has(cacheKey)) {
        return this.geocodingCache.get(cacheKey)!;
      }

      console.log(`[Weather] Getting coordinates for: ${cityName}`);
      
      const response = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
        params: {
          name: cityName,
          count: 1,
          language: 'en',
          format: 'json'
        }
      });

      if (!response.data.results || response.data.results.length === 0) {
        console.log(`[Weather] City not found: ${cityName}`);
        return null;
      }

      const result = response.data.results[0];
      const coordinates: CityCoordinates = {
        latitude: result.latitude,
        longitude: result.longitude,
        name: result.name,
        country: result.country
      };

      this.geocodingCache.set(cacheKey, coordinates);
      console.log(`[Weather] Found coordinates:`, coordinates);
      
      return coordinates;
    } catch (error) {
      console.error('[Weather] Geocoding error:', error);
      return null;
    }
  }

  /**
   * Get weather condition description from WMO code
   */
  private getWeatherCondition(code: number): string {
    const conditions: { [key: number]: string } = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      77: 'Snow grains',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail'
    };
    return conditions[code] || 'Unknown';
  }

  /**
   * Get wind direction from degrees
   */
  private getWindDirection(degrees: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  }

  /**
   * Get current weather and forecast for a city
   */
  async getWeather(cityName: string): Promise<WeatherData | null> {
    try {
      // Get city coordinates
      const coordinates = await this.getCityCoordinates(cityName);
      if (!coordinates) {
        return null;
      }

      console.log(`[Weather] Fetching weather for ${coordinates.name}, ${coordinates.country}`);

      // Get weather data from Open-Meteo
      const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m',
          daily: 'weather_code,temperature_2m_max,temperature_2m_min',
          timezone: 'auto',
          forecast_days: 7
        }
      });

      const data = response.data;
      const current = data.current;
      const daily = data.daily;

      // Build weather data
      const weatherData: WeatherData = {
        temperature: Math.round(current.temperature_2m),
        conditions: this.getWeatherCondition(current.weather_code),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        windDirection: this.getWindDirection(current.wind_direction_10m),
        forecast: daily.time.slice(0, 7).map((date: string, i: number) => ({
          date: date,
          tempMax: Math.round(daily.temperature_2m_max[i]),
          tempMin: Math.round(daily.temperature_2m_min[i]),
          conditions: this.getWeatherCondition(daily.weather_code[i])
        }))
      };

      console.log(`[Weather] Current temperature: ${weatherData.temperature}°C`);
      return weatherData;
    } catch (error) {
      console.error('[Weather] API error:', error);
      return null;
    }
  }

  /**
   * Format weather data for AI consumption
   */
  formatWeatherForAI(cityName: string, weather: WeatherData): string {
    const forecast = weather.forecast.slice(0, 5).map(day => {
      const date = new Date(day.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      return `${dayName}: ${day.conditions}, High ${day.tempMax}°C, Low ${day.tempMin}°C`;
    }).join('\n');

    return `Current weather in ${cityName}:
Temperature: ${weather.temperature}°C
Conditions: ${weather.conditions}
Humidity: ${weather.humidity}%
Wind: ${weather.windSpeed} km/h ${weather.windDirection}

5-Day Forecast:
${forecast}`;
  }
}

// Singleton instance
let weatherServiceInstance: WeatherService | null = null;

export function getWeatherService(): WeatherService {
  if (!weatherServiceInstance) {
    weatherServiceInstance = new WeatherService();
  }
  return weatherServiceInstance;
}
