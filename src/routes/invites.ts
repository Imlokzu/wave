import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory storage for invites
 * In production, this should be in a database
 */
const invites = new Map<string, {
  id: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  toUsername: string;
  roomId: string;
  roomCode: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
}>();

/**
 * Create invites router
 */
export function createInvitesRouter(): Router {
  const router = Router();

  /**
   * POST /api/invites/send
   * Send a room invite to a user
   */
  router.post('/send', async (req: Request, res: Response) => {
    try {
      const { fromUserId, fromUsername, toUsername, roomId, roomCode } = req.body;

      if (!fromUserId || !fromUsername || !toUsername || !roomId || !roomCode) {
        res.status(400).json({
          error: 'Missing required fields',
          code: 'MISSING_FIELDS'
        });
        return;
      }

      // In production, look up toUserId from database
      // For now, we'll use a simple approach
      const inviteId = uuidv4();
      
      const invite = {
        id: inviteId,
        fromUserId,
        fromUsername,
        toUserId: `user_${toUsername}`, // Placeholder
        toUsername,
        roomId,
        roomCode,
        status: 'pending' as const,
        createdAt: new Date()
      };

      invites.set(inviteId, invite);

      console.log('[Invites] Invite sent:', invite);

      res.json({
        success: true,
        data: invite
      });
    } catch (error: any) {
      console.error('Send invite error:', error);
      res.status(500).json({
        error: 'Failed to send invite',
        code: 'SERVER_ERROR'
      });
    }
  });

  /**
   * GET /api/invites/pending/:username
   * Get pending invites for a user
   */
  router.get('/pending/:username', async (req: Request, res: Response) => {
    try {
      const { username } = req.params;

      const userInvites = Array.from(invites.values()).filter(
        invite => invite.toUsername === username && invite.status === 'pending'
      );

      res.json({
        success: true,
        data: userInvites
      });
    } catch (error: any) {
      console.error('Get invites error:', error);
      res.status(500).json({
        error: 'Failed to get invites',
        code: 'SERVER_ERROR'
      });
    }
  });

  /**
   * POST /api/invites/:inviteId/accept
   * Accept an invite
   */
  router.post('/:inviteId/accept', async (req: Request, res: Response) => {
    try {
      const { inviteId } = req.params;

      const invite = invites.get(inviteId);
      if (!invite) {
        res.status(404).json({
          error: 'Invite not found',
          code: 'INVITE_NOT_FOUND'
        });
        return;
      }

      if (invite.status !== 'pending') {
        res.status(400).json({
          error: 'Invite already processed',
          code: 'INVITE_ALREADY_PROCESSED'
        });
        return;
      }

      invite.status = 'accepted';
      invites.set(inviteId, invite);

      console.log('[Invites] Invite accepted:', invite);

      res.json({
        success: true,
        data: invite
      });
    } catch (error: any) {
      console.error('Accept invite error:', error);
      res.status(500).json({
        error: 'Failed to accept invite',
        code: 'SERVER_ERROR'
      });
    }
  });

  /**
   * POST /api/invites/:inviteId/decline
   * Decline an invite
   */
  router.post('/:inviteId/decline', async (req: Request, res: Response) => {
    try {
      const { inviteId } = req.params;

      const invite = invites.get(inviteId);
      if (!invite) {
        res.status(404).json({
          error: 'Invite not found',
          code: 'INVITE_NOT_FOUND'
        });
        return;
      }

      if (invite.status !== 'pending') {
        res.status(400).json({
          error: 'Invite already processed',
          code: 'INVITE_ALREADY_PROCESSED'
        });
        return;
      }

      invite.status = 'declined';
      invites.set(inviteId, invite);

      console.log('[Invites] Invite declined:', invite);

      res.json({
        success: true,
        data: invite
      });
    } catch (error: any) {
      console.error('Decline invite error:', error);
      res.status(500).json({
        error: 'Failed to decline invite',
        code: 'SERVER_ERROR'
      });
    }
  });

  return router;
}
