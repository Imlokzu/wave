// ============================================================================
// 📚 BEGINNER'S GUIDE TO THIS FILE
// ============================================================================
//
// 🎯 WHAT THIS FILE DOES:
// This file is like a "catalog" or "menu" of AI models that users can choose from
// in your Wave Messenger app. Think of it like a restaurant menu showing all
// available dishes (AI models) with their descriptions and prices (free vs pro).
//
// 🏗️ HOW IT FITS INTO THE PROJECT:
// When a user wants to chat with AI, they can select which AI model to use.
// This file defines ALL the available models and their properties.
// Other parts of your app (like the settings page or AI chat) will import
// this file to show users which models they can choose from.
//
// 👀 WHAT TO PAY ATTENTION TO AS A BEGINNER:
// 1. The "interface" (blueprint) that defines what an AI model looks like
// 2. The big array (list) of all 20 AI models
// 3. The function at the bottom that filters models based on user subscription
//
// 💡 KEY CONCEPTS YOU'LL LEARN:
// - What an "interface" is (a blueprint/template)
// - How to create an array of objects
// - How to filter arrays based on conditions
// - How "export" makes code available to other files
//
// ============================================================================


// ============================================================================
// STEP 1: DEFINE THE BLUEPRINT (Interface)
// ============================================================================
//
// 🤔 WHAT IS AN INTERFACE?
// An interface is like a form or template that says "every AI model MUST have
// these exact properties". It's TypeScript's way of ensuring consistency.
//
// 🌍 REAL-LIFE ANALOGY:
// Think of it like a job application form. Every applicant must fill out:
// - Name
// - Age
// - Email
// - Phone number
// The form ensures everyone provides the same information.
//
// 📝 WHY WE USE IT:
// Without this interface, someone could create an AI model object with
// random properties, causing errors. The interface enforces rules.
//
// 🔍 HOW IT'S USED LATER:
// When we create AI model objects below, TypeScript checks that each one
// follows this exact structure. If we forget a property or use the wrong
// type, TypeScript will show an error.

export interface AIModel {
  // "export" = Other files can import and use this interface
  // "interface" = This is a blueprint/template
  // "AIModel" = The name of this blueprint
  
  // -------------------------
  // Property 1: id
  // -------------------------
  // WHAT: A unique identifier for this model (like "wave-r1" or "wave-flash-2")
  // WHY: We need a way to refer to each model in code
  // TYPE: string = text (not a number, not true/false, just text)
  // EXAMPLE: "wave-r1", "wave-gemini-3"
  id: string;
  
  // -------------------------
  // Property 2: name
  // -------------------------
  // WHAT: The display name shown to users (like "Wave R1" or "Wave Flash 2")
  // WHY: Users see this in the settings menu when choosing a model
  // TYPE: string = text
  // EXAMPLE: "Wave R1", "Wave Gemini Flash 2"
  name: string;
  
  // -------------------------
  // Property 3: tier
  // -------------------------
  // WHAT: Is this model free or paid?
  // WHY: We need to know if users need a Pro subscription to use it
  // TYPE: 'free' | 'pro' = ONLY these two exact words are allowed (nothing else!)
  // EXAMPLE: 'free' or 'pro' (must be lowercase, must be one of these two)
  // NOTE: The | symbol means "OR" - so it's "free OR pro"
  tier: 'free' | 'pro';
  
  // -------------------------
  // Property 4: useCase
  // -------------------------
  // WHAT: A short description of what this model is best at
  // WHY: Helps users choose the right model for their task
  // TYPE: string = text
  // EXAMPLE: "Research & coding", "Quick responses", "General chat"
  useCase: string;
  
  // -------------------------
  // Property 5: reasoning
  // -------------------------
  // WHAT: Describes how "smart" or capable the model is
  // WHY: Users want to know if a model can handle complex tasks
  // TYPE: string = text
  // EXAMPLE: "Very strong reasoning", "Fast responses", "Medium reasoning"
  reasoning: string;
  
  // -------------------------
  // Property 6: openRouterModel
  // -------------------------
  // WHAT: The actual model name used by the OpenRouter API
  // WHY: When we call the AI API, we need to tell it which model to use
  // TYPE: string = text
  // EXAMPLE: "deepseek/deepseek-r1-0528:free", "meta-llama/llama-3.2-3b-instruct:free"
  // NOTE: This is the "technical name" that the API understands
  openRouterModel: string;
}


