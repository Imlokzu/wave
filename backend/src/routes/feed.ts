import { Router, Response } from 'express';
import { getTelegramFeedService } from '../services/TelegramFeedService';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { AuthService } from '../services/AuthService';
import { IUserManager } from '../managers/IUserManager';

export function createFeedRouter(userManager: IUserManager): Router {
  const router = Router();
  const authService = new AuthService(userManager);
  const authMiddleware = requireAuth(authService);

// Get user's feed channels
router.get('/channels', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const feedService = getTelegramFeedService();
    const channels = await feedService.getUserChannels(userId);

    res.json({
      success: true,
      channels
    });
  } catch (error: any) {
    console.error('Get channels error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to get channels',
      details: error.code === 'PGRST205' ? 'Database tables not created. Run migrations/003_add_telegram_feed_tables_fixed.sql' : undefined
    });
  }
});

// Add new Telegram channel
router.post('/channels', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { channelUrl } = req.body;
    if (!channelUrl) {
      return res.status(400).json({ error: 'Channel URL is required' });
    }

    // Validate Telegram URL
    if (!channelUrl.includes('t.me/')) {
      return res.status(400).json({ error: 'Invalid Telegram channel URL' });
    }

    const feedService = getTelegramFeedService();
    const channel = await feedService.addChannel(userId, channelUrl);

    res.json({
      success: true,
      channel
    });
  } catch (error) {
    console.error('Add channel error:', error);
    res.status(500).json({ error: 'Failed to add channel' });
  }
});

// Remove channel
router.delete('/channels/:channelId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { channelId } = req.params;
    const feedService = getTelegramFeedService();
    await feedService.removeChannel(userId, channelId);

    res.json({
      success: true,
      message: 'Channel removed'
    });
  } catch (error) {
    console.error('Remove channel error:', error);
    res.status(500).json({ error: 'Failed to remove channel' });
  }
});

// Remove duplicate channels
router.post('/channels/cleanup', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const feedService = getTelegramFeedService();
    const channels = await feedService.getUserChannels(userId);
    
    // Find duplicates by URL
    const seen = new Set<string>();
    const duplicates: string[] = [];
    
    channels.forEach(channel => {
      if (seen.has(channel.channel_url)) {
        duplicates.push(channel.id);
      } else {
        seen.add(channel.channel_url);
      }
    });
    
    // Remove duplicates
    for (const channelId of duplicates) {
      await feedService.removeChannel(userId, channelId);
    }

    res.json({
      success: true,
      removed: duplicates.length,
      message: `Removed ${duplicates.length} duplicate channels`
    });
  } catch (error) {
    console.error('Cleanup channels error:', error);
    res.status(500).json({ error: 'Failed to cleanup channels' });
  }
});

// Get feed posts
router.get('/posts', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const autoRefresh = req.query.refresh !== 'false'; // Auto-refresh by default
    
    const feedService = getTelegramFeedService();
    
    // Auto-refresh: scrape 5 new posts from each channel when user opens feed
    if (autoRefresh) {
      const channels = await feedService.getUserChannels(userId);
      if (channels.length > 0) {
        console.log(`🔄 Scraping fresh posts from ${channels.length} channels...`);
        
        const feedBotUrl = process.env.FEED_BOT_URL || `http://${process.env.HOST || 'localhost'}:3000`;
        
        // WAIT for all channels to be scraped before returning posts
        try {
          await Promise.all(
            channels.map(channel => 
              fetch(`${feedBotUrl}/scrape`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  url: channel.channel_url,
                  limit: 5  // Just get 5 newest posts
                }),
                signal: AbortSignal.timeout(15000) // 15 second timeout per channel
              }).then(r => r.json())
                .catch(err => {
                  console.error(`Failed to refresh ${channel.channel_url}:`, err);
                  return null;
                })
            )
          );
          console.log('✅ Fresh posts scraped!');
        } catch (err) {
          console.error('Scrape error (continuing anyway):', err);
        }
        
        // Small delay to let feed bot save to database
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    const posts = await feedService.getFeedPosts(userId, limit);

    res.json({
      success: true,
      posts
    });
  } catch (error: any) {
    console.error('Get posts error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to get posts',
      details: error.code === 'PGRST205' ? 'Database tables not created. Run migrations/003_add_telegram_feed_tables_fixed.sql' : undefined
    });
  }
});

// Manual refresh endpoint - scrape all channels now
router.post('/refresh', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const feedService = getTelegramFeedService();
    const channels = await feedService.getUserChannels(userId);
    
    if (channels.length === 0) {
      return res.json({
        success: true,
        message: 'No channels to refresh'
      });
    }

    const feedBotUrl = process.env.FEED_BOT_URL || `http://${process.env.HOST || 'localhost'}:3000`;
    
    // Scrape all channels
    const results = await Promise.allSettled(
      channels.map(channel => 
        fetch(`${feedBotUrl}/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: channel.channel_url,
            limit: 10
          })
        }).then(r => r.json())
      )
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    res.json({
      success: true,
      message: `Refreshed ${successful}/${channels.length} channels`,
      channels: channels.length,
      successful
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh channels' });
  }
});

// Translate text (uses AI service)
router.post('/translate', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { text, targetLanguage = 'English' } = req.body;
    if (!text) {
      return res.status(400).json({ 
        success: false, 
        error: 'Text is required' 
      });
    }

    // For now, return original text
    // In future, integrate with translation API or AI service
    res.json({
      success: true,
      translatedText: text,
      originalText: text,
      targetLanguage,
      note: 'Translation feature coming soon'
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to translate text' 
    });
  }
});

  return router;
}

export default createFeedRouter;
