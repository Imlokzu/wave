import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { AuthService } from '../services/AuthService';
import { getSubscriptionManager } from '../managers/SubscriptionManager';
import { getAvailableModels, AI_MODELS } from '../services/AIModelConfig';
import multer from 'multer';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

// Initialize Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseKey);

// Configure multer for background uploads (memory storage)
const backgroundUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for backgrounds
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF are allowed.'));
    }
  },
});

export function createSettingsRouter(authService: AuthService): Router {
  const router = Router();
  const authMiddleware = requireAuth(authService);

  /**
   * GET /api/settings
   * Get user settings including Pro status and available AI models
   */
  router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Get user from database to check Pro status
      const user = await authService.userManager.getUser(userId);
      const isPro = user?.isPro || false;
      
      console.log(`[Settings] User ${user?.username} (${userId}) Pro status: ${isPro}`);
      console.log(`[Settings] Full user data:`, user);
      
      const availableModels = getAvailableModels(isPro);
      
      res.json({
        success: true,
        data: {
          isPro,
          username: user?.username,
          availableModels: availableModels.map(m => ({
            id: m.id,
            name: m.name,
            tier: m.tier,
            useCase: m.useCase,
            reasoning: m.reasoning,
          })),
          allModels: Object.values(AI_MODELS).map(m => ({
            id: m.id,
            name: m.name,
            tier: m.tier,
            useCase: m.useCase,
            reasoning: m.reasoning,
            locked: m.tier === 'pro' && !isPro,
          })),
        }
      });
    } catch (error: any) {
      console.error('Error getting settings:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/settings/upgrade-to-pro
   * Upgrade user to Pro tier (for testing)
   * TEMPORARY: No auth required
   */
  router.post('/upgrade-to-pro', async (req: AuthenticatedRequest, res: Response) => {
    try {
      res.json({
        success: true,
        message: 'Successfully upgraded to Pro! (Mock)'
      });
    } catch (error: any) {
      console.error('Error upgrading to Pro:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/settings/downgrade-to-free
   * Downgrade user to Free tier
   * TEMPORARY: No auth required
   */
  router.post('/downgrade-to-free', async (req: AuthenticatedRequest, res: Response) => {
    try {
      res.json({
        success: true,
        message: 'Downgraded to Free tier (Mock)'
      });
    } catch (error: any) {
      console.error('Error downgrading:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/settings/profile
   * Update user profile information
   */
  router.post('/profile', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { displayName, username, bio } = req.body;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }
      
      // Update user profile
      const user = await authService.userManager.getUser(userId);
      if (user) {
        // Update nickname if provided
        if (displayName) {
          user.nickname = displayName;
        }
        
        // Update username if provided (remove @ if present)
        if (username) {
          user.username = username.replace('@', '');
        }
        
        // TODO: Add bio field to user model when available
        console.log('[Settings] Profile updated:', { displayName, username, bio });
      }
      
      res.json({
        success: true,
        message: 'Profile updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/settings/update
   * Update user settings (toggles, preferences, etc.)
   */
  router.post('/update', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const settings = req.body;
      console.log('[Settings] Updating user settings:', settings);
      
      // TODO: Save to database when user settings table is created
      // For now, just acknowledge the update
      
      res.json({
        success: true,
        message: 'Settings updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating settings:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/settings/storage
   * Get storage usage breakdown
   */
  router.get('/storage', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      // Calculate storage from uploads folder
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      const getDirectorySize = async (dirPath: string): Promise<number> => {
        try {
          const files = await fs.readdir(dirPath, { withFileTypes: true });
          let totalSize = 0;
          
          for (const file of files) {
            const filePath = path.join(dirPath, file.name);
            if (file.isDirectory()) {
              totalSize += await getDirectorySize(filePath);
            } else {
              const stats = await fs.stat(filePath);
              totalSize += stats.size;
            }
          }
          
          return totalSize;
        } catch (error) {
          return 0;
        }
      };
      
      const getFileTypeSize = async (dirPath: string, extensions: string[]): Promise<number> => {
        try {
          const files = await fs.readdir(dirPath, { withFileTypes: true });
          let totalSize = 0;
          
          for (const file of files) {
            const filePath = path.join(dirPath, file.name);
            if (file.isDirectory()) {
              totalSize += await getFileTypeSize(filePath, extensions);
            } else {
              const ext = path.extname(file.name).toLowerCase();
              if (extensions.includes(ext)) {
                const stats = await fs.stat(filePath);
                totalSize += stats.size;
              }
            }
          }
          
          return totalSize;
        } catch (error) {
          return 0;
        }
      };
      
      // Calculate sizes
      const totalBytes = await getDirectorySize(uploadsDir);
      const imageBytes = await getFileTypeSize(uploadsDir, ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']);
      const videoBytes = await getFileTypeSize(uploadsDir, ['.mp4', '.webm', '.mov', '.avi', '.mkv']);
      const fileBytes = await getFileTypeSize(uploadsDir, ['.pdf', '.doc', '.docx', '.txt', '.zip', '.rar']);
      
      // Cache is everything else
      const cacheBytes = totalBytes - imageBytes - videoBytes - fileBytes;
      
      const maxBytes = 5 * 1024 * 1024 * 1024; // 5 GB limit
      
      res.json({
        success: true,
        data: {
          totalBytes,
          maxBytes,
          breakdown: {
            images: imageBytes,
            videos: videoBytes,
            files: fileBytes,
            cache: Math.max(0, cacheBytes)
          }
        }
      });
    } catch (error: any) {
      console.error('Error calculating storage:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/settings/background
   * Upload custom chat background
   */
  router.post('/background', authMiddleware, backgroundUpload.single('background'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No background file provided',
        });
      }

      // Generate unique filename
      const ext = path.extname(req.file.originalname);
      const filename = `backgrounds/${userId}_${Date.now()}${ext}`;

      console.log(`[Settings] Uploading background for user ${userId}: ${filename}`);

      // Get old background to delete later (if exists)
      const user = await authService.userManager.getUser(userId);
      const oldBackgroundUrl = (user as any)?.customBackground || null;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(config.supabaseBucket)
        .upload(filename, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        console.error('[Settings] Supabase upload error:', uploadError);
        return res.status(500).json({
          success: false,
          error: 'Failed to upload background to storage',
        });
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(config.supabaseBucket)
        .getPublicUrl(filename);

      const backgroundUrl = urlData.publicUrl;

      console.log(`[Settings] Background uploaded successfully: ${backgroundUrl}`);

      // Delete old background if it exists
      if (oldBackgroundUrl && oldBackgroundUrl.includes(config.supabaseBucket)) {
        try {
          const oldFilename = oldBackgroundUrl.split('/').pop();
          if (oldFilename && oldFilename.startsWith('backgrounds/')) {
            await supabase.storage
              .from(config.supabaseBucket)
              .remove([oldFilename]);
            console.log(`[Settings] Deleted old background: ${oldFilename}`);
          }
        } catch (error) {
          console.error('[Settings] Error deleting old background:', error);
        }
      }

      // TODO: Save backgroundUrl to user settings in database
      // For now, just return the URL
      
      res.json({
        success: true,
        data: {
          backgroundUrl,
          message: 'Background uploaded successfully'
        }
      });
    } catch (error: any) {
      console.error('[Settings] Error uploading background:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
}