// ============================================================================
// STEP 2: CREATE THE CATALOG (Array of AI Models)
// ============================================================================
//
// 🤔 WHAT IS THIS?
// This is a big list (array) containing ALL 20 AI models available in your app.
// Each model is an object that follows the AIModel interface we defined above.
//
// 🌍 REAL-LIFE ANALOGY:
// Think of this like a restaurant menu:
// - Each item on the menu is a model
// - Each item has a name, description, and price (free vs pro)
// - Customers (users) can look at the menu and choose what they want
//
// 📝 WHY WE USE IT:
// We need a central place to store all available models. When users open
// the settings page, the app reads this list to show them their options.
//
// 🔍 HOW IT'S USED LATER:
// Other files will import this array like this:
//   import { AI_MODELS } from './AIModelConfig';
//   console.log(AI_MODELS.length); // 20
//   console.log(AI_MODELS[0].name); // "Wave Llama 3.2"

export const AI_MODELS: AIModel[] = [
  // "export" = Other files can import this
  // "const" = This is a constant (won't change)
  // "AI_MODELS" = The name of this list
  // ": AIModel[]" = This is an array (list) of AIModel objects
  //                 The [] means "array" or "list"
  
  
  // ==========================================================================
  // 🆓 FREE MODELS (Available to everyone)
  // ==========================================================================
  // These 3 models are available to all users, even without a subscription
  
  
  // --------------------------------------------------------------------------
  // FREE MODEL #1: Wave Llama 3.2
  // --------------------------------------------------------------------------
  // WHO AM I? I'm a general-purpose AI model good for everyday conversations
  // WHEN TO USE ME: Normal chat, simple questions, general Q&A
  // MY STRENGTH: Balanced - not too fast, not too slow, decent at most things
  {
    id: 'wave-llama-3.2',                                    // Internal code name
    name: 'Wave Llama 3.2',                                  // What users see
    tier: 'free',                                            // Free for everyone
    useCase: 'General chat & Q&A',                           // Best for everyday use
    reasoning: 'Medium reasoning for everyday tasks',        // Moderately smart
    openRouterModel: 'meta-llama/llama-3.2-3b-instruct:free' // API model name
  },
  
  
  // --------------------------------------------------------------------------
  // FREE MODEL #2: Wave Flash 2
  // --------------------------------------------------------------------------
  // WHO AM I? I'm the FASTEST free model - I give quick, simple answers
  // WHEN TO USE ME: When you need a fast answer to a simple question
  // MY STRENGTH: Speed! I respond almost instantly
  // MY WEAKNESS: Not great for complex tasks or deep thinking
  {
    id: 'wave-flash-2',                      // Internal code name
    name: 'Wave Flash 2',                    // What users see
    tier: 'free',                            // Free for everyone
    useCase: 'Quick responses',              // Best for simple questions
    reasoning: 'Fast responses for simple questions', // Fast but basic
    openRouterModel: 'xiaomi/mimo-v2-flash:free'     // API model name
  },
  
  
  // --------------------------------------------------------------------------
  // FREE MODEL #3: Wave Gemini Flash 2
  // --------------------------------------------------------------------------
  // WHO AM I? I'm Google's fast model - good for quick research
  // WHEN TO USE ME: When you need accurate answers quickly
  // MY STRENGTH: Fast AND accurate for easy questions
  {
    id: 'wave-gemini-flash-2',                           // Internal code name
    name: 'Wave Gemini Flash 2',                         // What users see
    tier: 'free',                                        // Free for everyone
    useCase: 'Quick research',                           // Best for fast lookups
    reasoning: 'Fast & accurate for easy Q&A',           // Quick and reliable
    openRouterModel: 'google/gemini-2.0-flash-experimental:free' // API model name
  },
  
  
  // ==========================================================================
  // 💎 PRO MODELS (Require paid subscription)
  // ==========================================================================
  // These 17 models are only available to users with a Pro subscription
  // They are more powerful, specialized, and better at complex tasks
  
  
  // --------------------------------------------------------------------------
  // PRO MODEL #1: Wave R1 (⭐ MOST POPULAR PRO MODEL)
  // --------------------------------------------------------------------------
  // WHO AM I? I'm the smartest model for research and coding
  // WHEN TO USE ME: Complex questions, coding help, deep research
  // MY STRENGTH: Very strong reasoning - I can handle difficult tasks
  // MY SPECIALTY: Technical work, programming, detailed analysis
  {
    id: 'wave-r1',                                           // Internal code name
    name: 'Wave R1',                                         // What users see
    tier: 'pro',                                             // Requires Pro subscription
    useCase: 'Research & coding',                            // Best for technical work
    reasoning: 'Very strong reasoning for complex tasks',    // Very smart!
    openRouterModel: 'deepseek/deepseek-r1-0528:free'       // API model name
  },
  
  
  // --------------------------------------------------------------------------
  // PRO MODEL #2: Wave DeepSeek V3.1
  // --------------------------------------------------------------------------
  // WHO AM I? I'm an advanced reasoning model with NEX optimization
  // WHEN TO USE ME: When you need strong logical thinking
  // MY STRENGTH: Advanced reasoning with special optimization
  {
    id: 'wave-deepseek-v3.1',                    // Internal code name
    name: 'Wave DeepSeek V3.1',                  // What users see
    tier: 'pro',                                 // Requires Pro subscription
    useCase: 'Advanced reasoning',               // Best for logical tasks
    reasoning: 'Strong reasoning with NEX optimization', // Optimized for thinking
    openRouterModel: 'nex-agi/deepseek-v3.1-nex-n1:free' // API model name
  },
  
  
  // --------------------------------------------------------------------------
  // PRO MODEL #3: Wave R1T Chimera
  // --------------------------------------------------------------------------
  // WHO AM I? I'm creative! Good for stories and conversations
  // WHEN TO USE ME: Writing stories, creative dialogue, roleplay
  // MY STRENGTH: Creative tasks and natural conversation
  {
    id: 'wave-r1t-chimera',                      // Internal code name
    name: 'Wave R1T Chimera',                    // What users see
    tier: 'pro',                                 // Requires Pro subscription
    useCase: 'Dialogue & storytelling',          // Best for creative writing
    reasoning: 'Creative tasks with medium reasoning', // Creative but smart
    openRouterModel: 'tngtech/deepseek-r1t-chimera:free' // API model name
  },
  
  
  // --------------------------------------------------------------------------
  // PRO MODEL #4: Wave R1T2 Chimera
  // --------------------------------------------------------------------------
  // WHO AM I? I'm great at handling long, complex conversations
  // WHEN TO USE ME: Long documents, extended analysis, deep discussions
  // MY STRENGTH: Can handle lots of context and long-form content
  {
    id: 'wave-r1t2-chimera',                     // Internal code name
    name: 'Wave R1T2 Chimera',                   // What users see
    tier: 'pro',                                 // Requires Pro subscription
    useCase: 'Long-context analysis',            // Best for long content
    reasoning: 'Excellent reasoning for open-ended generation', // Great for essays
    openRouterModel: 'tngtech/deepseek-r1t2-chimera:free' // API model name
  },
  
  
  // --------------------------------------------------------------------------
  // PRO MODEL #5: Wave Hermes 3
  // --------------------------------------------------------------------------
  // WHO AM I? I'm excellent at multi-turn conversations with structure
  // WHEN TO USE ME: Back-and-forth discussions, structured outputs
  // MY STRENGTH: Very strong reasoning + can format responses nicely
  {
    id: 'wave-hermes-3',                         // Internal code name
    name: 'Wave Hermes 3',                       // What users see
    tier: 'pro',                                 // Requires Pro subscription
    useCase: 'Multi-turn chat',                  // Best for conversations
    reasoning: 'Very strong reasoning with structured outputs', // Smart + organized
    openRouterModel: 'nous/hermes-3-405b-instruct:free' // API model name
  },
  
  
  // --------------------------------------------------------------------------
  // PRO MODEL #6: Wave Llama 3.3
  // --------------------------------------------------------------------------
  // WHO AM I? I'm great at multiple languages and research
  // WHEN TO USE ME: Non-English languages, multilingual research
  // MY STRENGTH: Very strong reasoning + multilingual support
  {
    id: 'wave-llama-3.3',                        // Internal code name
    name: 'Wave Llama 3.3',                      // What users see
    tier: 'pro',                                 // Requires Pro subscription
    useCase: 'Multilingual research',            // Best for multiple languages
    reasoning: 'Very strong reasoning',          // Very smart
    openRouterModel: 'meta/llama-3.3-70b-instruct:free' // API model name
  },
  
  
  // --------------------------------------------------------------------------
  // PRO MODEL #7: Wave Llama 3.1
  // --------------------------------------------------------------------------
  // WHO AM I? I'm excellent at coding and technical conversations
  // WHEN TO USE ME: Programming help, technical discussions
  // MY STRENGTH: Very strong reasoning for coding tasks
  {
    id: 'wave-llama-3.1',                        // Internal code name
    name: 'Wave Llama 3.1',                      // What users see
    tier: 'pro',                                 // Requires Pro subscription
    useCase: 'Multi-turn dialogue',              // Best for conversations
    reasoning: 'Very strong reasoning for coding', // Great at programming
    openRouterModel: 'meta/llama-3.1-405b-instruct:free' // API model name
  },
  
  
  // --------------------------------------------------------------------------
  // PRO MODEL #8: Wave Olmo 3.1
  // --------------------------------------------------------------------------
  // WHO AM I? I'm specialized in reasoning-heavy questions
  // WHEN TO USE ME: Complex research, logical puzzles, analysis
  // MY STRENGTH: Strong reasoning for research tasks
  {
    id: 'wave-olmo-3.1',                         // Internal code name
    name: 'Wave Olmo 3.1',                       // What users see
    tier: 'pro',                                 // Requires Pro subscription
    useCase: 'Reasoning-heavy questions',        // Best for complex thinking
    reasoning: 'Strong reasoning for research',  // Good at logic
    openRouterModel: 'allenai/olmo-3.1-32b-think:free' // API model name
  },
  
  
  // --------------------------------------------------------------------------
  // PRO MODEL #9: Wave KAT-Coder Pro
  // --------------------------------------------------------------------------
  // WHO AM I? I'm a specialized coding assistant
  // WHEN TO USE ME: Software engineering, code generation, debugging
  // MY STRENGTH: Strong reasoning specifically for programming
  {
    id: 'wave-kat-coder-pro',                   // Internal code name
    name: 'Wave KAT-Coder Pro',                 // What users see
    tier: 'pro',                                // Requires Pro subscription
    useCase: 'Agentic coding',                  // Best for programming
    reasoning: 'Strong reasoning for software engineering', // Code specialist
    openRouterModel: 'kwaipilot/kat-coder-pro-v1:free' // API model name
  },
  
  
  // --------------------------------------------------------------------------
  // PRO MODEL #10: Wave Devstral 2
  // --------------------------------------------------------------------------
  // WHO AM I? I'm great at managing entire codebases
  // WHEN TO USE ME: Large projects, codebase orchestration, architecture
  // MY STRENGTH: Strong reasoning for agentic coding (managing code projects)
  {
    id: 'wave-devstral-2',                      // Internal code name
    name: 'Wave Devstral 2',                    // What users see
    tier: 'pro',                                // Requires Pro subscription
    useCase: 'Codebase orchestration',          // Best for big projects
    reasoning: 'Strong reasoning for agentic coding', // Project management
    openRouterModel: 'mistralai/devstral-2-2512:free' // API model name
  },
  
  
  // --------------------------------------------------------------------------
  // PRO MODEL #11: Wave Qwen 2.5 VL
  // --------------------------------------------------------------------------
  // WHO AM I? I can analyze images AND text (multimodal)
  // WHEN TO USE ME: Image analysis, visual questions, charts
  // MY STRENGTH: Can "see" images and provide structured outputs
  // NOTE: VL = Vision-Language (can handle both images and text)
  {
    id: 'wave-qwen-2.5-vl',                     // Internal code name
    name: 'Wave Qwen 2.5 VL',                   // What users see
    tier: 'pro',                                // Requires Pro subscription
    useCase: 'Multimodal analysis',             // Best for images + text
    reasoning: 'Medium reasoning with structured outputs', // Smart + organized
    openRouterModel: 'qwen/qwen-2.5-vl-7b-instruct:free' // API model name
  },
  
  
  // --------------------------------------------------------------------------
  // PRO MODEL #12: Wave Qwen 3
  // --------------------------------------------------------------------------
  // WHO AM I? I'm multimodal with verification capabilities
  // WHEN TO USE ME: Research with fact-checking, multimodal tasks
  // MY STRENGTH: Strong reasoning + can verify information
  {
    id: 'wave-qwen-3',                          // Internal code name
    name: 'Wave Qwen 3',                        // What users see
    tier: 'pro',                                // Requires Pro subscription
    useCase: 'Multimodal research',             // Best for research with images
    reasoning: 'Strong reasoning with verification', // Smart + fact-checks
    openRouterModel: 'qwen/qwen-3-4b:free'     // API model name
  },
  
  
  // --------------------------------------------------------------------------
  // PRO MODEL #13: Wave Gemini 3
  // --------------------------------------------------------------------------
  // WHO AM I? I'm Google's powerful multimodal model
  // WHEN TO USE ME: Research-heavy tasks, complex analysis
  // MY STRENGTH: Very strong reasoning + multimodal (images + text)
  {
    id: 'wave-gemini-3',                        // Internal code name
    name: 'Wave Gemini 3',                      // What users see
    tier: 'pro',                                // Requires Pro subscription
    useCase: 'Research-heavy tasks',            // Best for deep research
    reasoning: 'Very strong reasoning with multimodal', // Very smart + images
    openRouterModel: 'google/gemma-3-27b:free' // API model name
  },
  
  
  // --------------------------------------------------------------------------
  // PRO MODEL #14: Wave GLM Air
  // --------------------------------------------------------------------------
  // WHO AM I? I'm a quick research model with a "thinking toggle"
  // WHEN TO USE ME: Quick research, Q&A with optional deep thinking
  // MY STRENGTH: Medium reasoning + can switch between fast/deep modes
  {
    id: 'wave-glm-air',                         // Internal code name
    name: 'Wave GLM Air',                       // What users see
    tier: 'pro',                                // Requires Pro subscription
    useCase: 'Quick research & Q&A',            // Best for fast research
    reasoning: 'Medium reasoning with thinking toggle', // Flexible thinking
    openRouterModel: 'z-ai/glm-4.5-air:free'   // API model name
  },
  
  
  // --------------------------------------------------------------------------
  // PRO MODEL #15: Wave Nemotron 30B
  // --------------------------------------------------------------------------
  // WHO AM I? I'm a lightweight coding model
  // WHEN TO USE ME: Simple coding tasks, quick code generation
  // MY STRENGTH: Basic reasoning for coding (good for beginners)
  {
    id: 'wave-nemotron-30b',                    // Internal code name
    name: 'Wave Nemotron 30B',                  // What users see
    tier: 'pro',                                // Requires Pro subscription
    useCase: 'Lightweight research',            // Best for simple tasks
    reasoning: 'Basic reasoning for coding',    // Good for basic code
    openRouterModel: 'nvidia/nemotron-3-nano-30b-a3b:free' // API model name
  },
  
  
  // --------------------------------------------------------------------------
  // PRO MODEL #16: Wave Nemotron 12B VL
  // --------------------------------------------------------------------------
  // WHO AM I? I can read documents and analyze images (OCR + charts)
  // WHEN TO USE ME: Document analysis, chart reading, image text extraction
  // MY STRENGTH: Medium reasoning + OCR (can read text in images)
  // NOTE: VL = Vision-Language, OCR = Optical Character Recognition
  {
    id: 'wave-nemotron-12b-vl',                 // Internal code name
    name: 'Wave Nemotron 12B VL',               // What users see
    tier: 'pro',                                // Requires Pro subscription
    useCase: 'Document & image research',       // Best for documents
    reasoning: 'Medium reasoning with OCR & charts', // Can read images
    openRouterModel: 'nvidia/nemotron-nano-12b-2-vl:free' // API model name
  },
  
  
  // --------------------------------------------------------------------------
  // PRO MODEL #17: Wave Trinity Mini
  // --------------------------------------------------------------------------
  // WHO AM I? I'm good at structured, lightweight research
  // WHEN TO USE ME: Organized research, structured outputs
  // MY STRENGTH: Medium reasoning for lightweight tasks
  {
    id: 'wave-trinity-mini',                    // Internal code name
    name: 'Wave Trinity Mini',                  // What users see
    tier: 'pro',                                // Requires Pro subscription
    useCase: 'Structured research',             // Best for organized work
    reasoning: 'Medium reasoning for lightweight tasks', // Decent + organized
    openRouterModel: 'arcee-ai/trinity-mini:free' // API model name
  }
  
  // END OF MODEL LIST
  // Total: 3 free models + 17 pro models = 20 models
];


