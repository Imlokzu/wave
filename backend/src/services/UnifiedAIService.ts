import axios from 'axios';
import { getSearchService, SearchService } from './SearchService';
import { AI_MODELS, AIModel } from './AIModelConfig';
import { executeToolCall, getToolsSchema, getToolSystemPrompt } from './ToolService';

// Constants
const DEFAULT_MODEL_ID = 'glm5';
const DEFAULT_SEARCH_RESULTS_LIMIT = 5;
const NVIDIA_NIM_BASE_URL = 'https://integrate.api.nvidia.com/v1';

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
    baseUrl: string = NVIDIA_NIM_BASE_URL
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
      this.ensureSystemMessage(messages, enableSearch, model);

      // Collect full response for tool call detection
      let fullResponse = '';
      const chunkCollector = (chunk: string) => {
        fullResponse += chunk;
        onChunk(chunk);
      };

      // Call API with streaming
      await this.callOpenRouterAPIStream(model, messages, enableSearch, thinking, chunkCollector, temperature, maxTokens);
      
      // After streaming completes, check for tool calls
      if (enableSearch) {
        const toolCalls = this.parseToolCalls(fullResponse);
        if (toolCalls.length > 0) {
          console.log(`[UnifiedAI] Detected ${toolCalls.length} tool call(s) after streaming`);
          // Note: For streaming, we can't easily execute tools mid-stream
          // Tools will be detected but user needs to resend for execution
          // This is a limitation of streaming vs non-streaming
        }
      }
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
      this.ensureSystemMessage(messages, enableSearch, model);

      // Call API with tools support
      const responseMessage = await this.callOpenRouterAPI(model, messages, enableSearch, thinking, temperature, maxTokens);

      let response = responseMessage.content;

      // Check for tool calls in response (native or parsed)
      const toolCalls = this.parseToolCalls(response, responseMessage);
      if (toolCalls.length > 0) {
        console.log(`[UnifiedAI] Detected ${toolCalls.length} tool call(s)`);
        
        // Execute tools
        const toolResults = await this.executeTools(toolCalls);
        
        // Add tool results to conversation
        messages.push(responseMessage);
        toolResults.forEach(result => {
          messages.push({
            role: 'tool',
            content: JSON.stringify(result.data),
            tool_call_id: result.tool
          });
        });
        
        // Get final response from AI with tool results
        const finalResponse = await this.callOpenRouterAPI(model, messages, false, false, temperature, maxTokens);
        response = finalResponse.content;
      }

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
   * Parse tool calls from AI response
   */
  private parseToolCalls(content: string, message?: AIMessage): Array<{ name: string; args: any }> {
    const toolCalls: Array<{ name: string; args: any }> = [];
    
    // First check for native tool_calls from API (NVIDIA NIM / OpenAI format)
    if (message?.tool_calls && message.tool_calls.length > 0) {
      console.log(`[UnifiedAI] Found ${message.tool_calls.length} native tool call(s)`);
      
      message.tool_calls.forEach((tc: any) => {
        if (tc.function) {
          try {
            const args = JSON.parse(tc.function.arguments || '{}');
            toolCalls.push({
              name: tc.function.name,
              args
            });
          } catch (e) {
            console.error('[UnifiedAI] Failed to parse tool call arguments:', e);
          }
        }
      });
      
      return toolCalls;
    }
    
    console.log('[UnifiedAI] No native tool_calls, checking content for patterns...');
    
    // Fallback: Look for [WEB_SEARCH: ...] or [SEARCH: ...] patterns
    const webSearchRegex = /\[WEB_SEARCH:\s*(.+?)\]/g;
    const searchRegex = /\[SEARCH:\s*(.+?)\]/g;
    const fetchRegex = /\[FETCH:\s*(.+?)\]/g;
    
    let searchMatch;
    while ((searchMatch = webSearchRegex.exec(content)) !== null) {
      console.log(`[UnifiedAI] Found WEB_SEARCH pattern: ${searchMatch[1]}`);
      toolCalls.push({ name: 'search', args: { query: searchMatch[1].trim() } });
    }
    
    while ((searchMatch = searchRegex.exec(content)) !== null) {
      console.log(`[UnifiedAI] Found SEARCH pattern: ${searchMatch[1]}`);
      toolCalls.push({ name: 'search', args: { query: searchMatch[1].trim() } });
    }
    
    let fetchMatch;
    while ((fetchMatch = fetchRegex.exec(content)) !== null) {
      console.log(`[UnifiedAI] Found FETCH pattern: ${fetchMatch[1]}`);
      toolCalls.push({ name: 'fetch', args: { url: fetchMatch[1].trim() } });
    }
    
    // Also look for JSON blocks
    const jsonBlockRegex = /```(?:json)?\s*({[\s\S]*?})\s*```/g;
    let match;
    
    while ((match = jsonBlockRegex.exec(content)) !== null) {
      try {
        const json = JSON.parse(match[1]);
        
        // Check for search tool
        if (json.searches && Array.isArray(json.searches)) {
          json.searches.forEach((s: any) => {
            toolCalls.push({
              name: 'search',
              args: { query: s.query || s }
            });
          });
        }
        
        // Check for fetch tool
        if (json.fetch || json.url) {
          toolCalls.push({
            name: 'fetch',
            args: { url: json.url || json.fetch }
          });
        }
      } catch (e) {
        // Ignore invalid JSON
      }
    }
    
    if (toolCalls.length > 0) {
      console.log(`[UnifiedAI] Found ${toolCalls.length} tool call(s) via pattern matching`);
    }
    
    return toolCalls;
  }

  /**
   * Execute tool calls
   */
  private async executeTools(toolCalls: Array<{ name: string; args: any }>): Promise<Array<{ tool: string; data: any }>> {
    const results: Array<{ tool: string; data: any }> = [];
    
    for (const call of toolCalls) {
      console.log(`[UnifiedAI] Executing tool: ${call.name}`, call.args);
      const result = await executeToolCall(call.name, call.args);
      
      if (result.success) {
        results.push({ tool: call.name, data: result.data });
      } else {
        results.push({ tool: call.name, data: { error: result.error } });
      }
    }
    
    return results;
  }

  /**
   * Ensure system message exists at the beginning
   */
  private ensureSystemMessage(messages: AIMessage[], enableSearch: boolean, model?: AIModel): void {
    const modelId = model?.openRouterModel || '';
    const disallowSystem = /google\/gemma/i.test(modelId);

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

    const basePrompt = enableSearch ? searchInstructions + '\n\n' + appKnowledge : appKnowledge;
    const prompt = basePrompt + thinkingRules;

    if (disallowSystem) {
      if (messages.length === 0) {
        messages.push({ role: 'user', content: prompt });
        return;
      }

      if (messages[0].role === 'system') {
        messages.shift();
      }

      if (messages[0]?.role === 'user') {
        messages[0].content = `${prompt}\n\n${messages[0].content || ''}`.trim();
        return;
      }

      messages.unshift({ role: 'user', content: prompt });
      return;
    }

    if (messages.length === 0 || messages[0].role !== 'system') {
      messages.unshift({
        role: 'system',
        content: prompt
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

    // Add tools for function calling (NVIDIA NIM / OpenAI format)
    if (enableSearch) {
      requestBody.tools = getToolsSchema();
      // Optionally set tool_choice to 'auto' to let AI decide when to use tools
      requestBody.tool_choice = 'auto';
      console.log('[UnifiedAI] Tools schema added:', JSON.stringify(requestBody.tools, null, 2));
    }

    // Add thinking/reasoning support
    if (thinking) {
      requestBody.extra_body = {
        include_reasoning: true
      };
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

    const choices = response?.data?.choices;
    if (!Array.isArray(choices) || choices.length === 0 || !choices[0]?.message) {
      const raw = response?.data ? JSON.stringify(response.data).slice(0, 1000) : 'No response data';
      throw new Error(`AI chat failed: Invalid response from provider. ${raw}`);
    }

    const message = choices[0].message;

    // If reasoning is included, prepend it to content wrapped in a tag for the frontend to handle
    if (message.reasoning) {
      console.log('[UnifiedAI] Reasoning detected in response');
      message.content = `<thinking>\n${message.reasoning}\n</thinking>\n\n${message.content || ''}`;
    }

    message.content = this.sanitizeResponse(message.content || '');

    return message;
  }

  /**
   * Remove common reasoning/meta-planning leakage from model outputs.
   */
  private sanitizeResponse(content: string): string {
    if (!content) return content;

    // Truncate anything after a planning marker
    const planningIndex = content.indexOf('Response Structure:' );
    if (planningIndex !== -1) {
      content = content.slice(0, planningIndex).trim();
    }

    // Remove paragraphs that look like internal reasoning
    const leakPatterns = [
      /this is unusual and could indicate/i,
      /given the context/i,
      /i'll acknowledge/i,
      /i'll respond/i,
      /i'll use a friendly tone/i,
      /i'll avoid sounding/i,
      /response structure/i
    ];

    const paragraphs = content.split(/\n\s*\n/);
    const filtered = paragraphs.filter(p => !leakPatterns.some(rx => rx.test(p)));

    return filtered.join('\n\n').trim();
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
