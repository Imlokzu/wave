import { Router, Response } from 'express';
import { getMusicManager } from '../managers/MusicManager';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { AuthService } from '../services/AuthService';
import { IUserManager } from '../managers/IUserManager';
import multer from 'multer';

export function createMusicRouter(userManager: IUserManager): Router {
  const router = Router();
  const authService = new AuthService(userManager);
  const authMiddleware = requireAuth(authService);
  const upload = multer({ storage: multer.memoryStorage() });

  /**
   * GET /api/music/tracks
   * Get user's tracks
   */
  router.get('/tracks', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const musicManager = getMusicManager();

      const tracks = await musicManager.getUserTracks(userId);

      res.json({ tracks });
    } catch (error: any) {
      console.error('Get tracks error:', error);
      res.status(500).json({ error: 'Failed to get tracks' });
    }
  });

  /**
   * GET /api/music/playlists
   * Get user's playlists
   */
  router.get('/playlists', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const musicManager = getMusicManager();

      const playlists = await musicManager.getUserPlaylists(userId);

      res.json({ playlists });
    } catch (error: any) {
      console.error('Get playlists error:', error);
      res.status(500).json({ error: 'Failed to get playlists' });
    }
  });

  /**
   * GET /api/music/playlist/:playlistId
   * Get playlist with tracks
   */
  router.get('/playlist/:playlistId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { playlistId } = req.params;
      const musicManager = getMusicManager();

      const playlist = await musicManager.getPlaylist(playlistId);

      res.json({ playlist });
    } catch (error: any) {
      console.error('Get playlist error:', error);
      res.status(500).json({ error: 'Failed to get playlist' });
    }
  });

  /**
   * POST /api/music/playlist
   * Create a playlist
   */
  router.post('/playlist', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const { name, description, isPublic } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Playlist name is required' });
      }

      const musicManager = getMusicManager();
      const playlist = await musicManager.createPlaylist(userId, name, description, isPublic);

      res.json({ playlist });
    } catch (error: any) {
      console.error('Create playlist error:', error);
      res.status(500).json({ error: 'Failed to create playlist' });
    }
  });

  /**
   * POST /api/music/playlist/:playlistId/track
   * Add track to playlist
   */
  router.post('/playlist/:playlistId/track', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { playlistId } = req.params;
      const { trackId } = req.body;

      if (!trackId) {
        return res.status(400).json({ error: 'Track ID is required' });
      }

      const musicManager = getMusicManager();
      await musicManager.addTrackToPlaylist(playlistId, trackId);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Add track to playlist error:', error);
      res.status(500).json({ error: error.message || 'Failed to add track to playlist' });
    }
  });

  /**
   * POST /api/music/upload
   * Upload a music track (Pro users only)
   */
  router.post('/upload', authMiddleware, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const isPro = false; // TODO: Check Pro status
      const { isPublic } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const musicManager = getMusicManager();
      
      // Convert buffer to File-like object
      const file = {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } as any;

      const track = await musicManager.uploadTrack(file, userId, isPro, isPublic === 'true');

      res.json({ track });
    } catch (error: any) {
      console.error('Upload track error:', error);
      res.status(500).json({ error: error.message || 'Failed to upload track' });
    }
  });

  /**
   * GET /api/music/stream/:trackId
   * Stream a track
   */
  router.get('/stream/:trackId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { trackId } = req.params;
      const musicManager = getMusicManager();

      const fileUrl = await musicManager.streamTrack(trackId);

      res.json({ fileUrl });
    } catch (error: any) {
      console.error('Stream track error:', error);
      res.status(500).json({ error: 'Failed to stream track' });
    }
  });

  /**
   * POST /api/music/download/:trackId
   * Download a track (Pro users only)
   */
  router.post('/download/:trackId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const isPro = false; // TODO: Check Pro status
      const { trackId } = req.params;

      const musicManager = getMusicManager();
      const blob = await musicManager.downloadTrack(trackId, userId, isPro);

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `attachment; filename="track_${trackId}.mp3"`);
      res.send(Buffer.from(await blob.arrayBuffer()));
    } catch (error: any) {
      console.error('Download track error:', error);
      res.status(500).json({ error: error.message || 'Failed to download track' });
    }
  });

  /**
   * DELETE /api/music/track/:trackId
   * Delete track from cloud
   */
  router.delete('/track/:trackId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const { trackId } = req.params;

      const musicManager = getMusicManager();
      await musicManager.deleteFromCloud(trackId, userId);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete track error:', error);
      res.status(500).json({ error: 'Failed to delete track' });
    }
  });

  return router;
}
