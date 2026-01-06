// AI Model Configuration - OpenRouter Models
export interface AIModel {
  id: string;
  name: string;
  tier: 'free' | 'pro';
  useCase: string;
  reasoning: string;
  openRouterModel: string;
}

export const AI_MODELS: AIModel[] = [
  // Free Models (Limited selection)
  {
    id: 'wave-llama-3.2',
    name: 'Wave Llama 3.2',
    tier: 'free',
    useCase: 'General chat & Q&A',
    reasoning: 'Medium reasoning for everyday tasks',
    openRouterModel: 'meta-llama/llama-3.2-3b-instruct:free'
  },
  {
    id: 'wave-flash-2',
    name: 'Wave Flash 2',
    tier: 'free',
    useCase: 'Quick responses',
    reasoning: 'Fast responses for simple questions',
    openRouterModel: 'xiaomi/mimo-v2-flash:free'
  },
  {
    id: 'wave-gemini-flash-2',
    name: 'Wave Gemini Flash 2',
    tier: 'free',
    useCase: 'Quick research',
    reasoning: 'Fast & accurate for easy Q&A',
    openRouterModel: 'google/gemini-2.0-flash-experimental:free'
  },
  
  // Pro Models (Advanced & Specialized)
  {
    id: 'wave-r1',
    name: 'Wave R1',
    tier: 'pro',
    useCase: 'Research & coding',
    reasoning: 'Very strong reasoning for complex tasks',
    openRouterModel: 'deepseek/deepseek-r1-0528:free'
  },
  {
    id: 'wave-deepseek-v3.1',
    name: 'Wave DeepSeek V3.1',
    tier: 'pro',
    useCase: 'Advanced reasoning',
    reasoning: 'Strong reasoning with NEX optimization',
    openRouterModel: 'nex-agi/deepseek-v3.1-nex-n1:free'
  },
  {
    id: 'wave-r1t-chimera',
    name: 'Wave R1T Chimera',
    tier: 'pro',
    useCase: 'Dialogue & storytelling',
    reasoning: 'Creative tasks with medium reasoning',
    openRouterModel: 'tngtech/deepseek-r1t-chimera:free'
  },
  {
    id: 'wave-r1t2-chimera',
    name: 'Wave R1T2 Chimera',
    tier: 'pro',
    useCase: 'Long-context analysis',
    reasoning: 'Excellent reasoning for open-ended generation',
    openRouterModel: 'tngtech/deepseek-r1t2-chimera:free'
  },
  {
    id: 'wave-hermes-3',
    name: 'Wave Hermes 3',
    tier: 'pro',
    useCase: 'Multi-turn chat',
    reasoning: 'Very strong reasoning with structured outputs',
    openRouterModel: 'nous/hermes-3-405b-instruct:free'
  },
  {
    id: 'wave-llama-3.3',
    name: 'Wave Llama 3.3',
    tier: 'pro',
    useCase: 'Multilingual research',
    reasoning: 'Very strong reasoning',
    openRouterModel: 'meta/llama-3.3-70b-instruct:free'
  },
  {
    id: 'wave-llama-3.1',
    name: 'Wave Llama 3.1',
    tier: 'pro',
    useCase: 'Multi-turn dialogue',
    reasoning: 'Very strong reasoning for coding',
    openRouterModel: 'meta/llama-3.1-405b-instruct:free'
  },
  {
    id: 'wave-olmo-3.1',
    name: 'Wave Olmo 3.1',
    tier: 'pro',
    useCase: 'Reasoning-heavy questions',
    reasoning: 'Strong reasoning for research',
    openRouterModel: 'allenai/olmo-3.1-32b-think:free'
  },
  {
    id: 'wave-kat-coder-pro',
    name: 'Wave KAT-Coder Pro',
    tier: 'pro',
    useCase: 'Agentic coding',
    reasoning: 'Strong reasoning for software engineering',
    openRouterModel: 'kwaipilot/kat-coder-pro-v1:free'
  },
  {
    id: 'wave-devstral-2',
    name: 'Wave Devstral 2',
    tier: 'pro',
    useCase: 'Codebase orchestration',
    reasoning: 'Strong reasoning for agentic coding',
    openRouterModel: 'mistralai/devstral-2-2512:free'
  },
  {
    id: 'wave-qwen-2.5-vl',
    name: 'Wave Qwen 2.5 VL',
    tier: 'pro',
    useCase: 'Multimodal analysis',
    reasoning: 'Medium reasoning with structured outputs',
    openRouterModel: 'qwen/qwen-2.5-vl-7b-instruct:free'
  },
  {
    id: 'wave-qwen-3',
    name: 'Wave Qwen 3',
    tier: 'pro',
    useCase: 'Multimodal research',
    reasoning: 'Strong reasoning with verification',
    openRouterModel: 'qwen/qwen-3-4b:free'
  },
  {
    id: 'wave-gemini-3',
    name: 'Wave Gemini 3',
    tier: 'pro',
    useCase: 'Research-heavy tasks',
    reasoning: 'Very strong reasoning with multimodal',
    openRouterModel: 'google/gemma-3-27b:free'
  },
  {
    id: 'wave-glm-air',
    name: 'Wave GLM Air',
    tier: 'pro',
    useCase: 'Quick research & Q&A',
    reasoning: 'Medium reasoning with thinking toggle',
    openRouterModel: 'z-ai/glm-4.5-air:free'
  },
  {
    id: 'wave-nemotron-30b',
    name: 'Wave Nemotron 30B',
    tier: 'pro',
    useCase: 'Lightweight research',
    reasoning: 'Basic reasoning for coding',
    openRouterModel: 'nvidia/nemotron-3-nano-30b-a3b:free'
  },
  {
    id: 'wave-nemotron-12b-vl',
    name: 'Wave Nemotron 12B VL',
    tier: 'pro',
    useCase: 'Document & image research',
    reasoning: 'Medium reasoning with OCR & charts',
    openRouterModel: 'nvidia/nemotron-nano-12b-2-vl:free'
  },
  {
    id: 'wave-trinity-mini',
    name: 'Wave Trinity Mini',
    tier: 'pro',
    useCase: 'Structured research',
    reasoning: 'Medium reasoning for lightweight tasks',
    openRouterModel: 'arcee-ai/trinity-mini:free'
  }
];

export function getAvailableModels(isPro: boolean = false): AIModel[] {
  if (isPro) {
    return AI_MODELS;
  }
  return AI_MODELS.filter(m => m.tier === 'free');
}
