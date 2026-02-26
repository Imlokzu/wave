# NVIDIA NIM Integration Guide

## Overview

This guide explains the NVIDIA NIM API integration for Wave Messenger, including the new AI models available and how to use them.

## What Changed

| Before | After |
|--------|-------|
| OpenRouter API | NVIDIA NIM API |
| `OPENROUTER_API_KEY` in .env | `NVIDIA_API_KEY` in .env |
| `backend/src/services/UnifiedAIService.ts` | `backend/src/services/NvidiaAIService.ts` |
| `public/js/aiClient.js` | `public/js/nvidiaClient.js` |

## API Keys

### Main NVIDIA API Key
Added to `.env`:
```env
NVIDIA_API_KEY=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
```

### Additional API Keys (for specific models)
```env
# GLM-4.5-Air direct API (optional - can use NVIDIA instead)
GLM_4_5_AIR_API_KEY=your_glm_4_5_air_api_key

# OpenRouter (legacy - still supported)
OPENAI_API_KEY=sk-or-v1-...
```

## Available Models

### Wave Models (Free Tier)
| ID | Name | Use Case | Speed |
|----|------|----------|-------|
| `wave-flash-1` | Wave Flash 1 | Ultra-fast responses | ⚡⚡⚡ |
| `wave-flash-2` | Wave Flash 2 | Quick responses | ⚡⚡⚡ |
| `wave-flash-3` | Wave Flash 3 | Lightweight research | ⚡⚡⚡ |
| `wave-flash-4` | Wave Flash 4 | Efficient dialogue | ⚡⚡⚡ |
| `wave-flash-5` | Wave Flash 5 | Step-3.5-Flash (NVIDIA) | ⚡⚡⚡ |
| `wave-1` | Wave 1 | Fast balanced model | ⚡⚡ |
| `wave-2` | Wave 2 | General intelligence | ⚡⚡ |
| `wave-3` | Wave 3 | Balanced chat & research | ⚡⚡ |

### Wave Models (Pro Tier)
| ID | Name | Use Case | Speed |
|----|------|----------|-------|
| `wave-4` | Wave 4 | High-intelligence tasks | ⚡ |
| `wave-5` | Wave 5 | Advanced reasoning | ⚡ |
| `wave-o1` | Wave O1 | Fast thinking mode | ⚡⚡ |
| `wave-o2` | Wave O2 | Reasoning & research | ⚡ |
| `wave-o2-glm` | GLM-4.5-Air | Advanced reasoning (Zhipu) | ⚡ |
| `wave-o3` | Wave O3 | Deep logic | ⚡ |
| `wave-o4` | Wave O4 | Expert research | ⚡ |
| `wave-o5` | Wave O5 | Premium analysis | ⚡ |

### NVIDIA NIM Models (Premium)
| ID | Name | Vision? | Speed | Best For |
|----|------|---------|-------|----------|
| `nvidia-glm5` | GLM-5 (NVIDIA) | ❌ | 🐢 | Deep reasoning, agents |
| `nvidia-kimi` | Kimi K2.5 (NVIDIA) | ✅ | ⚡⚡ | Video, heavy multimodal |
| `nvidia-qwen` | Qwen3.5-VL (NVIDIA) | ✅ | ⚡⚡ | Images, docs, VQA |

## File Structure

### Backend
```
backend/src/services/
├── NvidiaAIService.ts    # NEW: NVIDIA NIM service
├── UnifiedAIService.ts   # Existing: OpenRouter service
├── AIModelConfig.ts      # UPDATED: Added NVIDIA models
└── ...
```

### Frontend
```
public/js/
├── nvidiaClient.js       # NEW: NVIDIA client library
├── settings.js           # UPDATED: Added NVIDIA model section
└── ...
```

### Configuration
```
.env                      # UPDATED: Added NVIDIA_API_KEY
.env.example              # UPDATED: Added NVIDIA_API_KEY example
backend/.env              # UPDATED: Added NVIDIA_API_KEY
```

## Usage Examples

### Frontend (Basic Chat)

```javascript
import { streamChat } from '/js/nvidiaClient.js';

await streamChat('step-3.5-flash', messages, {
  onContent: (chunk) => { 
    outputEl.textContent += chunk; 
  },
  onDone:    () => { /* hide spinner */ },
  onError:   (err) => console.error(err),
});
```

### Frontend (With Thinking)

```javascript
await streamChat('nvidia-glm5', messages, {
  onThinking: (chunk) => { 
    thinkingEl.textContent += chunk; 
  },
  onContent:  (chunk) => { 
    outputEl.textContent += chunk; 
  },
  onDone:     () => {},
  onError:    (e) => console.error(e),
});
```

