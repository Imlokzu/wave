import { Router, Response, Request } from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { AuthService } from '../services/AuthService';
import { getBioProfileManager } from '../managers/BioProfileManager';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export function createBioProfileRouter(authService: AuthService): Router {
  const router = Router();
  const authMiddleware = requireAuth(authService);

  /**
   * GET /api/bio-profile/:username
   * Get bio profile by username (public)
   */
  router.get('/:username', async (req: Request, res: Response) => {
    try {
      const { username } = req.params;
      const bioProfileManager = getBioProfileManager();

      const profile = await bioProfileManager.getProfileByUsername(username);

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      res.json({ profile });
    } catch (error: any) {
      console.error('Get bio profile error:', error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  });

  /**
   * GET /api/bio-profile/me/profile
   * Get current user's bio profile
   */
  router.get('/me/profile', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const bioProfileManager = getBioProfileManager();
      let profile = await bioProfileManager.getProfileByUserId(userId);

      // Create default profile if doesn't exist
      if (!profile && req.user?.username) {
        profile = await bioProfileManager.createDefaultProfile(userId, req.user.username);
      }

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      res.json({ profile });
    } catch (error: any) {
      console.error('Get bio profile error:', error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  });

  /**
   * POST /api/bio-profile
   * Create or update bio profile
   */
  router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const bioProfileManager = getBioProfileManager();
      const profileData = req.body;

      try {
        const profile = await bioProfileManager.upsertProfile({
          ...profileData,
          userId
        });

        res.json({ profile });
      } catch (dbError: any) {
        // Check if error is due to missing table
        if (dbError.message?.includes('relation "bio_profiles" does not exist') || 
            dbError.code === '42P01') {
          return res.status(503).json({ 
            error: 'Database not configured. Please run the SQL migration.',
            hint: 'See BIO_SETUP_INSTRUCTIONS.md - you need to run sql/bio-profiles-migration.sql in Supabase',
            code: 'MIGRATION_REQUIRED'
          });
        }
        throw dbError;
      }
    } catch (error: any) {
      console.error('Create/Update bio profile error:', error);
      res.status(500).json({ error: 'Failed to save profile: ' + error.message });
    }
  });

  /**
   * POST /api/bio-profile/upload/:type
   * Upload file (avatar, background, music, cursor)
   */
  router.post('/upload/:type', authMiddleware, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { type } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Validate upload type
      const validTypes = ['avatar', 'background', 'music', 'cursor'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid upload type' });
      }

      // For now, use ImgBB for images and return a placeholder for other types
      // This is a temporary solution until Supabase storage buckets are created
      if (type === 'avatar' || type === 'cursor') {
        // Upload image to ImgBB
        const formData = new FormData();
        formData.append('image', file.buffer.toString('base64'));
        
        const imgbbResponse = await axios.post(
          `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
          formData,
          { headers: formData.getHeaders() }
        );
        
        if (imgbbResponse.data?.data?.url) {
          return res.json({ 
            success: true, 
            url: imgbbResponse.data.data.url,
            fileName: file.originalname
          });
        }
      }
      
      // For music and background videos, return a placeholder
      // User needs to run SQL migration to enable Supabase storage
      res.status(501).json({ 
        error: 'Storage not configured. Please run the SQL migration to enable file uploads.',
        hint: 'See BIO_SETUP_INSTRUCTIONS.md for details'
      });
      
    } catch (error: any) {
      console.error('Upload file error:', error);
      res.status(500).json({ error: 'Failed to upload file: ' + error.message });
    }
  });

  /**
   * PUT /api/bio-profile/settings
   * Update profile settings
   */
  router.put('/settings', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { 
        username, 
        displayName, 
        bio, 
        theme, 
        customCursorEnabled, 
        autoPlayMusic 
      } = req.body;

      const bioProfileManager = getBioProfileManager();
      
      const profile = await bioProfileManager.upsertProfile({
        userId,
        username,
        displayName,
        bio,
        theme,
        customCursorEnabled,
        autoPlayMusic
      });

      res.json({ profile });
    } catch (error: any) {
      console.error('Update settings error:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  /**
   * PUT /api/bio-profile/media
   * Update media URLs
   */
  router.put('/media', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { 
        avatarUrl, 
        backgroundVideoUrl, 
        backgroundMusicUrl, 
        customCursorUrl 
      } = req.body;

      const bioProfileManager = getBioProfileManager();
      
      const profile = await bioProfileManager.upsertProfile({
        userId,
        avatarUrl,
        backgroundVideoUrl,
        backgroundMusicUrl,
        customCursorUrl
      });

      res.json({ profile });
    } catch (error: any) {
      console.error('Update media error:', error);
      res.status(500).json({ error: 'Failed to update media' });
    }
  });

  /**
   * PUT /api/bio-profile/badges
   * Update badges
   */
  router.put('/badges', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { badges } = req.body;

      if (!Array.isArray(badges)) {
        return res.status(400).json({ error: 'Badges must be an array' });
      }

      const bioProfileManager = getBioProfileManager();
      
      const profile = await bioProfileManager.upsertProfile({
        userId,
        badges
      });

      res.json({ profile });
    } catch (error: any) {
      console.error('Update badges error:', error);
      res.status(500).json({ error: 'Failed to update badges' });
    }
  });

  /**
   * PUT /api/bio-profile/social-links
   * Update social links
   */
  router.put('/social-links', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { socialLinks } = req.body;

      if (!Array.isArray(socialLinks)) {
        return res.status(400).json({ error: 'Social links must be an array' });
      }

      const bioProfileManager = getBioProfileManager();
      
      const profile = await bioProfileManager.upsertProfile({
        userId,
        socialLinks
      });

      res.json({ profile });
    } catch (error: any) {
      console.error('Update social links error:', error);
      res.status(500).json({ error: 'Failed to update social links' });
    }
  });

  /**
   * PUT /api/bio-profile/skills
   * Update skills
   */
  router.put('/skills', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { skills } = req.body;

      if (!Array.isArray(skills)) {
        return res.status(400).json({ error: 'Skills must be an array' });
      }

      const bioProfileManager = getBioProfileManager();
      
      const profile = await bioProfileManager.upsertProfile({
        userId,
        skills
      });

      res.json({ profile });
    } catch (error: any) {
      console.error('Update skills error:', error);
      res.status(500).json({ error: 'Failed to update skills' });
    }
  });

  /**
   * DELETE /api/bio-profile
   * Delete bio profile
   */
  router.delete('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const bioProfileManager = getBioProfileManager();
      await bioProfileManager.deleteProfile(userId);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete bio profile error:', error);
      res.status(500).json({ error: 'Failed to delete profile' });
    }
  });

  return router;
}
