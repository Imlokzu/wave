import axios from 'axios';

export interface UserLocation {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  timezone: string;
}

export class LocationService {
  private locationCache: Map<string, UserLocation> = new Map();

  /**
   * Get user location from IP address
   * Uses ip-api.com (free, no API key required)
   */
  async getLocationFromIP(ip: string): Promise<UserLocation | null> {
    // Check cache first
    if (this.locationCache.has(ip)) {
      return this.locationCache.get(ip)!;
    }

    try {
      // Skip localhost/private IPs
      if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        console.log('[Location] Localhost detected, using default location');
        return {
          country: 'United States',
          countryCode: 'US',
          region: 'California',
          city: 'San Francisco',
          timezone: 'America/Los_Angeles'
        };
      }

      console.log(`[Location] Fetching location for IP: ${ip}`);
      
      const response = await axios.get(`http://ip-api.com/json/${ip}`, {
        timeout: 5000
      });

      if (response.data.status === 'success') {
        const location: UserLocation = {
          country: response.data.country || 'Unknown',
          countryCode: response.data.countryCode || 'US',
          region: response.data.regionName || '',
          city: response.data.city || '',
          timezone: response.data.timezone || ''
        };

        console.log(`[Location] Detected: ${location.city}, ${location.region}, ${location.country}`);
        
        // Cache for 24 hours
        this.locationCache.set(ip, location);
        setTimeout(() => this.locationCache.delete(ip), 24 * 60 * 60 * 1000);

        return location;
      }

      return null;
    } catch (error) {
      console.error('[Location] Failed to get location:', error);
      return null;
    }
  }

  /**
   * Get DuckDuckGo region code from country code
   * Maps country codes to DuckDuckGo's region parameter
   */
  getDuckDuckGoRegion(countryCode: string): string {
    const regionMap: { [key: string]: string } = {
      'US': 'us-en',
      'GB': 'uk-en',
      'DE': 'de-de',
      'FR': 'fr-fr',
      'ES': 'es-es',
      'IT': 'it-it',
      'NL': 'nl-nl',
      'PL': 'pl-pl',
      'RU': 'ru-ru',
      'BR': 'br-pt',
      'JP': 'jp-jp',
      'CN': 'cn-zh',
      'IN': 'in-en',
      'AU': 'au-en',
      'CA': 'ca-en',
      'MX': 'mx-es',
      'AR': 'ar-es',
      'ZA': 'za-en',
      'KR': 'kr-kr',
      'TR': 'tr-tr',
      'SE': 'se-sv',
      'NO': 'no-no',
      'DK': 'dk-da',
      'FI': 'fi-fi',
      'AT': 'at-de',
      'CH': 'ch-de',
      'BE': 'be-nl',
      'PT': 'pt-pt',
      'GR': 'gr-el',
      'CZ': 'cz-cs',
      'HU': 'hu-hu',
      'RO': 'ro-ro',
      'UA': 'ua-uk',
      'IL': 'il-he',
      'SA': 'sa-ar',
      'AE': 'ae-ar',
      'EG': 'eg-ar',
      'TH': 'th-th',
      'VN': 'vn-vi',
      'ID': 'id-id',
      'MY': 'my-en',
      'SG': 'sg-en',
      'PH': 'ph-en',
      'NZ': 'nz-en',
      'IE': 'ie-en',
    };

    return regionMap[countryCode.toUpperCase()] || 'wt-wt'; // wt-wt = worldwide
  }
}

// Singleton instance
let locationServiceInstance: LocationService | null = null;

export function getLocationService(): LocationService {
  if (!locationServiceInstance) {
    locationServiceInstance = new LocationService();
  }
  return locationServiceInstance;
}