// ============================================================================
// STEP 3: FUNCTION TO FILTER MODELS (Based on subscription)
// ============================================================================
//
// 🤔 WHAT DOES THIS FUNCTION DO?
// This function decides which AI models a user can see based on whether
// they have a Pro subscription or not.
//
// 🌍 REAL-LIFE ANALOGY:
// Think of a restaurant with a regular menu and a VIP menu:
// - Regular customers see only the regular menu (free models)
// - VIP customers see BOTH menus (free + pro models)
// This function is like the waiter deciding which menu to show you.
//
// 📝 WHY WE USE IT:
// We don't want to show Pro models to free users (they can't use them anyway).
// This function filters the list to show only what the user can access.
//
// 🔍 HOW IT'S USED LATER:
// Other files will call this function like this:
//   const models = getAvailableModels(true);  // Get all models (Pro user)
//   const models = getAvailableModels(false); // Get only free models
//   const models = getAvailableModels();      // Get only free models (default)

export function getAvailableModels(isPro: boolean = false): AIModel[] {
  // "export" = Other files can import and use this function
  // "function" = This is a reusable block of code
  // "getAvailableModels" = The name of this function
  // "(isPro: boolean = false)" = This function takes ONE input:
  //    - isPro: true if user has Pro, false if free user
  //    - "= false" means if no value is provided, assume false (free user)
  // ": AIModel[]" = This function returns an array of AIModel objects
  
  
  // -------------------------
  // STEP 3A: Check if user is Pro
  // -------------------------
  // If the user has a Pro subscription...
  if (isPro) {
    // ...then return ALL models (both free and pro)
    // Think: "VIP customer gets the full menu"
    return AI_MODELS;
    // This returns all 20 models (3 free + 17 pro)
  }
  
  
  // -------------------------
  // STEP 3B: User is NOT Pro (free user)
  // -------------------------
  // If we reach this line, it means isPro is false (user is not Pro)
  // So we need to filter the list to show only free models
  
  // The .filter() method goes through each model in AI_MODELS
  // and only keeps the ones where tier === 'free'
  return AI_MODELS.filter(m => m.tier === 'free');
  // "m" = each model (one at a time)
  // "m.tier === 'free'" = check if this model's tier is 'free'
  // "===" = exactly equal to (not just similar, but EXACTLY the same)
  //
  // HOW IT WORKS:
  // 1. Look at model #1: tier is 'free' → KEEP IT
  // 2. Look at model #2: tier is 'free' → KEEP IT
  // 3. Look at model #3: tier is 'free' → KEEP IT
  // 4. Look at model #4: tier is 'pro' → SKIP IT
  // 5. Look at model #5: tier is 'pro' → SKIP IT
  // ... and so on for all 20 models
  //
  // RESULT: Returns only 3 models (the free ones)
  //
  // Think: "Regular customer only gets the basic menu"
}


