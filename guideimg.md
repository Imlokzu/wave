# Qwen3.5-397B-A17B Vision Guide

## Overview

WaveChat now supports **multimodal AI chat** with image analysis using the **Qwen3.5-397B-A17B** model from NVIDIA NIM.

## Features

- 🖼️ **Multi-image upload** - Upload up to 5 images per message
- 🎯 **Smart model detection** - Automatically detects vision-enabled models
- 📸 **Drag & drop** - Drag images directly onto the chat
- 🖼️ **Preview thumbnails** - See image previews before sending
- 🤖 **AI analysis** - Get detailed descriptions and answers about images

## Supported Models

| Model | Vision | Thinking | Max Tokens | Speed |
|-------|--------|----------|------------|-------|
| **Qwen3.5-397B-A17B** | ✅ | ✅ | 32,768 | Medium |
| **Qwen3.5-VL** | ✅ | ✅ | 16,384 | Medium |
| **Kimi K2.5** | ✅ | ✅ | 16,384 | Medium |
| Step-3.5-Flash | ❌ | ❌ | 16,384 | Fast |
| GLM-5 | ❌ | ✅ | 16,384 | Slow |

## How to Use

### 1. Select a Vision Model

Go to **Settings** → **AI Model** and select:
- `Qwen3.5-397B-A17B` (Recommended - Best multimodal reasoning)
- `Qwen3.5-VL` (Alternative vision model)

### 2. Upload Images

**Method 1: Attachment Menu**
1. Click the **+** (attachment) button
2. Select **Image** from the menu
3. Choose image(s) from your device

**Method 2: Drag & Drop**
1. Drag image files onto the chat area
2. Drop when you see the highlight effect

### 3. Ask Questions

Type your question about the images:
- "What's in this image?"
- "Describe this diagram"
- "Extract text from this screenshot"
- "What color is the car?"

### 4. Send

Press **Send** or hit **Enter**. The AI will analyze all attached images and respond.

## UI Elements

### Image Preview Container
```
┌─────────────────────────────────┐
│ [img1] [img2] [img3]      [×]   │  ← Preview thumbnails
└─────────────────────────────────┘
```

- Click **×** on thumbnail to remove
- All images clear after sending

### Attachment Menu
```
┌────────────────────────┐
│ 🖼️ Image              │  ← Vision models only
│    AI Vision (Qwen)    │
│ 📎 File               │
│ 🎭 Sticker            │
│ 🎵 Audio (MP3)        │
│ ────────────────────  │
│ 📞 Voice Call         │
└────────────────────────┘
```

## API Usage

### Using `nvidiaClient.js`

```javascript
import { streamVisionChat, modelSupportsVision } from '/js/nvidiaClient.js';

// Check if model supports vision
if (modelSupportsVision('qwen3.5-397b-a17b')) {
  // Send image with prompt
  await streamVisionChat('qwen3.5-397b-a17b', 'Describe this image', imageFile, {
    onContent: (chunk) => {
      console.log('AI:', chunk);
    },
    onDone: () => {
      console.log('Complete!');
    },
    onError: (err) => {
      console.error('Error:', err);
    }
  });
}
```

### Using `AIImageChat` Class

```javascript
// Access the global instance
const imageChat = window.aiImageChat;

// Get attached images
const images = imageChat.getAttachedImages();

// Send with custom callbacks
await imageChat.sendWithImages(
  'Analyze this',
  (chunk) => console.log(chunk),  // onChunk
  () => console.log('Done'),       // onDone
  (err) => console.error(err)     // onError
);
```

## Best Practices

### For Best Results

1. **Use high-quality images** - Clear, well-lit photos work best
2. **Be specific in prompts** - "What's the main subject?" vs "Describe"
3. **One topic per image** - Avoid cluttered images
4. **Use thinking mode** - Qwen3.5-397B-A17B has reasoning enabled by default

### Recommended Settings

```json
{
  "model": "qwen3.5-397b-a17b",
  "temperature": 0.6,
  "topP": 0.95,
  "topK": 20,
  "maxTokens": 32768
}
```

### File Formats

Supported image formats:
- ✅ JPEG / JPG
- ✅ PNG
- ✅ WebP
- ✅ GIF (first frame)
- ✅ BMP

### Size Limits

- **Max images per message**: 5
- **Recommended file size**: < 5MB per image
- **Total upload size**: < 25MB per message

## Troubleshooting

### "Select a vision model" alert

**Problem**: Image upload is disabled
**Solution**: Go to Settings → AI Model → Select Qwen3.5-VL or Qwen3.5-397B-A17B

### Images not uploading

**Problem**: Upload fails or times out
**Solution**: 
1. Check file size (should be < 5MB)
2. Check internet connection
3. Verify NVIDIA API key is set in Settings

### AI not responding to images

**Problem**: AI ignores images
**Solution**:
1. Confirm vision model is selected
2. Check that images are attached (see previews)
3. Include image reference in prompt ("this image", "the diagram")

## Technical Details

### Architecture

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Chat UI     │────▶│  AIImageChat    │────▶│  nvidiaClient.js │
│  (chat.html) │     │  (ai-image-     │     │  (streamVision-  │
│              │     │   chat.js)      │     │   Chat)          │
└──────────────┘     └─────────────────┘     └──────────────────┘
                                                    │
                                                    ▼
                                         ┌──────────────────┐
                                         │  NVIDIA NIM API  │
                                         │  (qwen3.5-397b-  │
                                         │   a17b)          │
                                         └──────────────────┘
```

### Image Processing Flow

1. **User selects image** → File input or drag-drop
2. **Convert to base64** → FileReader API
3. **Build message** → Text + image URLs in content array
4. **Stream to NVIDIA** → POST /v1/chat/completions
5. **Display response** → Stream chunks to UI

### Message Format

```json
{
  "model": "qwen3.5-397b-a17b",
  "messages": [{
    "role": "user",
    "content": [
      { "type": "text", "text": "Describe this image" },
      { 
        "type": "image_url", 
        "image_url": { 
          "url": "data:image/jpeg;base64,/9j/4AAQSkZJRg..." 
        } 
      }
    ]
  }],
  "max_tokens": 32768,
  "temperature": 0.6,
  "top_p": 0.95,
  "top_k": 20,
  "stream": true
}
```

## Examples

### Example 1: Image Description

**User**: [uploads photo of sunset]
**Prompt**: "Describe this scene in detail"
**AI**: "This is a beautiful sunset over the ocean. The sky displays vibrant hues of orange, pink, and purple..."

### Example 2: Text Extraction (OCR)

**User**: [uploads screenshot of document]
**Prompt**: "Extract all text from this image"
**AI**: "Here's the text I can see in the image: [extracted text]..."

### Example 3: Diagram Analysis

**User**: [uploads flowchart]
**Prompt**: "Explain what this diagram shows"
**AI**: "This is a system architecture diagram showing three main components: 1) Frontend layer..."

### Example 4: Code Screenshot

**User**: [uploads photo of code on screen]
**Prompt**: "What programming language is this? Explain the code"
**AI**: "This is Python code. The function defines a class that..."

## Related Files

- `/public/js/nvidiaClient.js` - NVIDIA NIM API client
- `/public/js/ai-image-chat.js` - Image upload & preview handler
- `/public/chat.html` - Main chat UI
- `/public/js/app.js` - Application logic

## NVIDIA NIM API

**Endpoint**: `https://integrate.api.nvidia.com/v1/chat/completions`

**API Key**: Set in Settings → NVIDIA API Key

**Documentation**: https://build.nvidia.com/qwen/qwen3_5-397b-a17b

---

*Last updated: February 26, 2026*
