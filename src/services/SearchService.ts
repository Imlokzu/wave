import axios from 'axios';
import * as cheerio from 'cheerio';

export interface SearchResult {
  url: string;
  title: string;
  snippet?: string;
  content?: string; // Full page content
}

export class SearchService {
  /**
   * Decode DuckDuckGo redirect URLs
   * DuckDuckGo wraps URLs like: /l/?kh=-1&uddg=https%3A%2F%2Fexample.com
   * Also removes tracking parameters like &rut=...
   */
  private decodeDuckDuckGoUrl(url: string): string {
    try {
      const match = url.match(/uddg=(.+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
      
      // Remove DuckDuckGo tracking parameters
      if (url.includes('&rut=')) {
        url = url.split('&rut=')[0];
      }
    } catch (error) {
      console.error('[Search] URL decode error:', error);
    }
    return url;
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

  /**
   * Fetch full content from a URL
   * Extracts text from paragraphs, lists, and tables
   */
  async fetchPageContent(url: string, maxLength: number = 8000): Promise<string> {
    try {
      console.log(`[Search] Fetching content from: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.google.com/',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'cross-site',
          'Cache-Control': 'max-age=0'
        },
        timeout: 10000, // 10 second timeout
        maxRedirects: 5,
        validateStatus: (status) => status === 200 // Only accept 200 OK
      });

      const $ = cheerio.load(response.data);
      
      // Remove script, style, and nav elements
      $('script, style, nav, header, footer, aside, .ad, .advertisement, .cookie-banner, .social-share, .comments').remove();
      
      let content = '';
      
      // Extract main content areas (prioritize article/main tags)
      const mainContent = $('article, main, .content, .main-content, #content, #main, .specs, .comparison').first();
      const contentArea = mainContent.length > 0 ? mainContent : $('body');
      
      // Extract paragraphs
      contentArea.find('p').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 20) { // Filter out very short paragraphs
          content += text + '\n\n';
        }
      });
      
      // Extract lists
      contentArea.find('ul, ol').each((i, el) => {
        $(el).find('li').each((j, li) => {
          const text = $(li).text().trim();
          if (text.length > 10) {
            content += `• ${text}\n`;
          }
        });
        content += '\n';
      });
      
      // Extract tables (important for spec comparisons)
      contentArea.find('table').each((i, table) => {
        content += '\n--- Table ---\n';
        $(table).find('tr').each((j, row) => {
          const cells: string[] = [];
          $(row).find('th, td').each((k, cell) => {
            cells.push($(cell).text().trim());
          });
          if (cells.length > 0) {
            content += cells.join(' | ') + '\n';
          }
        });
        content += '--- End Table ---\n\n';
      });
      
      // Extract headings for structure
      contentArea.find('h1, h2, h3').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 0) {
          content += `\n## ${text}\n`;
        }
      });
      
      // Clean up excessive whitespace
      content = content.replace(/\n{3,}/g, '\n\n').trim();
      
      // Truncate if too long
      if (content.length > maxLength) {
        content = content.substring(0, maxLength) + '\n\n[Content truncated...]';
      }
      
      console.log(`[Search] Extracted ${content.length} characters from ${url}`);
      
      return content;
    } catch (error: any) {
      if (error.response) {
        console.error(`[Search] Failed to fetch content from ${url}: Request failed with status code ${error.response.status}`);
      } else if (error.code === 'ECONNABORTED') {
        console.error(`[Search] Failed to fetch content from ${url}: Timeout after 10 seconds`);
      } else {
        console.error(`[Search] Failed to fetch content from ${url}: ${error.message}`);
      }
      return `[Failed to fetch content: ${error.message}]`;
    }
  }

  /**
   * Search and fetch full content from top results
   * This is what you need to prevent AI hallucination
   */
  async searchWithContent(query: string, maxResults: number = 3, region?: string): Promise<SearchResult[]> {
    try {
      // First, get search results
      const results = await this.searchDuckDuckGo(query, maxResults, region);
      
      if (results.length === 0) {
        return [];
      }
      
      console.log(`[Search] Fetching full content from ${results.length} URLs...`);
      
      // Fetch content for each result in parallel with retry logic
      const contentPromises = results.map(async (result) => {
        // Clean URL - remove tracking parameters
        let cleanUrl = result.url;
        if (cleanUrl.includes('&rut=')) {
          cleanUrl = cleanUrl.split('&rut=')[0];
        }
        if (cleanUrl.includes('?rut=')) {
          cleanUrl = cleanUrl.split('?rut=')[0];
        }
        
        // Try to fetch content
        const content = await this.fetchPageContent(cleanUrl);
        
        // Only include results with meaningful content
        const hasContent = content.length > 100 && !content.startsWith('[Failed to fetch');
        
        return {
          ...result,
          url: cleanUrl, // Use cleaned URL
          content: hasContent ? content : undefined
        };
      });
      
      const resultsWithContent = await Promise.all(contentPromises);
      
      // Filter to only results with content
      const successfulResults = resultsWithContent.filter(r => r.content && r.content.length > 100);
      
      console.log(`[Search] Successfully fetched content from ${successfulResults.length} out of ${results.length} pages`);
      
      // If no results succeeded, return original results with snippets
      if (successfulResults.length === 0) {
        console.log(`[Search] Warning: No pages returned content, falling back to snippets`);
        return resultsWithContent;
      }
      
      return successfulResults;
    } catch (error) {
      console.error('[Search] searchWithContent failed:', error);
      return [];
    }
  }

  /**
   * Format search results with full content for AI
   * This prevents hallucination by providing actual page content
   */
  formatResultsWithContentForAI(results: SearchResult[]): string {
    if (results.length === 0) {
      return 'No search results found.';
    }

    // Filter to only results with actual content
    const resultsWithContent = results.filter(r => r.content && r.content.length > 100 && !r.content.startsWith('[Failed'));
    
    if (resultsWithContent.length === 0) {
      // Fallback to snippets if no content was fetched
      console.log('[Search] No content fetched, using snippets as fallback');
      return this.formatResultsForAI(results);
    }

    let formatted = 'Search Results with Full Content:\n\n';
    formatted += '=' .repeat(80) + '\n\n';
    
    resultsWithContent.forEach((result, index) => {
      formatted += `Result ${index + 1}: ${result.title}\n`;
      formatted += `URL: ${result.url}\n`;
      formatted += '-'.repeat(80) + '\n';
      formatted += result.content + '\n';
      formatted += '\n' + '='.repeat(80) + '\n\n';
    });
    
    formatted += '\n🛑 CRITICAL INSTRUCTIONS:\n';
    formatted += '• Answer ONLY using the content provided above\n';
    formatted += '• Do NOT use external knowledge or make assumptions\n';
    formatted += '• If information is missing, say "Not found in sources"\n';
    formatted += '• Do NOT guess specifications or features\n';
    formatted += '• Cite the source URL when providing information\n\n';
    
    return formatted;
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
