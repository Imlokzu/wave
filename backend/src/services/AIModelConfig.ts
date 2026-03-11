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
  
  // -------------------------
  // Property 7: fallbackId (Optional)
  // -------------------------
  // WHAT: The ID of another model to use if this one fails
  // WHY: If a model is unavailable or errors, we try a backup model
  // TYPE: string | undefined = text or nothing (optional)
  // EXAMPLE: "wave-flash-2", "wave-1"
  fallbackId?: string;
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
  // NVIDIA NIM Models
  
  // Free Models
  {
    id: 'step-3.5-flash',
    name: 'Step-3.5-Flash',
    tier: 'free',
    useCase: 'Fast chat, streaming',
    reasoning: 'Fast responses for simple questions',
    openRouterModel: 'stepfun-ai/step-3.5-flash'
  },
  {
    id: 'glm5',
    name: 'GLM-5',
    tier: 'free',
    useCase: 'Deep reasoning, agents',
    reasoning: 'Medium reasoning with thinking mode',
    openRouterModel: 'z-ai/glm5'
  },
  
  // Pro Models (Vision/Multimodal)
  {
    id: 'qwen3.5-vl',
    name: 'Qwen3.5-VL',
    tier: 'pro',
    useCase: 'Images, docs, VQA',
    reasoning: 'Vision-language understanding',
    openRouterModel: 'qwen/qwen3.5-397b-a17b'
  },
  {
    id: 'qwen3.5-397b-a17b',
    name: 'Qwen3.5-397B-A17B',
    tier: 'pro',
    useCase: 'Multimodal foundation model',
    reasoning: 'Advanced reasoning with thinking',
    openRouterModel: 'qwen/qwen3.5-397b-a17b'
  },
  {
    id: 'kimi-k2.5',
    name: 'Kimi K2.5',
    tier: 'pro',
    useCase: 'Video, heavy multimodal',
    reasoning: 'Heavy multimodal understanding',
    openRouterModel: 'moonshotai/kimi-k2.5'
  }
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
