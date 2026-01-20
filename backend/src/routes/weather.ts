import { Router, Request, Response } from 'express';
import { getWeatherService } from '../services/WeatherService';

const router = Router();
const weatherService = getWeatherService();

/**
 * POST /api/weather
 * Get weather for a city
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { city } = req.body;

    if (!city) {
      return res.status(400).json({
        success: false,
        error: 'City name is required'
      });
    }

    console.log(`[Weather API] Getting weather for: ${city}`);

    const weather = await weatherService.getWeather(city);

    if (!weather) {
      return res.json({
        success: false,
        error: 'City not found or weather data unavailable'
      });
    }

    const formatted = weatherService.formatWeatherForAI(city, weather);

    res.json({
      success: true,
      weather,
      formatted,
      city
    });
  } catch (error: any) {
    console.error('[Weather API] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Weather service error'
    });
  }
});

export default router;
