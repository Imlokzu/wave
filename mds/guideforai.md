

# AI Models Integration Guide for Auto-Mode

This guide lists all AI models we are using on the platform, renamed for consistency, with instructions for enabling **thinking/reasoning** and **search**, and auto-mode selection logic.

---

## 1. Platform Naming and AI Models

| Platform Name     | Original Model Name                | Use Case / Notes                                                                 |
|------------------|-----------------------------------|---------------------------------------------------------------------------------|
| Wave R1          | DeepSeek R1                        | Pro: Long reasoning, coding, research, multi-step tasks                         |
| Wave R1T         | DeepSeek R1T                       | Pro: Extended reasoning, long-context tasks                                     |
| Wave R1T2        | DeepSeek R1T2 Chimera              | Pro: Fast reasoning, multi-checkpoint, long context (~60k tokens)              |
| Wave Flash 2      | Qwen 2.5 VL 7B                     | Free & Pro: Quick answers, reasoning toggle, search support                     |
| Wave Flash 3      | Qwen 3 5B                           | Free & Pro: Multimodal queries, fast reasoning                                   |
| Wave Gemini       | Gemini 2 Flash                      | Free & Pro: Fast analysis, multi-step reasoning                                  |
| Wave Mini         | Trinity Mini 26B                     | Pro: Lightweight reasoning, multi-step agentic workflows                        |
| Wave Nemotron     | Nemotron 3 Nano 30B A3B             | Pro: Specialized agentic reasoning, multimodal, efficient                       |
| Wave Nemotron VL  | Nemotron Nano 12B 2 VL              | Pro: Multimodal reasoning, video/document intelligence                           |
| Wave GLM Air      | GLM 4.5 Air                          | Free & Pro: Lightweight MoE, hybrid thinking and real-time interaction           |
| Wave KAT Pro      | KAT-Coder-Pro V1                     | Pro: Advanced agentic coding, multi-turn, real-world software tasks              |
| Wave Devstral 2   | Devstral 2 2512                      | Pro: Agentic coding, multi-file orchestration                                    |
| Wave MiMo Flash   | MiMo-V2-Flash                        | Free & Pro: Hybrid attention, reasoning/coding, agent scenarios                  |
| Wave R1T Chimera  | TNG R1T Chimera                       | Free: Creative storytelling, character interaction, reasoning                    |

---

## 2. Enabling Thinking / Reasoning Mode

Most LLMs support **reasoning/thinking mode** via a boolean parameter in OpenRouter API requests.

```js
{
  reasoning_enabled: true // Enables internal multi-step reasoning
}
````

* **DeepSeek R1 / R1T / R1T2:**

  * Internal `<think>` tokens used for multi-step reasoning.
  * Recommended for long-context tasks, research, and coding.

* **Qwen 2.5 VL / Qwen 3:**

  * `reasoning_enabled: true` triggers multi-step reasoning.
  * Can be used for free or pro depending on query complexity.

* **GLM 4.5 Air / MiMo-V2-Flash / Trinity Mini:**

  * Hybrid reasoning toggle (`thinking` mode) available.
  * Pro users can use full reasoning for multi-step workflows.

---

## 3. Enabling Search / Tool Use

Some models support querying external sources or tools:

```js
{
  search_enabled: true // Enable web search or tool use
}
```

* **Wave Flash models (Qwen 2.5 / Qwen 3 / Gemini Flash):**

  * Use `search_enabled: true` for verifying facts or up-to-date data.

* **Wave R1 / R1T / R1T2:**

  * Can integrate with search tools for research-grade queries.
  * Recommended for Pro mode with complex analysis.

---

## 4. Auto-Mode Model Selection

The **auto-mode logic** selects the model based on query type:

| Query Type                    | Platform Model        | Settings                           |
| ----------------------------- | --------------------- | ---------------------------------- |
| Easy / casual question        | Wave Flash 2 / 3      | reasoning: false, search: optional |
| Research / verification       | Wave Flash 2 + search | reasoning: true, search: true      |
| Long reasoning / code tasks   | Wave R1 / R1T / R1T2  | reasoning: true, search: optional  |
| Multi-step workflow / agentic | Wave Mini / Nemotron  | reasoning: true, search: optional  |

### Example Auto-Mode Function (Pseudo-Code)

```js
function selectModelForQuery(query) {
  if (isEasyQuestion(query)) {
    return { model: "qwen2.5-vl-7b", reasoning: false, search: true };
  } else if (isResearchQuery(query)) {
    return { model: "qwen2.5-vl-7b", reasoning: true, search: true };
  } else if (isCodeOrLongTask(query)) {
    return { model: "deepseek-r1", reasoning: true, search: false };
  } else {
    return { model: "trinity-mini", reasoning: true, search: false };
  }
}
```

> Helper functions like `isEasyQuestion`, `isResearchQuery`, `isCodeOrLongTask` analyze query complexity, keywords, or task type.

---

## 5. OpenRouter API Example

```js
import { OpenRouter } from "@openrouter/sdk";

const openrouter = new OpenRouter({ apiKey: "<API_KEY>" });

const response = await openrouter.chat.send({
  model: "nex-agi/deepseek-r1:pro",
  messages: [
    { role: "user", content: "Explain quantum computing in detail." }
  ],
  reasoning_enabled: true,
  search_enabled: false
});
```

---

## 6. Developer Notes

* **Free Users:** Use Wave Flash models for simple queries.
* **Pro Users:** Access Wave R1/R1T/R1T2 and enable reasoning + search for research-grade or coding tasks.
* Auto-mode dynamically swaps models without frontend changes.
* Always pass the **original OpenRouter model identifier** in API requests.

---

**End of Guide**

