/**
 * NVIDIA NIM Client
 * 
 * Frontend client for interacting with NVIDIA NIM API
 * Provides streaming chat, vision, and agent capabilities
 * 
 * Usage:
 *   import { streamChat, streamVisionChat, runAgent } from '/js/nvidiaClient.js';
 * 
 *   // Basic chat
 *   await streamChat('step-3.5-flash', messages, {
 *     onContent: (chunk) => { outputEl.textContent += chunk; },
 *     onDone:    () => { /* hide spinner *\/ },
 *     onError:   (err) => console.error(err),
 *   });
 * 
 *   // With thinking shown
 *   await streamChat('glm5', messages, {
 *     onThinking: (chunk) => { thinkingEl.textContent += chunk; },
 *     onContent:  (chunk) => { outputEl.textContent += chunk; },
 *     onDone:     () => {},
 *     onError:    (e) => console.error(e),
 *   });
 */

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

// Model configurations
const MODEL_CONFIGS = {
  'step-3.5-flash': {
    name: 'Step-3.5-Flash',
    description: 'Fast chat, streaming',
    hasVision: false,
    speed: 'fast',
    maxTokens: 16384,
    temperature: 1,
    topP: 0.9
  },
  'glm5': {
    name: 'GLM-5',
    description: 'Deep reasoning, agents',
    hasVision: false,
    speed: 'slow',
    maxTokens: 16384,
    temperature: 1,
    topP: 1,
    enableThinking: true,
    clearThinking: false
  },
  'qwen3.5-vl': {
    name: 'Qwen3.5-VL',
    description: 'Images, docs, VQA',
    hasVision: true,
    speed: 'medium',
    maxTokens: 16384,
    temperature: 0.6,
    topP: 0.95,
    topK: 20,
    enableThinking: true
  },
  'qwen3.5-397b-a17b': {
    name: 'Qwen3.5-397B-A17B',
    description: 'Multimodal foundation model with thinking',
    hasVision: true,
    speed: 'medium',
    maxTokens: 32768,
    temperature: 0.6,
    topP: 0.95,
    topK: 20,
    enableThinking: true,
    clearThinking: false
  },
  'kimi-k2.5': {
    name: 'Kimi K2.5',
    description: 'Video, heavy multimodal',
    hasVision: true,
    speed: 'medium',
    maxTokens: 16384,
    temperature: 1,
    topP: 1,
    thinking: true
  }
};

/**
 * Get API key from localStorage or prompt user
 */
function getApiKey() {
  return localStorage.getItem('nvidiaApiKey') || '';
}

/**
 * Save API key to localStorage
 */
function saveApiKey(key) {
  localStorage.setItem('nvidiaApiKey', key);
}

/**
 * Stream chat completion with thinking support
 * 
 * @param {string} modelId - Model ID (e.g., 'step-3.5-flash', 'glm5')
 * @param {Array} messages - Array of message objects {role, content}
 * @param {Object} callbacks - Callback functions
 * @param {Function} callbacks.onChunk - Called for each chunk (raw)
 * @param {Function} callbacks.onThinking - Called for thinking/reasoning content
 * @param {Function} callbacks.onContent - Called for regular content
 * @param {Function} callbacks.onDone - Called when streaming is complete
 * @param {Function} callbacks.onError - Called on error
 */
