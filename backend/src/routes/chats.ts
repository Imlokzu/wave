import { Router, Request, Response } from 'express';
import { UserManager } from '../managers/UserManager';
import { SupabaseUserManager } from '../managers/SupabaseUserManager';
import { DMManager } from '../managers/DMManager';
import { SupabaseDMManager } from '../managers/SupabaseDMManager';
import { RoomManager } from '../managers/RoomManager';
import { MessageManager } from '../managers/MessageManager';

const AI_BOT_ID = '00000000-0000-0000-0000-000000000001';

export function createChatRouter(
  userManager: UserManager | SupabaseUserManager,
  dmManager: DMManager | SupabaseDMManager,
  roomManager: RoomManager,
  messageManager: MessageManager
) {
  const router = Router();

  /**
   * GET /api/chats/list/:userId - Get all conversations for a user
   */
  router.get('/list/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      // Get DM conversations
      const dmConversations = await dmManager.getUserConversations(userId);
      
      // Get user's rooms (we'll need to track this)
      // For now, return DM conversations
      const conversations = (await Promise.all(
        dmConversations.map(async (convId) => {
          const [user1Id, user2Id] = convId.split('_');
          const otherUserId = user1Id === userId ? user2Id : user1Id;
          const otherUser = await userManager.getUserById(otherUserId);
          const isAIBotUser = otherUser?.id === AI_BOT_ID || (otherUser?.username || '').toLowerCase() === 'wavebot';
          if (isAIBotUser) {
            return null;
          }
          const messages = await dmManager.getDMHistory(userId, otherUserId);
          const lastMessage = messages[messages.length - 1];
          const unreadCount = 0; // TODO: Implement unread tracking

          return {
            id: convId,
            type: 'dm',
            otherUser: otherUser ? {
              id: otherUser.id,
              username: otherUser.username,
              nickname: otherUser.nickname,
            } : null,
            lastMessage: lastMessage ? {
              content: lastMessage.content,
              timestamp: lastMessage.timestamp,
              senderId: lastMessage.senderId,
            } : null,
            unreadCount,
            isPinned: false,
            isOnline: false, // TODO: Track online status
          };
        })
      )).filter(Boolean);

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
   * GET /api/chats/unread/:userId - Get unread conversations
   */
  router.get('/unread/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      // TODO: Implement unread filtering
      res.json({
        success: true,
        data: [],
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
   * GET /api/chats/live - Get active live rooms
   */
  router.get('/live', async (req: Request, res: Response) => {
    try {
      // Get all rooms with participants
      const rooms = await roomManager.getAllRooms();
      
      const liveRooms = rooms
        .filter(room => room.participants.size > 0)
        .map(room => ({
          id: room.id,
          code: room.code,
          type: 'room',
          participantCount: room.participants.size,
          maxUsers: room.maxUsers,
          isLocked: room.isLocked,
          createdAt: room.createdAt,
        }));

      res.json({
        success: true,
        data: liveRooms,
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
   * GET /api/search - Unified search
   */
  router.get('/search', async (req: Request, res: Response) => {
    try {
      const { q, type = 'all' } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          error: {
            code: 'MISSING_QUERY',
            message: 'Search query is required',
          },
        });
      }

      const results: any = {
        users: [],
        rooms: [],
        messages: [],
      };

      // Search users
      if (type === 'all' || type === 'users') {
        results.users = await userManager.searchUsers(q);
      }

      // TODO: Search rooms
      // TODO: Search messages

      res.json({
        success: true,
        data: results,
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
