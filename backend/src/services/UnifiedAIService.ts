import axios from 'axios';
import { getSearchService, SearchService } from './SearchService';
import { AI_MODELS, AIModel } from './AIModelConfig';

// Constants
const DEFAULT_MODEL_ID = 'wave-flash-2';
const DEFAULT_SEARCH_RESULTS_LIMIT = 5;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: AIToolCall[];
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

export class UnifiedAIService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly searchService: SearchService;
  private userRegion?: string;

  constructor(
    apiKey: string,
    searchService?: SearchService,
    baseUrl: string = OPENROUTER_BASE_URL
  ) {
    this.apiKey = apiKey;
    this.searchService = searchService || getSearchService();
    this.baseUrl = baseUrl;
  }

  /**
   * Set user region for localized search
   */
  setUserRegion(region: string) {
    this.userRegion = region;
    console.log(`[UnifiedAI] User region set to: ${region}`);
  }

  /**
   * Get model by ID or return default
   */
  private getModel(modelId?: string): AIModel {
    if (!modelId || modelId === 'auto') {
      return this.getDefaultModel();
    }
    
    const model = AI_MODELS.find(m => m.id === modelId);
    if (!model) {
      console.warn(`[UnifiedAI] Model ${modelId} not found, using default`);
      return this.getDefaultModel();
    }
    
    return model;
  }

  /**
   * Get the default model for free users
   */
  private getDefaultModel(): AIModel {
    const defaultModel = AI_MODELS.find(m => m.id === DEFAULT_MODEL_ID);
    if (!defaultModel) {
      throw new Error(`Default model ${DEFAULT_MODEL_ID} not found in AI_MODELS`);
    }
    return defaultModel;
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
    const { name, arguments: argumentsJson } = toolCall.function;
    
    console.log(`[UnifiedAI] Executing tool: ${name}`);
    console.log(`[UnifiedAI] Arguments: ${argumentsJson}`);

    if (name === 'ddg_search') {
      return this.executeSearchTool(argumentsJson);
    }

    return 'Unknown tool';
  }

  /**
   * Execute DuckDuckGo search tool
   */
  private async executeSearchTool(argumentsJson: string): Promise<string> {
    try {
      const args = JSON.parse(argumentsJson);
      const query = args.query;
      
      console.log(`[UnifiedAI] Searching for: "${query}"${this.userRegion ? ` (region: ${this.userRegion})` : ''}`);
      
      const results = await this.searchService.searchDuckDuckGo(
        query,
        DEFAULT_SEARCH_RESULTS_LIMIT,
        this.userRegion
      );
      const formattedResults = this.searchService.formatResultsForAI(results);
      
      console.log(`[UnifiedAI] Search completed, found ${results.length} results`);
      
      return formattedResults;
    } catch (error) {
      console.error('[UnifiedAI] Tool execution error:', error);
      return 'Search failed. Please try rephrasing your query.';
    }
  }

  /**
   * Chat with AI using specified model
   */
  async chat(
    messages: AIMessage[], 
    enableSearch: boolean = true,
    modelId?: string
  ): Promise<string> {
    try {
      const model = this.getModel(modelId);
      
      console.log(`[UnifiedAI] Starting chat with model: ${model.name} (${model.openRouterModel})`);
      console.log(`[UnifiedAI] Search enabled: ${enableSearch}`);
      console.log(`[UnifiedAI] User message: ${messages[messages.length - 1]?.content?.substring(0, 100)}...`);
      
      // Ensure system message exists
      this.ensureSystemMessage(messages, enableSearch);

      // First API call
      const assistantMessage = await this.callOpenRouterAPI(model, messages, enableSearch);
      
      // Check if AI wants to use tools
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        return await this.handleToolCalls(model, messages, assistantMessage);
      }
      
      // No tool calls, return direct response
      console.log('[UnifiedAI] ⚠️ AI did NOT use tools, responding directly');
      return assistantMessage.content;
    } catch (error) {
      return this.handleChatError(error);
    }
  }

  /**
   * Ensure system message exists at the beginning
   */
  private ensureSystemMessage(messages: AIMessage[], enableSearch: boolean): void {
    if (messages.length === 0 || messages[0].role !== 'system') {
      messages.unshift({
        role: 'system',
        content: enableSearch 
          ? 'You are a helpful AI assistant. You can use the ddg_search tool to find up-to-date information from the internet when needed.'
          : 'You are a helpful AI assistant.'
      });
    }
  }

  /**
   * Call OpenRouter API
   */
  private async callOpenRouterAPI(
    model: AIModel,
    messages: AIMessage[],
    enableSearch: boolean
  ): Promise<AIMessage> {
    console.log(`[UnifiedAI] Calling OpenRouter API with ${enableSearch ? 'tools enabled' : 'no tools'}...`);
    
    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: model.openRouterModel,
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

    return response.data.choices[0].message;
  }

  /**
   * Handle tool calls from AI
   */
  private async handleToolCalls(
    model: AIModel,
    messages: AIMessage[],
    assistantMessage: AIMessage
  ): Promise<string> {
    console.log(`[UnifiedAI] ✅ AI requested ${assistantMessage.tool_calls!.length} tool call(s)!`);
    
    // Add assistant message with tool calls
    messages.push(assistantMessage);
    
    // Execute each tool call
    for (const toolCall of assistantMessage.tool_calls!) {
      const toolResult = await this.executeTool(toolCall);
      
      // Add tool response
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: toolResult
      });
    }
    
    // Make second API call with tool results
    console.log('[UnifiedAI] Sending tool results back to AI');
    
    const finalResponse = await this.callOpenRouterAPI(model, messages, false);
    return finalResponse.content;
  }

  /**
   * Handle chat errors
   */
  private handleChatError(error: unknown): never {
    const axiosError = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
    const errorMessage = axiosError.response?.data?.error?.message || axiosError.message || 'Unknown error';
    
    console.error('[UnifiedAI] Chat error:', axiosError.response?.data || errorMessage);
    throw new Error(`AI chat failed: ${errorMessage}`);
  }
}

// Singleton instance
let unifiedAIServiceInstance: UnifiedAIService | null = null;

export function initializeUnifiedAIService(apiKey: string): UnifiedAIService {
  if (!unifiedAIServiceInstance) {
    unifiedAIServiceInstance = new UnifiedAIService(apiKey);
  }
  return unifiedAIServiceInstance;
}

export function getUnifiedAIService(): UnifiedAIService {
  if (!unifiedAIServiceInstance) {
    throw new Error('UnifiedAIService not initialized. Call initializeUnifiedAIService first. Make sure OPENAI_API_KEY is set in .env');
  }
  return unifiedAIServiceInstance;
}
