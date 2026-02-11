import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { AuthService } from '../services/AuthService';
import { getIPTrackingService } from '../services/IPTrackingService';

/**
 * Sessions Router
 * Handles user session tracking and IP geolocation
 */
export function createSessionsRouter(authService: AuthService): Router {
  const router = Router();
  const ipTracking = getIPTrackingService();

  /**
   * GET /api/sessions/current
   * Get current user's active sessions
   */
  router.get('/current', requireAuth(authService), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const sessions = ipTracking.getActiveSessions(userId);

      res.json({
        sessions: sessions.map(s => ({
          ip: s.ip,
          location: {
            city: s.location.city,
            region: s.location.regionName,
            country: s.location.country,
            countryCode: s.location.countryCode,
            lat: s.location.lat,
            lon: s.location.lon,
          },
          browser: s.browser,
          os: s.os,
          device: s.device,
          loginTime: s.loginTime,
          lastActivity: s.lastActivity,
        })),
      });
    } catch (error: any) {
      console.error('[Sessions] Error getting sessions:', error);
      res.status(500).json({ error: 'Failed to get sessions' });
    }
  });

  /**
   * GET /api/sessions/history
   * Get current user's session history
   */
  router.get('/history', requireAuth(authService), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const sessions = ipTracking.getUserSessions(userId);

      res.json({
        sessions: sessions.map(s => ({
          ip: s.ip,
          location: {
            city: s.location.city,
            region: s.location.regionName,
            country: s.location.country,
            countryCode: s.location.countryCode,
            lat: s.location.lat,
            lon: s.location.lon,
          },
          browser: s.browser,
          os: s.os,
          device: s.device,
          loginTime: s.loginTime,
          lastActivity: s.lastActivity,
        })),
      });
    } catch (error: any) {
      console.error('[Sessions] Error getting history:', error);
      res.status(500).json({ error: 'Failed to get session history' });
    }
  });

  /**
   * DELETE /api/sessions/:ip
   * Terminate a specific session
   */
  router.delete('/:ip', requireAuth(authService), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const ip = req.params.ip;

      ipTracking.removeSession(userId, ip);

      res.json({ message: 'Session terminated' });
    } catch (error: any) {
      console.error('[Sessions] Error terminating session:', error);
      res.status(500).json({ error: 'Failed to terminate session' });
    }
  });

  /**
   * DELETE /api/sessions/all
   * Terminate all sessions except current
   */
  router.delete('/all', requireAuth(authService), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const currentIp = ipTracking.getIPFromRequest(req);

      const sessions = ipTracking.getUserSessions(userId);
      sessions.forEach(session => {
        if (session.ip !== currentIp) {
          ipTracking.removeSession(userId, session.ip);
        }
      });

      res.json({ message: 'All other sessions terminated' });
    } catch (error: any) {
      console.error('[Sessions] Error terminating sessions:', error);
      res.status(500).json({ error: 'Failed to terminate sessions' });
    }
  });

  /**
   * GET /api/sessions/map-data
   * Get data for displaying sessions on a map
   */
  router.get('/map-data', requireAuth(authService), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const sessions = ipTracking.getActiveSessions(userId);

      // Group sessions by location
      const locations = sessions.map(s => ({
        lat: s.location.lat,
        lon: s.location.lon,
        city: s.location.city,
        country: s.location.country,
        ip: s.ip,
        device: s.device,
        browser: s.browser,
        lastActivity: s.lastActivity,
      }));

      res.json({ locations });
    } catch (error: any) {
      console.error('[Sessions] Error getting map data:', error);
      res.status(500).json({ error: 'Failed to get map data' });
    }
  });

  /**
   * GET /api/sessions/stats (Admin only)
   * Get global session statistics
   */
  router.get('/stats', requireAuth(authService), async (req: AuthenticatedRequest, res: Response) => {
    try {
      // TODO: Add admin check
      const stats = ipTracking.getSessionStats();

      res.json({
        totalSessions: stats.totalSessions,
        activeSessions: stats.activeSessions,
        uniqueUsers: stats.uniqueUsers,
        topCountries: Array.from(stats.countries.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([country, count]) => ({ country, count })),
        topCities: Array.from(stats.cities.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([city, count]) => ({ city, count })),
      });
    } catch (error: any) {
      console.error('[Sessions] Error getting stats:', error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  });

  return router;
}