### Frontend (Vision/Image)

```javascript
import { streamVisionChat } from '/js/nvidiaClient.js';

const file = imageInput.files[0];
await streamVisionChat('nvidia-qwen', 'What is in this image?', file, {
  onContent: (chunk) => { 
    outputEl.textContent += chunk; 
  },
  onDone:    () => {},
  onError:   (e) => console.error(e),
});
```

### Frontend (Agent Mode)

```javascript
import { runAgent } from '/js/nvidiaClient.js';

await runAgent('Summarize and analyze this data: ...', null, {
  onPlan:     (plan) => { planEl.textContent = plan; },
  onThinking: (chunk) => { thinkingEl.textContent += chunk; },
  onContent:  (chunk) => { outputEl.textContent += chunk; },
  onDone:     () => {},
  onError:    (e) => console.error(e),
});
```

### Backend (Service Usage)

```typescript
import { initializeNvidiaAIService } from '../services/NvidiaAIService';

// Initialize
const nvidiaService = initializeNvidiaAIService();

// Stream chat
await nvidiaService.streamChat('nvidia-glm5', messages, {
  onChunk: (chunk) => console.log(chunk),
  onThinking: (chunk) => console.log('Thinking:', chunk),
  onDone: () => console.log('Done'),
  onError: (err) => console.error(err)
});
```

## Model Selection in Settings

Users can select their preferred AI model in **Settings → API & Integrations → AI Model Selection**.

The models are organized into sections:
1. **Wave Flash** - Ultra-fast free models
2. **Wave (Default)** - Standard free models
3. **Wave O (Thinking)** - Reasoning models
4. **GLM-4.5-Air (Zhipu)** - Standalone GLM model
5. **NVIDIA NIM (Premium)** - Premium NVIDIA models

## Thinking/Reasoning Content

All NVIDIA NIM models support thinking/reasoning content. The `onThinking` callback provides the model's internal chain-of-thought, which can be displayed in a collapsible UI block.

Example UI pattern:
```html
<div class="thinking-section" collapsible>
  <details>
    <summary>🧠 Model Reasoning</summary>
    <div class="thinking-content"></div>
  </details>
</div>
```

## API Key Management

### Getting a NVIDIA API Key

1. Go to [build.nvidia.com](https://build.nvidia.com)
2. Log in or sign up
3. Navigate to **API Keys**
4. Click **Generate Key**
5. Copy the key (starts with `nvapi-`)

### Storing API Keys

- **Server-side**: Add to `.env` or `backend/.env`
- **Client-side**: Store in localStorage (encrypted)
- **Never commit** API keys to version control

### Free Tier Limits

The NVIDIA NIM free tier has limited credits. For production use:
1. Monitor usage in the NVIDIA dashboard
2. Top up credits on [build.nvidia.com](https://build.nvidia.com)
3. Consider implementing rate limiting

## Migration Checklist

- [x] Add `NVIDIA_API_KEY` to `.env` files
- [x] Create `NvidiaAIService.ts`
- [x] Create `nvidiaClient.js`
- [x] Update `AIModelConfig.ts` with NVIDIA models
- [x] Update `settings.js` with NVIDIA section
- [x] Update `ai-chat.html` with model mappings
- [ ] Update server.ts to initialize NVIDIA service
- [ ] Test all models in chat
- [ ] Update documentation

## Troubleshooting

### "NVIDIA API key not set" error
- Check that `NVIDIA_API_KEY` is in your `.env` file
- Restart the server after adding the key
- Verify the key starts with `nvapi-`

### Model not found error
- Ensure the model ID matches exactly (case-sensitive)
- Check that the model is in `AIModelConfig.ts`
- Verify the model mapping in `ai-chat.html`

### Streaming not working
- Check that `stream: true` is set in the payload
- Verify the `Accept: text/event-stream` header
- Ensure the response reader is properly handling chunks

## Notes

- All 4 NVIDIA models support thinking/reasoning
- The free tier has limited credits
- Never commit API keys (they're in `.env` which is in `.gitignore`)
- One API key works for all models
- Vision models (`nvidia-qwen`, `nvidia-kimi`) support image uploads

## Resources

- [NVIDIA NIM Documentation](https://build.nvidia.com)
- [GLM-5 Model Page](https://build.nvidia.com/z-ai/glm5)
- [Kimi K2.5 Model Page](https://build.nvidia.com/moonshotai/kimi-k2.5)
- [Qwen3.5-VL Model Page](https://build.nvidia.com/qwen/qwen3.5-397b-a17b)
