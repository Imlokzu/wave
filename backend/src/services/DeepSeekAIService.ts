import axios from 'axios';
import { getSearchService } from './SearchService';
import { getLocationService } from './LocationService';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

export interface AIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export class DeepSeekAIService {
  private apiKey: string;
  private baseUrl: string = 'https://openrouter.ai/api/v1';
  private searchService = getSearchService();
  private locationService = getLocationService();
  private userRegion?: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Set user region for localized search
   */
  setUserRegion(region: string) {
    this.userRegion = region;
    console.log(`[DeepSeek] User region set to: ${region}`);
  }

  /**
   * Define available tools for the AI
   */
  private getTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'ddg_search',
          description: 'Search the internet for up-to-date information using DuckDuckGo. Use this when you need current information, facts, news, or research.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query to look up on the internet'
              }
            },
            required: ['query']
          }
        }
      }
    ];
  }

  /**
   * Execute a tool call
   */
  private async executeTool(toolCall: AIToolCall): Promise<string> {
    const { name, arguments: argsStr } = toolCall.function;
    
    console.log(`[DeepSeek] Executing tool: ${name}`);
    console.log(`[DeepSeek] Arguments: ${argsStr}`);

    if (name === 'ddg_search') {
      try {
        const args = JSON.parse(argsStr);
        const query = args.query;
        
        console.log(`[DeepSeek] Searching for: "${query}"${this.userRegion ? ` (region: ${this.userRegion})` : ''}`);
        
        const results = await this.searchService.searchDuckDuckGo(query, 5, this.userRegion);
        const formattedResults = this.searchService.formatResultsForAI(results);
        
        console.log(`[DeepSeek] Search completed, found ${results.length} results`);
        
        return formattedResults;
      } catch (error) {
        console.error('[DeepSeek] Tool execution error:', error);
        return 'Search failed. Please try rephrasing your query.';
      }
    }

    return 'Unknown tool';
  }

  /**
   * Chat with DeepSeek-R1 with tool support
   */
  async chat(messages: AIMessage[], enableSearch: boolean = true): Promise<string> {
    try {
      console.log(`[DeepSeek] Starting chat (search: ${enableSearch})`);
      console.log(`[DeepSeek] User message: ${messages[messages.length - 1]?.content?.substring(0, 100)}...`);
      
      // Add system message if not present
      if (messages.length === 0 || messages[0].role !== 'system') {
        messages.unshift({
          role: 'system',
          content: enableSearch 
            ? 'You are a helpful AI assistant. You can use the ddg_search tool to find up-to-date information from the internet when needed.'
            : 'You are a helpful AI assistant.'
        });
      }

      // First API call
      console.log(`[DeepSeek] Calling OpenRouter API with ${enableSearch ? 'tools enabled' : 'no tools'}...`);
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'deepseek/deepseek-r1-0528:free',
          messages,
          tools: enableSearch ? this.getTools() : undefined,
          tool_choice: enableSearch ? 'auto' : undefined
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://wave-messenger.com',
            'X-Title': 'Wave Messenger'
          }
        }
      );

      const assistantMessage = response.data.choices[0].message;
      console.log(`[DeepSeek] Got response, has tool_calls: ${!!assistantMessage.tool_calls}`);
      
      // Check if AI wants to use tools
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        console.log(`[DeepSeek] ✅ AI requested ${assistantMessage.tool_calls.length} tool call(s)!`);
        
        // Add assistant message with tool calls
        messages.push(assistantMessage);
        
        // Execute each tool call
        for (const toolCall of assistantMessage.tool_calls) {
          const toolResult = await this.executeTool(toolCall);
          
          // Add tool response
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: toolResult
          });
        }
        
        // Make second API call with tool results
        console.log('[DeepSeek] Sending tool results back to AI');
        
        const finalResponse = await axios.post(
          `${this.baseUrl}/chat/completions`,
          {
            model: 'deepseek/deepseek-r1-0528:free',
            messages
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://wave-messenger.com',
              'X-Title': 'Wave Messenger'
            }
          }
        );
        
        return finalResponse.data.choices[0].message.content;
      }
      
      // No tool calls, return direct response
      console.log('[DeepSeek] ⚠️ AI did NOT use tools, responding directly');
      return assistantMessage.content;
    } catch (error: any) {
      console.error('[DeepSeek] Chat error:', error.response?.data || error.message);
      throw new Error('AI chat failed: ' + (error.response?.data?.error?.message || error.message));
    }
  }
}

// Singleton instance
let deepSeekServiceInstance: DeepSeekAIService | null = null;

export function initializeDeepSeekService(apiKey: string): DeepSeekAIService {
  if (!deepSeekServiceInstance) {
    deepSeekServiceInstance = new DeepSeekAIService(apiKey);
  }
  return deepSeekServiceInstance;
}

export function getDeepSeekService(): DeepSeekAIService {
  if (!deepSeekServiceInstance) {
    throw new Error('DeepSeekAIService not initialized. Call initializeDeepSeekService first.');
  }
  return deepSeekServiceInstance;
}
