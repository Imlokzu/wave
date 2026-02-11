import { Router, Response } from 'express';
import { getAIService } from '../services/AIService';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { AuthService } from '../services/AuthService';
import { getUnifiedAIService } from '../services/UnifiedAIService';

export function createAIRouter(authService: AuthService): Router {
  const router = Router();
  const authMiddleware = requireAuth(authService);

  /**
   * POST /api/ai/message
   * Send a message to AI assistant
   */
  router.post('/message', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { content, model } = req.body;
      const userId = req.user?.id;
      const userApiKey = req.headers['x-api-key'] as string | undefined;
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: 'Message content is required' });
      }

      // Use user's API key if provided, otherwise use server's
      const apiKey = userApiKey || process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        return res.status(400).json({ 
          error: 'No API key available. Please add your OpenRouter API key in Settings → API & Integrations.' 
        });
      }

      // Use unified AI service with model selection
      const aiService = getUnifiedAIService();
      
      // Simple chat with model selection
      const response = await aiService.chat([
        { role: 'user', content: content }
      ], true, model);

      return res.json({
        success: true,
        content: response,
        metadata: { model: model || 'auto' }
      });
    } catch (error: any) {
      console.error('AI message error:', error);
      res.status(500).json({ error: error.message || 'Failed to process AI message' });
    }
  });

  /**
   * GET /api/ai/status
   * Get AI service status
   */
  router.get('/status', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const aiService = getAIService();
      const isEnabled = aiService.isAIEnabled();
      const statusMessage = aiService.getStatusMessage();

      res.json({
        enabled: isEnabled,
        message: statusMessage
      });
    } catch (error: any) {
      console.error('AI status error:', error);
      res.status(500).json({ error: 'Failed to get AI status' });
    }
  });

  /**
   * GET /api/ai/help
   * Get AI help information
   */
  router.get('/help', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const aiService = getAIService();
      const helpResponse = aiService.getHelp();

      res.json({
        content: helpResponse.result
      });
    } catch (error: any) {
      console.error('AI help error:', error);
      res.status(500).json({ error: 'Failed to get AI help' });
    }
  });

  /**
   * POST /api/ai/summarize-feed
   * Summarize feed posts (Pro only)
   */
  router.post('/summarize-feed', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const userApiKey = req.headers['x-api-key'] as string | undefined;
      
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { posts, model } = req.body;
      if (!posts || !Array.isArray(posts) || posts.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'No posts provided' 
        });
      }

      // Use user's API key if provided, otherwise use server's
      const apiKey = userApiKey || process.env.OPENAI_API_KEY;

      if (!apiKey) {
        return res.status(400).json({ 
          success: false, 
          error: 'API key not configured. Please add your OpenRouter API key in Settings.' 
        });
      }

      // Use unified AI service
      const aiService = getUnifiedAIService();

      // Create summarization prompt
      const postsText = posts.join('\n\n');
      const prompt = `Please provide a concise summary of these feed posts. Focus on the main topics, key information, and any important trends or themes:\n\n${postsText}\n\nProvide a clear, organized summary in 3-5 paragraphs.`;

      // Get summary from AI with model selection
      const summary = await aiService.chat([
        {
          role: 'user',
          content: prompt
        }
      ], false, model); // Disable search for summarization

      res.json({
        success: true,
        summary
      });
    } catch (error: any) {
      console.error('Summarize feed error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to summarize feed' 
      });
    }
  });

  return router;
}
