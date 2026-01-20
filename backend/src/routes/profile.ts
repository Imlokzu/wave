import { Router, Response } from 'express';
import { getProfileManager } from '../managers/ProfileManager';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { AuthService } from '../services/AuthService';
import { IUserManager } from '../managers/IUserManager';

export function createProfileRouter(userManager: IUserManager): Router {
  const router = Router();
  const authService = new AuthService(userManager);
  const authMiddleware = requireAuth(authService);

  /**
   * GET /api/profile/me
   * Get current user's profile
   */
  router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const profileManager = getProfileManager();
      const profile = await profileManager.getProfile(userId);

      // Also get user data for avatar
      const user = await userManager.getUserById(userId);

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      // Merge user avatar with profile data
      const profileWithAvatar = {
        ...profile,
        avatar: user?.avatar || profile.avatarUrl,
        avatarUrl: user?.avatar || profile.avatarUrl
      };

      res.json({ profile: profileWithAvatar });
    } catch (error: any) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  });

  /**
   * GET /api/profile/:userId
   * Get user profile
   */
  router.get('/:userId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const profileManager = getProfileManager();

      const profile = await profileManager.getProfile(userId);

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      res.json({ profile });
    } catch (error: any) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  });

/**
 * PUT /api/profile/bio
 * Update user bio
 */
router.put('/bio', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { bio } = req.body;

    if (typeof bio !== 'string') {
      return res.status(400).json({ error: 'Bio must be a string' });
    }

    const profileManager = getProfileManager();
    await profileManager.updateBio(userId, bio);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Update bio error:', error);
    res.status(500).json({ error: 'Failed to update bio' });
  }
});

/**
 * POST /api/profile/social-link
 * Add social link
 */
router.post('/social-link', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { platform, url } = req.body;

    if (!platform || !url) {
      return res.status(400).json({ error: 'Platform and URL are required' });
    }

    const profileManager = getProfileManager();
    await profileManager.addSocialLink(userId, platform, url);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Add social link error:', error);
    res.status(500).json({ error: 'Failed to add social link' });
  }
});

/**
 * DELETE /api/profile/social-link/:platform
 * Remove social link
 */
router.delete('/social-link/:platform', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { platform } = req.params;

    const profileManager = getProfileManager();
    await profileManager.removeSocialLink(userId, platform);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Remove social link error:', error);
    res.status(500).json({ error: 'Failed to remove social link' });
  }
});

/**
 * PUT /api/profile/theme
 * Update theme
 */
router.put('/theme', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { primaryColor, accentColor } = req.body;

    if (!primaryColor || !accentColor) {
      return res.status(400).json({ error: 'Primary and accent colors are required' });
    }

    const profileManager = getProfileManager();
    await profileManager.updateTheme(userId, { primaryColor, accentColor });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Update theme error:', error);
    res.status(500).json({ error: 'Failed to update theme' });
  }
});

/**
 * POST /api/profile/badge
 * Add badge
 */
router.post('/badge', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { badgeId } = req.body;

    if (!badgeId) {
      return res.status(400).json({ error: 'Badge ID is required' });
    }

    const profileManager = getProfileManager();
    await profileManager.addBadge(userId, badgeId);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Add badge error:', error);
    res.status(500).json({ error: 'Failed to add badge' });
  }
});

  return router;
}
