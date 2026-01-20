import { Router, Request, Response } from 'express';
import { getDeepSeekService } from '../services/DeepSeekAIService';

export function createAIChatRouter(): Router {
  const router = Router();

  /**
   * POST /api/ai-chat
   * Chat with DeepSeek-R1 AI with optional web search
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { messages, enableSearch = true } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({
          error: 'Messages array is required'
        });
      }

      console.log(`[AI Chat API] Received chat request (${messages.length} messages, search: ${enableSearch})`);

      const deepSeekService = getDeepSeekService();
      const response = await deepSeekService.chat(messages, enableSearch);

      res.json({
        success: true,
        response,
        model: 'deepseek-r1',
        searchEnabled: enableSearch
      });
    } catch (error: any) {
      console.error('[AI Chat API] Error:', error);
      res.status(500).json({
        success: false,
        error: 'AI chat failed',
        message: error.message
      });
    }
  });

  /**
   * POST /api/ai-chat/simple
   * Simple chat endpoint (single message)
   */
  router.post('/simple', async (req: Request, res: Response) => {
    try {
      const { message, enableSearch = true } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          error: 'Message is required and must be a string'
        });
      }

      const messages = [
        {
          role: 'user' as const,
          content: message
        }
      ];

      const deepSeekService = getDeepSeekService();
      const response = await deepSeekService.chat(messages, enableSearch);

      res.json({
        success: true,
        response,
        model: 'deepseek-r1',
        searchEnabled: enableSearch
      });
    } catch (error: any) {
      console.error('[AI Chat API] Error:', error);
      res.status(500).json({
        success: false,
        error: 'AI chat failed',
        message: error.message
      });
    }
  });

  return router;
}