// ============================================================================
// 📚 SUMMARY - WHAT YOU LEARNED
// ============================================================================
//
// 1. INTERFACE (Blueprint):
//    - Defines what properties an object must have
//    - Ensures consistency across all AI models
//    - TypeScript checks that every model follows this structure
//
// 2. ARRAY OF OBJECTS (The Catalog):
//    - A list containing 20 AI model objects
//    - Each object has 6 properties (id, name, tier, useCase, reasoning, openRouterModel)
//    - 3 models are free, 17 models are pro
//
// 3. FILTER FUNCTION (The Gatekeeper):
//    - Takes one input: isPro (true/false)
//    - Returns different lists based on subscription:
//      * Pro users: all 20 models
//      * Free users: only 3 free models
//
// 4. EXPORT KEYWORD:
//    - Makes code available to other files
//    - Other files can import this and use it
//
// 5. TYPESCRIPT TYPES:
//    - string = text
//    - boolean = true/false
//    - 'free' | 'pro' = only these two exact values allowed
//    - AIModel[] = array (list) of AIModel objects
//
// ============================================================================
//
// 🎓 NEXT STEPS:
// - Try adding a new AI model to the list (follow the same structure)
// - Try changing a model from 'free' to 'pro' and see what happens
// - Look at how other files import and use this code
//
// ============================================================================
