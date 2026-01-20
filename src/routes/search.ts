import { Router, Request, Response } from 'express';
import { getSearchService } from '../services/SearchService';
import { getLocationService } from '../services/LocationService';

export function createSearchRouter(): Router {
  const router = Router();
  const searchService = getSearchService();
  const locationService = getLocationService();

  /**
   * POST /api/search
   * Perform web search using DuckDuckGo with region detection
   * Now fetches full page content to prevent AI hallucination
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { query, maxResults = 3, fullContent = true } = req.body;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          error: 'Query is required and must be a string'
        });
      }

      console.log(`[Search API] Received search request: "${query}"`);

      // Detect user location from IP
      const clientIP = req.ip || req.socket.remoteAddress || '';
      const location = await locationService.getLocationFromIP(clientIP);
      
      let region: string | undefined;
      if (location) {
        region = locationService.getDuckDuckGoRegion(location.countryCode);
        console.log(`[Search API] User location: ${location.city}, ${location.country} (${location.countryCode}) -> Region: ${region}`);
      }

      // Use searchWithContent to get full page content (prevents hallucination)
      const results = fullContent 
        ? await searchService.searchWithContent(query, maxResults, region)
        : await searchService.searchDuckDuckGo(query, maxResults, region);

      res.json({
        success: true,
        query,
        results,
        count: results.length,
        fullContent,
        location: location ? {
          country: location.country,
          region: location.region,
          city: location.city
        } : undefined
      });
    } catch (error: any) {
      console.error('[Search API] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed',
        message: error.message
      });
    }
  });

  /**
   * GET /api/search/test
   * Test endpoint
   */
  router.get('/test', async (req: Request, res: Response) => {
    try {
      const testQuery = 'OpenAI GPT-4';
      const results = await searchService.searchDuckDuckGo(testQuery, 3);
      
      res.json({
        success: true,
        message: 'Search service is working',
        testQuery,
        results
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/search/location
   * Get user's detected location
   */
  router.get('/location', async (req: Request, res: Response) => {
    try {
      const clientIP = req.ip || req.socket.remoteAddress || '';
      const location = await locationService.getLocationFromIP(clientIP);
      
      if (location) {
        const region = locationService.getDuckDuckGoRegion(location.countryCode);
        res.json({
          success: true,
          location,
          searchRegion: region
        });
      } else {
        res.json({
          success: false,
          message: 'Could not detect location'
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
}
