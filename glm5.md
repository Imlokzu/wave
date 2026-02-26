# GLM-5 and NVIDIA NIM Models Setup

## API Keys

### Primary NVIDIA API Key
```
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
```

This key works for all 4 NVIDIA NIM models.

## Environment Variables

Add to `.env`:
```env
# NVIDIA NIM API (Primary)
NVIDIA_API_KEY=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
```

## Available Models

### 1. Step-3.5-Flash (FREE)
- **Model ID**: `step-3.5-flash`
- **API Name**: `stepfun-ai/step-3.5-flash`
- **Best for**: Fast chat, streaming responses
- **Speed**: ⚡⚡⚡ Very fast
- **Context**: 32K tokens
- **Vision**: No
- **Thinking**: No

### 2. GLM-5 (PRO)
- **Model ID**: `glm5`
- **API Name**: `z-ai/glm5`
- **Best for**: Deep reasoning, complex analysis, agent tasks
- **Speed**: ⚡ Slower but thorough
- **Context**: 128K tokens
- **Vision**: No
- **Thinking**: Yes (reasoning_content)

### 3. Qwen3.5-VL (PRO)
- **Model ID**: `qwen3.5-vl`
- **API Name**: `qwen/qwen3.5-397b-a17b`
- **Best for**: Vision & document analysis
- **Speed**: ⚡⚡ Medium
- **Context**: 256K tokens
- **Vision**: Yes
- **Thinking**: Yes
- **Parameters**: 397B
- **Supports**:
  - 📷 Image analysis & description
  - 📄 PDF documents
  - 📊 Charts & graphs
  - 📝 OCR (text extraction from images)
  - 🖼️ Screenshots & diagrams
  - 👀 Visual Q&A (answer questions about images)

### 4. Kimi K2.5 (PRO)
- **Model ID**: `kimi-k2.5`
- **API Name**: `moonshotai/kimi-k2.5`
- **Best for**: Video analysis, heavy multimodal tasks
- **Speed**: ⚡⚡ Medium
- **Context**: 200K+ tokens
- **Vision**: Yes
- **Thinking**: Yes

## Model Selection

| Use Case | Recommended Model |
|----------|------------------|
| Fast chat | Step-3.5-Flash |
| Deep reasoning | GLM-5 |
| Image analysis | Qwen3.5-VL |
| Video analysis | Kimi K2.5 |
| Document OCR | Qwen3.5-VL |
| Code generation | GLM-5 |
| Quick answers | Step-3.5-Flash |
| Complex analysis | GLM-5 |
