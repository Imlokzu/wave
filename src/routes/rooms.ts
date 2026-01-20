import { Router, Request, Response } from 'express';
import { RoomManager } from '../managers';
import { validateNickname, validateRoomCode } from '../utils';
import { Participant } from '../models';
import { v4 as uuidv4 } from 'uuid';

export function createRoomRouter(roomManager: RoomManager) {
  const router = Router();

  /**
   * POST /api/rooms - Create a new room
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { maxUsers = 50 } = req.body;

      const room = await roomManager.createRoom(maxUsers);

      res.status(201).json({
        success: true,
        data: {
          id: room.id,
          code: room.code,
          inviteLink: `${req.protocol}://${req.get('host')}/join/${room.code}`,
          maxUsers: room.maxUsers,
          createdAt: room.createdAt,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'ROOM_CREATION_FAILED',
          message: error.message,
        },
      });
    }
  });

  /**
   * GET /api/rooms/:code - Get room info by code
   */
  router.get('/:code', async (req: Request, res: Response) => {
    try {
      const { code } = req.params;

      if (!validateRoomCode(code)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_ROOM_CODE',
            message: 'Invalid room code format',
          },
        });
      }

      const room = await roomManager.getRoomByCode(code);

      if (!room) {
        return res.status(404).json({
          error: {
            code: 'ROOM_NOT_FOUND',
            message: 'Room not found',
          },
        });
      }

      res.json({
        success: true,
        data: {
          id: room.id,
          code: room.code,
          maxUsers: room.maxUsers,
          participantCount: room.participants.size,
          isLocked: room.isLocked,
          createdAt: room.createdAt,
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
   * POST /api/rooms/:code/join - Join a room
   */
  router.post('/:code/join', async (req: Request, res: Response) => {
    try {
      const { code } = req.params;
      const { nickname } = req.body;

      // Validate nickname
      if (!validateNickname(nickname)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_NICKNAME',
            message: 'Nickname is required and cannot be empty',
          },
        });
      }

      // Validate room code
      if (!validateRoomCode(code)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_ROOM_CODE',
            message: 'Invalid room code format',
          },
        });
      }

      const room = await roomManager.getRoomByCode(code);

      if (!room) {
        return res.status(404).json({
          error: {
            code: 'ROOM_NOT_FOUND',
            message: 'Room not found',
          },
        });
      }

      // Check if room is full
      if (await roomManager.isRoomFull(room.id)) {
        return res.status(409).json({
          error: {
            code: 'ROOM_FULL',
            message: 'Room is at maximum capacity',
          },
        });
      }

      // Create participant
      const participant: Participant = {
        id: uuidv4(),
        nickname: nickname.trim(),
        joinedAt: new Date(),
        socketId: '', // Will be set when WebSocket connects
      };

      const success = await roomManager.addParticipant(room.id, participant);

      if (!success) {
        return res.status(409).json({
          error: {
            code: 'JOIN_FAILED',
            message: 'Failed to join room',
          },
        });
      }

      res.json({
        success: true,
        data: {
          roomId: room.id,
          participantId: participant.id,
          nickname: participant.nickname,
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
   * POST /api/rooms/:id/leave - Leave a room
   */
  router.post('/:id/leave', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { participantId } = req.body;

      if (!participantId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARTICIPANT_ID',
            message: 'Participant ID is required',
          },
        });
      }

      await roomManager.removeParticipant(id, participantId);

      res.json({
        success: true,
        message: 'Left room successfully',
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
   * POST /api/rooms/:id/lock - Lock room (moderator only)
   */
  router.post('/:id/lock', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      // Check if user is moderator
      const isModerator = await roomManager.isModerator(id, userId);
      if (!isModerator) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only moderators can lock rooms',
          },
        });
      }

      await roomManager.lockRoom(id);

      res.json({
        success: true,
        message: 'Room locked successfully',
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
   * POST /api/rooms/:id/unlock - Unlock room (moderator only)
   */
  router.post('/:id/unlock', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      // Check if user is moderator
      const isModerator = await roomManager.isModerator(id, userId);
      if (!isModerator) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only moderators can unlock rooms',
          },
        });
      }

      await roomManager.unlockRoom(id);

      res.json({
        success: true,
        message: 'Room unlocked successfully',
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
   * POST /api/rooms/:id/regenerate - Regenerate room code (moderator only)
   */
  router.post('/:id/regenerate', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_FIELDS',
            message: 'userId is required',
          },
        });
      }

      // Check if user is moderator
      const isModerator = await roomManager.isModerator(id, userId);
      if (!isModerator) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only moderators can regenerate room codes',
          },
        });
      }

      const newCode = await roomManager.regenerateRoomCode(id, userId);

      if (!newCode) {
        return res.status(404).json({
          error: {
            code: 'ROOM_NOT_FOUND',
            message: 'Room not found',
          },
        });
      }

      res.json({
        success: true,
        data: {
          code: newCode,
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

  return router;
}
