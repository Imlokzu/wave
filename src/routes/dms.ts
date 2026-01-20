import { Router, Request, Response } from 'express';
import { IDMManager } from '../managers/IDMManager';
import { IUserManager } from '../managers/IUserManager';

export function createDMRouter(dmManager: IDMManager, userManager: IUserManager) {
  const router = Router();

  /**
   * POST /api/dms/send - Send a direct message
   */
  router.post('/send', async (req: Request, res: Response) => {
    try {
      const { fromUserId, toUsername, content } = req.body;

      if (!fromUserId || !toUsername || !content) {
        return res.status(400).json({
          error: {
            code: 'MISSING_FIELDS',
            message: 'fromUserId, toUsername, and content are required',
          },
        });
      }

      // Get sender info
      const fromUser = await userManager.getUserById(fromUserId);
      if (!fromUser) {
        return res.status(404).json({
          error: {
            code: 'SENDER_NOT_FOUND',
            message: 'Sender user not found',
          },
        });
      }

      // Get recipient info
      const toUser = await userManager.getUserByUsername(toUsername);
      if (!toUser) {
        return res.status(404).json({
          error: {
            code: 'RECIPIENT_NOT_FOUND',
            message: 'Recipient user not found',
          },
        });
      }

      // Send DM
      const message = await dmManager.sendDM(
        fromUser.id,
        fromUser.username,
        toUser.id,
        content
      );

      res.status(201).json({
        success: true,
        data: message,
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
   * GET /api/dms/history/:userId/:otherUserId - Get DM history between two users
   */
  router.get('/history/:userId/:otherUserId', async (req: Request, res: Response) => {
    try {
      const { userId, otherUserId } = req.params;

      const messages = await dmManager.getDMHistory(userId, otherUserId);

      res.json({
        success: true,
        data: messages,
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
   * GET /api/dms/conversations/:userId - Get all conversations for a user
   */
  router.get('/conversations/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const conversationIds = await dmManager.getUserConversations(userId);

      // Get user info for each conversation
      const conversations = await Promise.all(
        conversationIds.map(async (convId) => {
          const [user1Id, user2Id] = convId.split('_');
          const otherUserId = user1Id === userId ? user2Id : user1Id;
          const otherUser = await userManager.getUserById(otherUserId);
          const messages = await dmManager.getDMHistory(userId, otherUserId);
          const lastMessage = messages[messages.length - 1];

          return {
            conversationId: convId,
            otherUser: otherUser ? {
              id: otherUser.id,
              username: otherUser.username,
              nickname: otherUser.nickname,
            } : null,
            lastMessage: lastMessage || null,
            messageCount: messages.length,
          };
        })
      );

      res.json({
        success: true,
        data: conversations,
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
   * DELETE /api/dms/:messageId - Delete a DM
   */
  router.delete('/:messageId', async (req: Request, res: Response) => {
    try {
      const { messageId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_USER_ID',
            message: 'userId is required',
          },
        });
      }

      const deleted = await dmManager.deleteDM(messageId, userId);

      if (!deleted) {
        return res.status(403).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'You can only delete your own messages',
          },
        });
      }

      res.json({
        success: true,
        message: 'Message deleted',
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
