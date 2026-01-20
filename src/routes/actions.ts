import { Router, Request, Response } from 'express';
import { MessageManager, RoomManager } from '../managers';
import { generateSpoofSource } from '../utils';

export function createActionsRouter(
  messageManager: MessageManager,
  roomManager: RoomManager
) {
  const router = Router();

  /**
   * POST /api/rooms/:id/panic - Panic button (local clear + disconnect)
   */
  router.post('/:id/panic', async (req: Request, res: Response) => {
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

      // Remove participant from room
      await roomManager.removeParticipant(id, participantId);

      res.json({
        success: true,
        message: 'Panic action executed',
        action: 'clear_local_and_disconnect',
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
   * POST /api/rooms/:id/spoof - Spoof button (inject fake message)
   */
  router.post('/:id/spoof', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({
          error: {
            code: 'MISSING_CONTENT',
            message: 'Message content is required',
          },
        });
      }

      const spoofSource = generateSpoofSource();
      const fakeMessage = messageManager.injectFakeMessage(id, content, spoofSource);

      res.json({
        success: true,
        data: {
          id: fakeMessage.id,
          content: fakeMessage.content,
          spoofSource: fakeMessage.spoofSource,
          type: fakeMessage.type,
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
