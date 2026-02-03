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
   * Chat with AI using specified model (streaming version)
   */
  async chatStream(
    messages: AIMessage[],
    onChunk: (chunk: string) => void,
    enableSearch: boolean = true,
    modelId?: string,
    thinking: boolean = false
  ): Promise<void> {
    const model = this.getModel(modelId);

    try {
      console.log(`[UnifiedAI] Starting streaming chat with model: ${model.name} (${model.openRouterModel})`);
      console.log(`[UnifiedAI] Search enabled: ${enableSearch}, Thinking enabled: ${thinking}`);

      // Ensure system message exists
      this.ensureSystemMessage(messages, enableSearch);

      // Call API with streaming
      await this.callOpenRouterAPIStream(model, messages, enableSearch, thinking, onChunk);
    } catch (error: any) {
      console.error(`[UnifiedAI] Streaming error: ${error.message || 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Call OpenRouter API with streaming
   */
  private async callOpenRouterAPIStream(
    model: AIModel,
    messages: AIMessage[],
    enableSearch: boolean,
    thinking: boolean = false,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    console.log(`[UnifiedAI] Calling OpenRouter API with streaming...`);

    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: model.openRouterModel,
        messages,
        stream: true,
        extra_body: {
          plugins: enableSearch ? ["pdf"] : [],
          response_healing: true,
          include_reasoning: thinking
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://wave-messenger.com',
          'X-Title': 'Wave Messenger'
        },
        responseType: 'stream'
      }
    );

    return new Promise((resolve, reject) => {
      let buffer = '';
      let reasoningContent = '';
      let inReasoning = false;

      response.data.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();

        // Process complete lines
        while (true) {
          const lineEnd = buffer.indexOf('\n');
          if (lineEnd === -1) break;

          const line = buffer.slice(0, lineEnd).trim();
          buffer = buffer.slice(lineEnd + 1);

          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              // If we collected reasoning, send it wrapped
              if (reasoningContent) {
                onChunk(`<thinking>\n${reasoningContent}\n</thinking>\n\n`);
              }
              resolve();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              
              // Check for errors
              if (parsed.error) {
                reject(new Error(parsed.error.message || 'Stream error'));
                return;
              }

              const delta = parsed.choices?.[0]?.delta;
              
              // Handle reasoning (thinking)
              if (delta?.reasoning) {
                reasoningContent += delta.reasoning;
                inReasoning = true;
              }
              
              // Handle content
              if (delta?.content) {
                onChunk(delta.content);
              }
            } catch (e) {
              // Ignore JSON parse errors for comments
            }
          }
        }
      });

      response.data.on('end', () => {
        if (reasoningContent) {
          onChunk(`<thinking>\n${reasoningContent}\n</thinking>\n\n`);
        }
        resolve();
      });

      response.data.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  /**
   * Chat with AI using specified model
   */
  async chat(
    messages: AIMessage[],
    enableSearch: boolean = true,
    modelId?: string,
    fallbackDepth: number = 0,
    thinking: boolean = false
  ): Promise<string> {
    const model = this.getModel(modelId);

    try {
      if (fallbackDepth === 0) {
        console.log(`[UnifiedAI] Starting chat with model: ${model.name} (${model.openRouterModel})`);
      } else {
        console.warn(`[UnifiedAI] Fallback retry #${fallbackDepth} using model: ${model.name}`);
      }

      console.log(`[UnifiedAI] Search enabled: ${enableSearch}, Thinking enabled: ${thinking}`);

      // Ensure system message exists
      this.ensureSystemMessage(messages, enableSearch);

      // Call API
      const responseMessage = await this.callOpenRouterAPI(model, messages, enableSearch, thinking);

      let response = responseMessage.content;

      // If this was a fallback, prepend a message for the user
      if (fallbackDepth > 0) {
        return `> ⚠️ **Notice:** The requested model was temporarily unavailable. I switched to **${model.name}** to complete your request.\n\n` + response;
      }

      return response;
    } catch (error: any) {
      // Check if we have a fallback model and haven't exceeded retry limit (max 2 retries)
      if (model.fallbackId && fallbackDepth < 2) {
        console.error(`[UnifiedAI] Model ${model.id} failed: ${error.message || 'Unknown error'}`);
        console.warn(`[UnifiedAI] Attempting fallback to ${model.fallbackId}...`);

        // Remove the system message before retrying to avoid duplicates (ensureSystemMessage will add it back)
        if (messages.length > 0 && messages[0].role === 'system') {
          messages.shift();
        }

        return this.chat(messages, enableSearch, model.fallbackId, fallbackDepth + 1, thinking);
      }

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
          ? 'You are a helpful AI assistant with web search and weather capabilities. Use [SEARCH: query] for searches and [WEATHER: city] for weather.'
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
    enableSearch: boolean,
    thinking: boolean = false
  ): Promise<AIMessage> {
    console.log(`[UnifiedAI] Calling OpenRouter API with ${enableSearch ? 'tools enabled' : 'no tools'} (thinking: ${thinking})...`);

    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: model.openRouterModel,
        messages,
        extra_body: {
          plugins: enableSearch ? ["pdf"] : [],
          response_healing: true,
          include_reasoning: thinking
        }
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

    const message = response.data.choices[0].message;

    // If reasoning is included, prepend it to content wrapped in a tag for the frontend to handle
    if (message.reasoning) {
      console.log('[UnifiedAI] Reasoning detected in response');
      message.content = `<thinking>\n${message.reasoning}\n</thinking>\n\n${message.content || ''}`;
    }

    return message;
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
