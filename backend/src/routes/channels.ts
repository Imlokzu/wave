import { Router, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireAdmin, AdminAuthenticatedRequest } from '../middleware/admin-auth';
import { IUserManager } from '../managers/IUserManager';
import { IChannelManager } from '../managers/ChannelManager';

export function createChannelsRouter(userManager: IUserManager, channelManager: IChannelManager): Router {
  const router = Router();
  const authService = new AuthService(userManager);

  const authMiddleware = requireAuth(authService);
  const adminMiddleware = requireAdmin(authService, userManager);

  // List channels (auth required)
  router.get('/', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const channels = await channelManager.listChannels();
      res.json({ channels });
    } catch (error: any) {
      console.error('Error listing channels:', error);
      res.status(500).json({ error: 'Failed to load channels' });
    }
  });

  // Create channel (auth required)
  router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, description } = req.body || {};
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Channel name is required' });
      }

      const channel = await channelManager.createChannel(
        name.trim(),
        description ? String(description).trim() : null,
        req.user!.id,
        req.user!.nickname
      );

      res.json({ channel });
    } catch (error: any) {
      console.error('Error creating channel:', error);
      res.status(500).json({ error: 'Failed to create channel' });
    }
  });

  // List posts for a channel (auth required)
  router.get('/:channelId/posts', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { channelId } = req.params;
      const posts = await channelManager.listPosts(channelId, req.user?.id);
      res.json({ posts });
    } catch (error: any) {
      console.error('Error listing channel posts:', error);
      res.status(500).json({ error: 'Failed to load channel posts' });
    }
  });

  // Create post (admin only)
  router.post('/:channelId/posts', adminMiddleware, async (req: AdminAuthenticatedRequest, res: Response) => {
    try {
      const { channelId } = req.params;
      const { content } = req.body || {};
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: 'Post content is required' });
      }

      const post = await channelManager.createPost(
        channelId,
        content.trim(),
        req.user!.id,
        req.user!.nickname
      );

      res.json({ post });
    } catch (error: any) {
      console.error('Error creating channel post:', error);
      res.status(500).json({ error: 'Failed to create post' });
    }
  });

  // React to a post (auth required)
  router.post('/:channelId/posts/:postId/react', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { postId } = req.params;
      const { emoji } = req.body || {};
      const reaction = emoji && typeof emoji === 'string' ? emoji.trim() : '👍';

      const reactions = await channelManager.toggleReaction(postId, req.user!.id, reaction);
      res.json({ reactions });
    } catch (error: any) {
      console.error('Error reacting to post:', error);
      res.status(500).json({ error: 'Failed to react to post' });
    }
  });

  return router;
}
