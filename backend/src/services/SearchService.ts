import axios from 'axios';
import * as cheerio from 'cheerio';

export interface SearchResult {
  url: string;
  title: string;
  snippet?: string;
  content?: string;
}

export class SearchService {
  /**
   * Decode DuckDuckGo redirect URLs
   * DuckDuckGo wraps URLs like: /l/?kh=-1&uddg=https%3A%2F%2Fexample.com
   */
  private decodeDuckDuckGoUrl(url: string): string {
    try {
      const match = url.match(/uddg=(.+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch (error) {
      console.error('[Search] URL decode error:', error);
    }
    return url;
  }

  /**
   * Fetch and extract readable text content from a URL
   */
  async fetchPageContent(url: string, maxChars: number = 3000): Promise<string | null> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 8000
      });

      const contentType = String(response.headers['content-type'] || '');
      if (!contentType.includes('text/html')) {
        return null;
      }

      const html = response.data;
      const $ = cheerio.load(html);
      $('script, style, noscript, link').remove();
      const text = $('body').text().replace(/\s+/g, ' ').trim();

      if (!text) return null;
      return text.length > maxChars ? `${text.slice(0, maxChars)}...` : text;
    } catch (error) {
      console.error('[Search] Fetch page content failed:', error);
      return null;
    }
  }

  /**
   * Search DuckDuckGo for web results
   * Based on working Python implementation with URL decoding
   * @param query - Search query
   * @param maxResults - Maximum number of results to return
   * @param region - DuckDuckGo region code (e.g., 'de-de' for Germany, 'us-en' for USA)
   */
  async searchDuckDuckGo(query: string, maxResults: number = 5, region?: string): Promise<SearchResult[]> {
    try {
      const regionInfo = region ? ` (region: ${region})` : '';
      console.log(`[Search] Searching DuckDuckGo for: "${query}"${regionInfo}`);
      
      // Build URL with region parameter if provided
      let url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      if (region) {
        url += `&kl=${region}`;
      }
      
      // Use GET with query string (more reliable than POST)
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const html = response.data;
      console.log(`[Search] Received HTML length: ${html.length}`);
      
      const $ = cheerio.load(html);
      const results: SearchResult[] = [];
      
      // Find all links with class "result__a"
      $('a.result__a[href]').each((i, el) => {
        if (results.length >= maxResults) return false;
        
        const $link = $(el);
        const title = $link.text().trim();
        let url = this.decodeDuckDuckGoUrl($link.attr('href') || '');
        
        // Get snippet from parent result element
        const snippet = $link.closest('.result').find('.result__snippet').text().trim();
        
        if (url && title) {
          console.log(`[Search] Result ${results.length + 1}: "${title.substring(0, 50)}..."`);
          console.log(`[Search]   URL: ${url.substring(0, 80)}...`);
          
          results.push({
            url,
            title,
            snippet
          });
        }
      });
      
      console.log(`[Search] Found ${results.length} results`);
      
      // Debug: If no results, show HTML preview
      if (results.length === 0) {
        console.log('[Search] No results found. HTML preview:');
        console.log(html.substring(0, 500));
      }
      
      return results;
    } catch (error) {
      console.error('[Search] DuckDuckGo search failed:', error);
      return [];
    }
  }

  /**
   * Format search results for AI consumption
   */
  formatResultsForAI(results: SearchResult[]): string {
    if (results.length === 0) {
      return 'No search results found.';
    }

    return results.map((result, index) => {
      return `${index + 1}. ${result.title}\n   URL: ${result.url}\n   ${result.snippet || 'No description available'}`;
    }).join('\n\n');
  }
}

// Singleton instance
let searchServiceInstance: SearchService | null = null;

export function getSearchService(): SearchService {
  if (!searchServiceInstance) {
    searchServiceInstance = new SearchService();
  }
  return searchServiceInstance;
}
