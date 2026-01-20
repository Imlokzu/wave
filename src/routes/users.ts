import { Router, Request, Response } from 'express';
import { IUserManager } from '../managers/IUserManager';
import multer from 'multer';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

// Initialize Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseKey);

// Configure multer for avatar uploads
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for avatars
  },
  fileFilter: (req, file, cb) => {
    // Only allow images
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  },
});

export function createUserRouter(userManager: IUserManager) {
  const router = Router();

  /**
   * POST /api/users/register - Register a new user with @username
   */
  router.post('/register', async (req: Request, res: Response) => {
    try {
      const { username, nickname } = req.body;

      if (!username || !nickname) {
        return res.status(400).json({
          error: {
            code: 'MISSING_FIELDS',
            message: 'Username and nickname are required',
          },
        });
      }

      // Register user
      const user = await userManager.registerUser(username, nickname);

      if (!user) {
        return res.status(409).json({
          error: {
            code: 'USERNAME_TAKEN',
            message: 'Username is already taken',
          },
        });
      }

      res.status(201).json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          createdAt: user.createdAt,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'SERVER_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * GET /api/users/search - Search users by username or nickname
   */
  router.get('/search', async (req: Request, res: Response) => {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          error: {
            code: 'MISSING_QUERY',
            message: 'Search query is required',
          },
        });
      }

      const users = await userManager.searchUsers(q);

      res.json({
        success: true,
        data: users.map(u => ({
          id: u.id,
          username: u.username,
          nickname: u.nickname,
        })),
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'SERVER_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * GET /api/users/:username - Get user by username
   */
  router.get('/:username', async (req: Request, res: Response) => {
    try {
      const { username } = req.params;

      const user = await userManager.getUserByUsername(username);

      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          lastSeen: user.lastSeen,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'SERVER_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * POST /api/users/check - Check if username is available
   */
  router.post('/check', async (req: Request, res: Response) => {
    try {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({
          error: {
            code: 'MISSING_USERNAME',
            message: 'Username is required',
          },
        });
      }

      const available = await userManager.isUsernameAvailable(username);

      res.json({
        success: true,
        data: {
          available,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'SERVER_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * PUT /api/users/:id/status - Update user status
   */
  router.put('/:id/status', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          error: {
            code: 'MISSING_STATUS',
            message: 'Status is required',
          },
        });
      }

      // Validate status
      const validStatuses = ['Available', 'Busy', 'Away', 'Do Not Disturb', 'Invisible'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_STATUS',
            message: `Status must be one of: ${validStatuses.join(', ')}`,
          },
        });
      }

      // Update user profile with status
      const user = await userManager.updateUserProfile(id, { status } as any);

      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          status: (user as any).status || status,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'SERVER_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * GET /api/users/:id/status - Get user status
   */
  router.get('/:id/status', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const user = await userManager.getUser(id);

      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          status: (user as any).status || 'Available',
          isOnline: user.isOnline || false,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'SERVER_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * POST /api/users/:id/avatar - Upload user avatar
   */
  router.post('/:id/avatar', avatarUpload.single('avatar'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!req.file) {
        return res.status(400).json({
          error: {
            code: 'NO_FILE',
            message: 'No avatar file provided',
          },
        });
      }

      // Generate unique filename
      const ext = path.extname(req.file.originalname);
      const filename = `avatars/${id}_${Date.now()}${ext}`;

      // Get old avatar to delete later
      const user = await userManager.getUser(id);
      const oldAvatarUrl = user ? (user as any).avatar : null;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(config.supabaseBucket)
        .upload(filename, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        return res.status(500).json({
          error: {
            code: 'UPLOAD_FAILED',
            message: 'Failed to upload avatar to storage',
          },
        });
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(config.supabaseBucket)
        .getPublicUrl(filename);

      const avatarUrl = urlData.publicUrl;

      // Update user avatar URL
      const updatedUser = await userManager.updateUserProfile(id, { avatar: avatarUrl } as any);

      if (!updatedUser) {
        // Clean up uploaded file if user not found
        await supabase.storage.from(config.supabaseBucket).remove([filename]);
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      // Delete old avatar if exists
      if (oldAvatarUrl && oldAvatarUrl.includes(config.supabaseBucket)) {
        const oldFilename = oldAvatarUrl.split('/').pop();
        if (oldFilename && oldFilename.startsWith('avatars/')) {
          await supabase.storage.from(config.supabaseBucket).remove([oldFilename]).catch(() => {});
        }
      }

      res.json({
        success: true,
        data: {
          id: updatedUser.id,
          avatarUrl,
        },
      });
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      res.status(500).json({
        error: {
          code: 'SERVER_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * DELETE /api/users/:id/avatar - Delete user avatar
   */
  router.delete('/:id/avatar', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const user = await userManager.getUser(id);
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      // Delete avatar file from Supabase Storage
      const avatarUrl = (user as any).avatar;
      if (avatarUrl && avatarUrl.includes(config.supabaseBucket)) {
        const filename = avatarUrl.split('/').pop();
        if (filename && filename.startsWith('avatars/')) {
          await supabase.storage.from(config.supabaseBucket).remove([filename]).catch(() => {});
        }
      }

      // Update user to remove avatar
      await userManager.updateUserProfile(id, { avatar: null } as any);

      res.json({
        success: true,
        message: 'Avatar deleted successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'SERVER_ERROR',
          message: error.message,
        },
      });
    }
  });

  return router;
}