export async function streamChat(modelId, messages, callbacks = {}) {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    callbacks.onError?.(new Error('NVIDIA API key not set. Please add it in Settings.'));
    return;
  }

  const model = MODEL_CONFIGS[modelId] || MODEL_CONFIGS['step-3.5-flash'];
  
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Accept': 'text/event-stream',
    'Content-Type': 'application/json'
  };

  const payload = {
    model: modelId,
    messages,
    max_tokens: model.maxTokens,
    temperature: model.temperature,
    top_p: model.topP,
    stream: true
  };

  // Add model-specific parameters
  if (model.topK) {
    payload.top_k = model.topK;
  }

  // Add thinking/reasoning support
  if (model.enableThinking || model.thinking) {
    payload.chat_template_kwargs = {
      enable_thinking: true,
      ...(model.clearThinking !== undefined && { clear_thinking: model.clearThinking })
    };
  }

  try {
    const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        callbacks.onDone?.();
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines
      while (true) {
        const lineEnd = buffer.indexOf('\n');
        if (lineEnd === -1) break;

        const line = buffer.slice(0, lineEnd).trim();
        buffer = buffer.slice(lineEnd + 1);

        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            callbacks.onDone?.();
            break;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;

            // Handle reasoning/thinking content
            const reasoning = delta?.reasoning_content;
            if (reasoning) {
              callbacks.onThinking?.(reasoning);
              callbacks.onChunk?.(reasoning);
            }

            // Handle regular content
            if (delta?.content) {
              callbacks.onContent?.(delta.content);
              callbacks.onChunk?.(delta.content);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  } catch (error) {
    console.error('[NVIDIA Client] Stream error:', error);
    callbacks.onError?.(error);
    throw error;
  }
}

/**
 * Non-streaming chat completion
 * 
 * @param {string} modelId - Model ID
 * @param {Array} messages - Array of message objects
 * @param {Object} options - Additional options
 * @returns {Promise<string>} - AI response content
 */
export async function chat(modelId, messages, options = {}) {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('NVIDIA API key not set');
  }

  const model = MODEL_CONFIGS[modelId] || MODEL_CONFIGS['step-3.5-flash'];
  
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  const payload = {
    model: modelId,
    messages,
    max_tokens: options.maxTokens || model.maxTokens,
    temperature: options.temperature ?? model.temperature,
    top_p: options.topP ?? model.topP,
    stream: false
  };

  if (model.topK) {
    payload.top_k = model.topK;
  }

  if (model.enableThinking || model.thinking) {
    payload.chat_template_kwargs = {
      enable_thinking: true
    };
  }

  const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Vision chat for image analysis
 * Supports single or multiple images
 *
 * @param {string} modelId - Model ID (should be a vision model)
 * @param {string} prompt - Text prompt
 * @param {File|File[]} imageFile - Image file(s) to analyze
 * @param {Object} callbacks - Callback functions
 */
export async function streamVisionChat(modelId, prompt, imageFile, callbacks = {}) {
  // Handle single file or array of files
  const files = Array.isArray(imageFile) ? imageFile : [imageFile];
  
  // Convert all images to base64
  const imagePromises = files.map(file => fileToBase64(file));
  const base64Images = await Promise.all(imagePromises);
  
  // Build content array with text first, then images
  const content = [
    { type: 'text', text: prompt }
  ];
  
  // Add all images
  base64Images.forEach((base64, index) => {
    const fileType = files[index].type || 'image/jpeg';
    content.push({
      type: 'image_url',
      image_url: { url: `data:${fileType};base64,${base64}` }
    });
  });

  const messages = [{
    role: 'user',
    content
  }];

  return streamChat(modelId, messages, callbacks);
}

/**
 * Send image with optional text prompt (simplified wrapper)
 *
 * @param {string} modelId - Model ID
 * @param {File|File[]} images - Image file(s)
 * @param {string} prompt - Optional text prompt
 * @param {Object} callbacks - Callback functions
 */
export async function sendImage(modelId, images, prompt = 'Describe this image.', callbacks = {}) {
  return streamVisionChat(modelId, prompt, images, callbacks);
}

/**
 * Agent mode: Flash plans, GLM-5 executes
 * 
 * @param {string} task - Task description
 * @param {File|null} imageFile - Optional image file
 * @param {Object} callbacks - Callback functions
 * @param {Function} callbacks.onPlan - Called with planning chunks from Flash
 * @param {Function} callbacks.onThinking - Called with thinking content from GLM-5
 * @param {Function} callbacks.onContent - Called with final content
 * @param {Function} callbacks.onDone - Called when complete
 * @param {Function} callbacks.onError - Called on error
 */
export async function runAgent(task, imageFile = null, callbacks = {}) {
  // Step 1: Use Flash to plan
  const planMessages = [{
    role: 'user',
    content: `Plan how to accomplish this task: ${task}`
  }];

  let plan = '';
  
  await streamChat('step-3.5-flash', planMessages, {
    onContent: (chunk) => {
      plan += chunk;
      callbacks.onPlan?.(chunk);
    },
    onDone: async () => {
      // Step 2: Use GLM-5 to execute with thinking
      const executeMessages = [{
        role: 'user',
        content: `Execute this plan with detailed reasoning:\n\nPlan: ${plan}\n\nTask: ${task}`
      }];

      await streamChat('glm5', executeMessages, {
        onThinking: callbacks.onThinking,
        onContent: callbacks.onContent,
        onDone: callbacks.onDone,
        onError: callbacks.onError
      });
    },
    onError: callbacks.onError
  });
}

/**
 * Helper: Convert File to base64
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result;
      // Remove data:image/...;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}

/**
 * Get available models
 */
export function getAvailableModels() {
  return Object.values(MODEL_CONFIGS);
}

/**
 * Check if model supports vision
 */
export function modelSupportsVision(modelId) {
  const model = MODEL_CONFIGS[modelId];
  return model?.hasVision || false;
}

/**
 * Check if model supports thinking
 */
export function modelSupportsThinking(modelId) {
  const model = MODEL_CONFIGS[modelId];
  return model?.enableThinking || model?.thinking || false;
}
