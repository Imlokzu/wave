import axios from 'axios';
import { Request } from 'express';

/**
 * IP Geolocation Data
 */
export interface IPLocation {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  query?: string;
}

/**
 * User Session with Location
 */
export interface UserSession {
  userId: string;
  username: string;
  ip: string;
  location: IPLocation;
  userAgent: string;
  browser: string;
  os: string;
  device: string;
  loginTime: Date;
  lastActivity: Date;
}

/**
 * IP Tracking Service
 * Tracks user IP addresses and provides geolocation data
 * 
 * Uses ip-api.com (free, no API key required)
 * Limit: 45 requests per minute
 */
export class IPTrackingService {
  private sessions: Map<string, UserSession[]> = new Map();
  private ipCache: Map<string, IPLocation> = new Map();
  private readonly API_URL = 'http://ip-api.com/json';

  /**
   * Get IP address from request
   * Handles proxies and load balancers
   */
  getIPFromRequest(req: Request): string {
    // Check for proxy headers
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = (forwarded as string).split(',');
      return ips[0].trim();
    }

    // Check for Cloudflare
    const cfConnectingIp = req.headers['cf-connecting-ip'];
    if (cfConnectingIp) {
      return cfConnectingIp as string;
    }

    // Check for other proxy headers
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return realIp as string;
    }

    // Fallback to socket IP
    return req.socket.remoteAddress || 'unknown';
  }

  /**
   * Get geolocation data for an IP address
   */
  async getIPLocation(ip: string): Promise<IPLocation | null> {
    // Check cache first
    if (this.ipCache.has(ip)) {
      return this.ipCache.get(ip)!;
    }

    // Skip localhost and private IPs
    if (this.isPrivateIP(ip)) {
      return this.getMockLocation(ip);
    }

    try {
      const response = await axios.get(`${this.API_URL}/${ip}`, {
        timeout: 5000,
      });

      if (response.data.status === 'success') {
        const location: IPLocation = {
          ip,
          country: response.data.country || 'Unknown',
          countryCode: response.data.countryCode || 'XX',
          region: response.data.region || '',
          regionName: response.data.regionName || '',
          city: response.data.city || 'Unknown',
          zip: response.data.zip || '',
          lat: response.data.lat || 0,
          lon: response.data.lon || 0,
          timezone: response.data.timezone || '',
          isp: response.data.isp || '',
          org: response.data.org || '',
          as: response.data.as || '',
        };

        // Cache for 1 hour
        this.ipCache.set(ip, location);
        setTimeout(() => this.ipCache.delete(ip), 60 * 60 * 1000);

        return location;
      }

      return null;
    } catch (error) {
      console.error('[IPTracking] Failed to get location:', error);
      return null;
    }
  }

  /**
   * Check if IP is private/local
   */
  private isPrivateIP(ip: string): boolean {
    if (ip === 'unknown' || ip === '::1' || ip === '127.0.0.1') {
      return true;
    }

    // Check for private IP ranges
    const parts = ip.split('.');
    if (parts.length === 4) {
      const first = parseInt(parts[0], 10);
      const second = parseInt(parts[1], 10);

      // 10.0.0.0 - 10.255.255.255
      if (first === 10) return true;

      // 172.16.0.0 - 172.31.255.255
      if (first === 172 && second >= 16 && second <= 31) return true;

      // 192.168.0.0 - 192.168.255.255
      if (first === 192 && second === 168) return true;
    }

    return false;
  }

  /**
   * Get mock location for private IPs (development)
   */
  private getMockLocation(ip: string): IPLocation {
    return {
      ip,
      country: 'Local',
      countryCode: 'LC',
      region: 'DEV',
      regionName: 'Development',
      city: 'Localhost',
      zip: '00000',
      lat: 0,
      lon: 0,
      timezone: 'UTC',
      isp: 'Local Network',
      org: 'Development',
      as: 'AS0',
    };
  }

  /**
   * Parse user agent to get browser, OS, and device info
   */
  parseUserAgent(userAgent: string): { browser: string; os: string; device: string } {
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Desktop';

    // Detect browser
    if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('Opera')) browser = 'Opera';

    // Detect OS
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac OS')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

    // Detect device
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      device = 'Mobile';
    } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      device = 'Tablet';
    }

    return { browser, os, device };
  }

  /**
   * Track user session
   */
  async trackSession(userId: string, username: string, req: Request, userEmail?: string): Promise<UserSession> {
    const ip = this.getIPFromRequest(req);
    const location = await this.getIPLocation(ip);
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const { browser, os, device } = this.parseUserAgent(userAgent);

    const session: UserSession = {
      userId,
      username,
      ip,
      location: location || this.getMockLocation(ip),
      userAgent,
      browser,
      os,
      device,
      loginTime: new Date(),
      lastActivity: new Date(),
    };

    // Check if this is a new device/location
    const isNewDevice = await this.isNewDevice(userId, ip, device, browser);

    // Store session
    const userSessions = this.sessions.get(userId) || [];
    userSessions.push(session);
    this.sessions.set(userId, userSessions);

    console.log(`[IPTracking] Session tracked: ${username} from ${ip} (${location?.city}, ${location?.country})`);

    // Send email alert for new device (async, don't wait)
    if (isNewDevice && userEmail) {
      this.sendNewDeviceAlert(session, userEmail).catch(err => {
        console.error('[IPTracking] Failed to send new device alert:', err);
      });
    }

    return session;
  }

  /**
   * Check if this is a new device for the user
   */
  private async isNewDevice(userId: string, ip: string, device: string, browser: string): Promise<boolean> {
    const existingSessions = this.sessions.get(userId) || [];
    
    // Check if we've seen this IP + device + browser combination before
    const seenBefore = existingSessions.some(s => 
      s.ip === ip && 
      s.device === device && 
      s.browser === browser
    );

    return !seenBefore;
  }

  /**
   * Send new device alert email
   */
  private async sendNewDeviceAlert(session: UserSession, userEmail: string): Promise<void> {
    try {
      // Import EmailService dynamically to avoid circular dependency
      const { getEmailService } = await import('./EmailService');
      const emailService = getEmailService();
      
      console.log(`[IPTracking] Sending new device alert to ${userEmail} for ${session.username}`);
      
      await emailService.sendNewDeviceAlert(
        userEmail,
        session.username,
        {
          device: session.device,
          browser: session.browser,
          os: session.os,
          ip: session.ip,
          location: `${session.location.city}, ${session.location.country}`,
          city: session.location.city,
          country: session.location.country,
          time: session.loginTime,
        }
      );

      console.log(`[IPTracking] New device alert sent successfully to ${userEmail}`);
    } catch (error) {
      console.error('[IPTracking] Failed to send new device alert:', error);
      throw error;
    }
  }

  /**
   * Update session activity
   */
  updateActivity(userId: string, ip: string): void {
    const sessions = this.sessions.get(userId);
    if (sessions) {
      const session = sessions.find(s => s.ip === ip);
      if (session) {
        session.lastActivity = new Date();
      }
    }
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): UserSession[] {
    return this.sessions.get(userId) || [];
  }

  /**
   * Get all active sessions (last activity within 30 minutes)
   */
  getActiveSessions(userId: string): UserSession[] {
    const sessions = this.getUserSessions(userId);
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    return sessions.filter(s => s.lastActivity > thirtyMinutesAgo);
  }

  /**
   * Get all sessions across all users (for admin)
   */
  getAllSessions(): Map<string, UserSession[]> {
    return this.sessions;
  }

  /**
   * Remove session
   */
  removeSession(userId: string, ip: string): void {
    const sessions = this.sessions.get(userId);
    if (sessions) {
      const filtered = sessions.filter(s => s.ip !== ip);
      this.sessions.set(userId, filtered);
    }
  }

  /**
   * Clear all sessions for a user
   */
  clearUserSessions(userId: string): void {
    this.sessions.delete(userId);
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    uniqueUsers: number;
    countries: Map<string, number>;
    cities: Map<string, number>;
  } {
    let totalSessions = 0;
    let activeSessions = 0;
    const countries = new Map<string, number>();
    const cities = new Map<string, number>();
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    this.sessions.forEach((sessions) => {
      sessions.forEach((session) => {
        totalSessions++;

        if (session.lastActivity > thirtyMinutesAgo) {
          activeSessions++;
        }

        // Count countries
        const country = session.location.country;
        countries.set(country, (countries.get(country) || 0) + 1);

        // Count cities
        const city = session.location.city;
        cities.set(city, (cities.get(city) || 0) + 1);
      });
    });

    return {
      totalSessions,
      activeSessions,
      uniqueUsers: this.sessions.size,
      countries,
      cities,
    };
  }
}

// Export singleton instance
let ipTrackingServiceInstance: IPTrackingService | null = null;

export function getIPTrackingService(): IPTrackingService {
  if (!ipTrackingServiceInstance) {
    ipTrackingServiceInstance = new IPTrackingService();
  }
  return ipTrackingServiceInstance;
}
