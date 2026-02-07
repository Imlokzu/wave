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
    thinking: boolean = false,
    temperature?: number,
    maxTokens?: number
  ): Promise<void> {
    const model = this.getModel(modelId);

    try {
      console.log(`[UnifiedAI] Starting streaming chat with model: ${model.name} (${model.openRouterModel})`);
      console.log(`[UnifiedAI] Search enabled: ${enableSearch}, Thinking enabled: ${thinking}`);

      // Ensure system message exists
      this.ensureSystemMessage(messages, enableSearch);

      // Call API with streaming
      await this.callOpenRouterAPIStream(model, messages, enableSearch, thinking, onChunk, temperature, maxTokens);
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
    onChunk: (chunk: string) => void,
    temperature?: number,
    maxTokens?: number
  ): Promise<void> {
    console.log(`[UnifiedAI] Calling OpenRouter API with streaming...`);

    const requestBody: any = {
      model: model.openRouterModel,
      messages,
      stream: true
    };

    // Add optional parameters
    if (temperature !== undefined) {
      requestBody.temperature = temperature;
    }
    if (maxTokens !== undefined) {
      requestBody.max_tokens = maxTokens;
    }

    // Only add extra_body if needed (some models don't support it)
    if (enableSearch || thinking) {
      requestBody.extra_body = {};
      if (enableSearch) {
        requestBody.extra_body.plugins = ["pdf"];
      }
      if (thinking) {
        requestBody.extra_body.include_reasoning = true;
      }
    }

    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      requestBody,
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
        // Only log non-connection errors
        if (error.message !== 'read ECONNRESET' && !error.message.includes('ECONNRESET')) {
          console.error(`[UnifiedAI] Stream error: ${error.message}`);
        }
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
    thinking: boolean = false,
    temperature?: number,
    maxTokens?: number
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
      const responseMessage = await this.callOpenRouterAPI(model, messages, enableSearch, thinking, temperature, maxTokens);

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

        return this.chat(messages, enableSearch, model.fallbackId, fallbackDepth + 1, thinking, temperature, maxTokens);
      }

      return this.handleChatError(error);
    }
  }

  /**
   * Ensure system message exists at the beginning
   */
  private ensureSystemMessage(messages: AIMessage[], enableSearch: boolean): void {
    if (messages.length === 0 || messages[0].role !== 'system') {
      
      const searchInstructions = `⚠️⚠️⚠️ STOP AND READ THIS FIRST ⚠️⚠️⚠️

WHEN USER ASKS ABOUT PRICES, SPECS, OR CURRENT INFO:

YOUR ENTIRE RESPONSE MUST BE:
\`\`\`json
{"searches": [{"query": "search term"}]}
\`\`\`

NOTHING BEFORE IT.
NOTHING AFTER IT.
NO TEXT.
NO EXPLANATIONS.
NO "Let me check"
NO "Performing search"
NO "Wait for results"
NO THINKING TAGS.

JUST THE JSON. PERIOD.

❌ WRONG (DO NOT DO THIS):
"Let me check the latest pricing for the OnePlus Nord 5...
🔍 [Performing web search...]"

✅ CORRECT (DO THIS):
\`\`\`json
{"searches": [{"query": "OnePlus Nord 5 price 2026"}]}
\`\`\`

After I give you search results, THEN you can write a proper answer.

FORBIDDEN PHRASES FOR PRICE QUESTIONS:
- "Let me check"
- "I'll search for"
- "Performing search"
- "[WEBSEARCH]"
- "Wait for"
- "As of 2026"
- "isn't officially released yet"
- Any text before the JSON

IF YOU WRITE TEXT INSTEAD OF JSON FOR A PRICE QUESTION, YOU FAILED.

`;

      const appKnowledge = `You are the AI assistant for Wave Messenger, a modern real-time chat application.

## ABOUT WAVE MESSENGER

**Core Features:**
- 💬 Real-time messaging with Socket.io (DMs, groups, read receipts)
- 🤖 AI Chat - 20+ models including Wave Flash, Wave, Wave O (reasoning), Wave Coder
- 📰 Feed - Curated content from Telegram channels
- 👤 User Profiles - Avatars, bios, customization
- 🌓 Themes - Dark/Light mode with transparency and custom backgrounds
- 📱 Mobile-optimized - Swipe gestures, responsive design
- 🔒 Secure - JWT auth with Supabase, end-to-end encryption
- 📊 Admin Panel - User management and moderation

**Latest Version: 1.1.0 (February 1, 2026)**
New in this release:
- AI Model Selection (Wave Flash/Wave/Wave O/Wave Coder)
- Real-time AI streaming with smooth updates
- Transparency mode with customizable blur
- Custom background uploads
- Advanced theme system
- Model-specific AI prompts
- Enhanced mobile UI with improved swipes
- Compact translation cards
- Performance improvements

**Navigation:**
- Bottom nav: Chat, Feed, AI Chat, Profile
- Settings: Account, Appearance, Privacy, AI, Notifications, About
- Help pages: /help.html, /changelog.html, /report-bug.html

**AI Models Available:**
Wave Flash (fast): lfm-2.5-1.2b, qwen3-4b, gemma-3n-e4b, gemma-3-12b
Wave (balanced): nemotron-3-nano, trinity-mini, gemma-3-27b, llama-3.3-70b, trinity-large
Wave O (reasoning): lfm-2.5-thinking, glm-4.5-air, step-3.5-flash, tng-r1t-chimera, deepseek-r1
Wave Coder: qwen-coder-32b, deepseek-coder-v2

**Wave Pro Features:**
- Access to premium AI models (llama-3.3-70b, trinity-large, glm-4.5-air, etc.)
- Priority support
- Advanced features

**Tech Stack:**
Backend: Node.js, TypeScript, Express, Socket.io, Supabase
Frontend: Vanilla JS, Tailwind CSS, Material Icons
Additional: Python Telegram scraper, Telethon

**How Users Can Get Help:**
- Settings → About section
- Help Center at /help.html
- Changelog at /changelog.html
- Report bugs at /report-bug.html
- Ask you (the AI) for assistance`;

      const basePrompt = enableSearch ? searchInstructions + '\n\n' + appKnowledge : appKnowledge;
      
      const thinkingRules = `

CRITICAL INSTRUCTION: NEVER include your internal reasoning, thinking process, or analysis in your response to the user. Do NOT write things like:
- "We need to respond..."
- "As per system..."
- "We are [name], an AI..."
- "We should respond..."
- "Should we sign as..."
- "Possibly respond..."
- "Provide a friendly greeting..."
- "Keep conversation open..."
- "First, I notice that..."
- "Looking at the search results..."
- "The user asked about..."
- "I should respond..."
- "Let me analyze..."
- "According to the information..."
- "I'll craft a response..."
- Any meta-commentary about how you're processing the request

Your thinking should ONLY appear in <thinking> tags if the model supports them. Otherwise, respond DIRECTLY with the answer.

BAD Example:
"We need to respond. As per system, we are 'rob', an AI. We should respond in a friendly manner. Should we sign as 'Rob'? Possibly respond: 'Hello! How can I help you today?' Provide a friendly greeting."

GOOD Example:
"Hello! How can I help you today?"

Respond naturally and directly. No thinking process in the main response.`;

      messages.unshift({
        role: 'system',
        content: basePrompt + thinkingRules
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
    thinking: boolean = false,
    temperature?: number,
    maxTokens?: number
  ): Promise<AIMessage> {
    console.log(`[UnifiedAI] Calling OpenRouter API with ${enableSearch ? 'tools enabled' : 'no tools'} (thinking: ${thinking})...`);

    const requestBody: any = {
      model: model.openRouterModel,
      messages
    };

    // Add optional parameters
    if (temperature !== undefined) {
      requestBody.temperature = temperature;
    }
    if (maxTokens !== undefined) {
      requestBody.max_tokens = maxTokens;
    }

    // Only add extra_body if needed (some models don't support it)
    if (enableSearch || thinking) {
      requestBody.extra_body = {};
      if (enableSearch) {
        requestBody.extra_body.plugins = ["pdf"];
      }
      if (thinking) {
        requestBody.extra_body.include_reasoning = true;
      }
    }

    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      requestBody,
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
