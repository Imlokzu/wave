/**
 * Tool Service - AI Tool Execution
 * Handles web search, webpage fetch, and other AI tools
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
    const response = await axios.get(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1`,
      { timeout: 5000 }
    );

    const data = response.data;
    
    // Extract relevant information
    const results: any = {
      abstract: data.AbstractText || '',
      topic: data.Heading || '',
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

    return {
      tool: 'duckduckgo',
      success: true,
      data: results
    };
  } catch (error: any) {
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

    return {
      tool: 'fetch',
      success: true,
      data: {
        url,
        content: text,
        length: text.length
      }
    };
  } catch (error: any) {
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
  switch (toolName) {
    case 'search':
    case 'duckduckgo':
      return searchDuckDuckGo(args.query || args.q || '');
    
    case 'fetch':
    case 'webpage':
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
 * Get available tools schema for AI
 */
export function getToolsSchema() {
  return [
    {
      name: 'search',
      description: 'Search the web for information using DuckDuckGo. Use for current events, facts, definitions, and general knowledge.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'fetch',
      description: 'Fetch content from a specific webpage URL. Use when you need to read article content, documentation, or specific web pages.',
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
  ];
}
