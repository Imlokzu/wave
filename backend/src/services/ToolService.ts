/**
 * Tool Service - AI Tool Execution
 * Handles web search, webpage fetch, and other AI tools
 * Compatible with NVIDIA NIM function calling
 */

import axios from 'axios';

export interface ToolResult {
  tool: string;
  success: boolean;
  data: any;
  error?: string;
}

/**
 * DuckDuckGo Instant Answer Search
 */
export async function searchDuckDuckGo(query: string): Promise<ToolResult> {
  try {
    console.log(`[ToolService] Searching DuckDuckGo: "${query}"`);
    
    const response = await axios.get(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1`,
      { timeout: 5000 }
    );

    const data = response.data;
    
    // Extract relevant information
    const results: any = {
      query,
      abstract: data.AbstractText || '',
      topic: data.Heading || '',
      url: data.AbstractURL || '',
      related: []
    };

    // Get related topics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      results.related = data.RelatedTopics.slice(0, 5).map((t: any) => ({
        text: t.Text || '',
        url: t.FirstURL || ''
      }));
    }

    // Get answers
    if (data.Answer) {
      results.answer = data.Answer;
    }

    // Get definition
    if (data.Definition) {
      results.definition = data.Definition;
    }

    console.log(`[ToolService] Search completed: ${results.abstract ? 'Found answer' : 'No abstract'}`);

    return {
      tool: 'duckduckgo',
      success: true,
      data: results
    };
  } catch (error: any) {
    console.error(`[ToolService] Search error:`, error.message);
    return {
      tool: 'duckduckgo',
      success: false,
      data: null,
      error: error.message || 'Search failed'
    };
  }
}

/**
 * Fetch webpage content
 */
export async function fetchWebpage(url: string): Promise<ToolResult> {
  try {
    console.log(`[ToolService] Fetching webpage: ${url}`);
    
    // Validate URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return {
        tool: 'fetch',
        success: false,
        data: null,
        error: 'Invalid URL - must start with http:// or https://'
      };
    }

    // Use AllOrigins proxy to bypass CORS
    const response = await axios.get(
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      { 
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WaveAI/1.0)'
        }
      }
    );

    const html = response.data;
    
    // Simple HTML to text conversion
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Limit to 5000 characters
    text = text.slice(0, 5000);

    console.log(`[ToolService] Fetched ${text.length} characters`);

    return {
      tool: 'fetch',
      success: true,
      data: {
        url,
        content: text,
        length: text.length,
        preview: text.slice(0, 200)
      }
    };
  } catch (error: any) {
    console.error(`[ToolService] Fetch error:`, error.message);
    return {
      tool: 'fetch',
      success: false,
      data: null,
      error: error.message || 'Failed to fetch webpage'
    };
  }
}

/**
 * Execute AI tool based on tool call
 */
export async function executeToolCall(toolName: string, args: any): Promise<ToolResult> {
  console.log(`[ToolService] Executing tool: ${toolName}`, args);
  
  switch (toolName) {
    case 'search':
    case 'duckduckgo':
    case 'web_search':
      return searchDuckDuckGo(args.query || args.q || '');
    
    case 'fetch':
    case 'webpage':
    case 'url_fetch':
      return fetchWebpage(args.url || '');
    
    default:
      return {
        tool: toolName,
        success: false,
        data: null,
        error: `Unknown tool: ${toolName}`
      };
  }
}

/**
 * Get available tools schema for NVIDIA NIM / OpenAI format
 */
export function getToolsSchema() {
  return [
    {
      type: 'function',
      function: {
        name: 'search',
        description: 'Search the web for current information, facts, news, prices, specs, or any query. Use DuckDuckGo search engine.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query (be specific and include relevant keywords)'
            }
          },
          required: ['query']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'fetch',
        description: 'Fetch and read content from a specific webpage URL. Use when you need to read article content, documentation, or specific web pages.',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL to fetch (must start with http:// or https://)'
            }
          },
          required: ['url']
        }
      }
    }
  ];
}

/**
 * Get system prompt for tool usage instructions
 */
export function getToolSystemPrompt() {
  return `You have access to two tools:

1. **search(query)** - Search the web for current information
   - Use for: current events, prices, specs, news, facts, recent info
   - Example: search("iPhone 17 price 2026")

2. **fetch(url)** - Fetch content from a webpage
   - Use for: reading articles, documentation, specific pages
   - Example: fetch("https://example.com/article")

When you need information you don't have, call the appropriate tool.
The system will execute it and provide results for you to use in your response.`;
}
