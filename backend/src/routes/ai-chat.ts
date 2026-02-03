import { Router, Request, Response } from 'express';
import { getUnifiedAIService } from '../services/UnifiedAIService';

export function createAIChatRouter(): Router {
  const router = Router();

  /**
   * GET /api/ai-chat/test
   * Test endpoint to verify service is initialized
   */
  router.get('/test', async (req: Request, res: Response) => {
    try {
      const aiService = getUnifiedAIService();
      res.json({
        success: true,
        message: 'UnifiedAIService is initialized and ready',
        serviceAvailable: true
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
        serviceAvailable: false
      });
    }
  });

  /**
   * POST /api/ai-chat
   * Chat with AI with optional web search and model selection
   * Supports streaming via ?stream=true query parameter
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { messages, enableSearch = true, thinking = false, model } = req.body;
      const stream = req.query.stream === 'true';

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({
          error: 'Messages array is required'
        });
      }

      console.log(`[AI Chat API] Received chat request (${messages.length} messages, search: ${enableSearch}, thinking: ${thinking}, model: ${model || 'auto'}, stream: ${stream})`);

      const aiService = getUnifiedAIService();

      // Handle streaming
      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        try {
          await aiService.chatStream(messages, (chunk: string) => {
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          }, enableSearch, model, thinking);
          res.write('data: [DONE]\n\n');
          res.end();
        } catch (error: any) {
          res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
          res.end();
        }
        return;
      }

      // Non-streaming response
      const response = await aiService.chat(messages, enableSearch, model, 0, thinking);

      res.json({
        success: true,
        response,
        model: model || 'auto',
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
      const { message, enableSearch = true, thinking = false, model } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          error: 'Message is required and must be a string'
        });
      }

      console.log(`[AI Chat API] Simple request - message: "${message.substring(0, 50)}...", model: ${model || 'auto'}, search: ${enableSearch}, thinking: ${thinking}`);

      const messages = [
        {
          role: 'user' as const,
          content: message
        }
      ];

      const aiService = getUnifiedAIService();
      console.log('[AI Chat API] Got UnifiedAIService instance');

      const response = await aiService.chat(messages, enableSearch, model, 0, thinking);
      console.log('[AI Chat API] Got response from AI');

      res.json({
        success: true,
        response,
        model: model || 'auto',
        searchEnabled: enableSearch
      });
    } catch (error: any) {
      console.error('[AI Chat API] Error:', error);
      console.error('[AI Chat API] Error stack:', error.stack);
      res.status(500).json({
        success: false,
        error: 'AI chat failed',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  return router;
}
