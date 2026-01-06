import { Router, Request, Response } from 'express';
import { MessageManager } from '../managers';
import { ImageUploadService } from '../services';
import { FileUploadService } from '../services/FileUploadService';
import { generateSpoofSource } from '../utils';
import multer from 'multer';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for files (increased for audio/video)
  },
});

const voiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for voice messages (increased for audio)
  },
});

export function createMessageRouter(
  messageManager: MessageManager,
  imageUploadService: ImageUploadService,
  fileUploadService?: FileUploadService
) {
  const router = Router();

  /**
   * GET /api/rooms/:id/messages - Get messages
   */
  router.get('/:id/messages', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const messages = await messageManager.getMessages(id);

      res.json({
        success: true,
        data: messages.map(msg => ({
          id: msg.id,
          senderId: msg.senderId,
          senderNickname: msg.senderNickname,
          content: msg.content,
          type: msg.type,
          timestamp: msg.timestamp,
          expiresAt: msg.expiresAt,
          imageUrl: msg.imageUrl,
          spoofSource: msg.spoofSource,
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
   * GET /api/rooms/:id/pinned - Get pinned messages
   */
  router.get('/:id/pinned', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const pinnedMessages = await messageManager.getPinnedMessages(id);

      res.json({
        success: true,
        data: pinnedMessages.map(msg => ({
          id: msg.id,
          senderId: msg.senderId,
          senderNickname: msg.senderNickname,
          content: msg.content,
          type: msg.type,
          timestamp: msg.timestamp,
          pinnedAt: msg.pinnedAt,
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
   * POST /api/rooms/:id/clear - Clear messages
   */
  router.post('/:id/clear', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { preserveSystem = true } = req.body;

      await messageManager.clearMessages(id, preserveSystem);

      // Create confirmation message
      await messageManager.createSystemMessage(id, 'Chat has been cleared');

      res.json({
        success: true,
        message: 'Messages cleared successfully',
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
   * POST /api/rooms/:id/fake - Inject fake message
   */
  router.post('/:id/fake', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { content, spoofSource } = req.body;

      if (!content) {
        return res.status(400).json({
          error: {
            code: 'MISSING_CONTENT',
            message: 'Message content is required',
          },
        });
      }

      const source = spoofSource || generateSpoofSource();
      const fakeMessage = messageManager.injectFakeMessage(id, content, source);

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

  /**
   * POST /api/rooms/:id/image - Upload and send image
   */
  router.post('/:id/image', upload.single('image'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { senderId, senderNickname } = req.body;

      if (!req.file) {
        return res.status(400).json({
          error: {
            code: 'NO_IMAGE',
            message: 'No image file provided',
          },
        });
      }

      if (!senderId || !senderNickname) {
        return res.status(400).json({
          error: {
            code: 'MISSING_FIELDS',
            message: 'senderId and senderNickname are required',
          },
        });
      }

      // Check if image upload service is available
      if (!imageUploadService.isAvailable()) {
        return res.status(503).json({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Image upload service is not configured',
          },
        });
      }

      // Upload image
      const result = await imageUploadService.uploadImage(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      // Create image message
      const message = await messageManager.createImageMessage(
        id,
        senderId,
        senderNickname,
        result.url
      );

      res.json({
        success: true,
        data: {
          id: message.id,
          imageUrl: message.imageUrl,
          provider: result.provider,
          timestamp: message.timestamp,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'IMAGE_UPLOAD_FAILED',
          message: error.message,
        },
      });
    }
  });

  /**
   * POST /api/rooms/:id/file - Upload and send file
   */
  router.post('/:id/file', upload.single('file'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { senderId, senderNickname } = req.body;

      if (!req.file) {
        return res.status(400).json({
          error: {
            code: 'NO_FILE',
            message: 'No file provided',
          },
        });
      }

      if (!senderId || !senderNickname) {
        return res.status(400).json({
          error: {
            code: 'MISSING_FIELDS',
            message: 'senderId and senderNickname are required',
          },
        });
      }

      if (!fileUploadService || !fileUploadService.isAvailable()) {
        return res.status(503).json({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'File upload service is not configured',
          },
        });
      }

      // Upload file
      const fileUrl = await fileUploadService.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      // Create file message
      const message = await messageManager.createFileMessage(
        id,
        senderId,
        senderNickname,
        fileUrl,
        req.file.originalname,
        req.file.size
      );

      res.json({
        success: true,
        data: {
          id: message.id,
          fileUrl: message.fileUrl,
          fileName: message.fileName,
          fileSize: message.fileSize,
          timestamp: message.timestamp,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'FILE_UPLOAD_FAILED',
          message: error.message,
        },
      });
    }
  });

  /**
   * POST /api/rooms/:id/voice - Upload and send voice message
   */
  router.post('/:id/voice', voiceUpload.single('voice'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { senderId, senderNickname, duration } = req.body;

      if (!req.file) {
        return res.status(400).json({
          error: {
            code: 'NO_VOICE',
            message: 'No voice file provided',
          },
        });
      }

      if (!senderId || !senderNickname) {
        return res.status(400).json({
          error: {
            code: 'MISSING_FIELDS',
            message: 'senderId and senderNickname are required',
          },
        });
      }

      if (!fileUploadService) {
        return res.status(503).json({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'File upload service is not configured',
          },
        });
      }

      // Upload voice file
      const voiceUrl = await fileUploadService.uploadFile(
        req.file.buffer,
        `voice_${Date.now()}.webm`,
        'audio/webm'
      );

      // Create voice message (using file message with voice metadata)
      const message = await messageManager.createFileMessage(
        id,
        senderId,
        senderNickname,
        voiceUrl,
        'Voice Message',
        req.file.size
      );

      // Add voice-specific metadata
      (message as any).voiceUrl = voiceUrl;
      (message as any).duration = duration ? parseInt(duration) : 0;
      message.type = 'voice' as any;

      res.json({
        success: true,
        data: {
          id: message.id,
          voiceUrl,
          duration: (message as any).duration,
          timestamp: message.timestamp,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'VOICE_UPLOAD_FAILED',
          message: error.message,
        },
      });
    }
  });

  /**
   * POST /api/rooms/:id/poll - Create poll
   */
  router.post('/:id/poll', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { senderId, senderNickname, question, options, allowMultiple } = req.body;

      if (!senderId || !senderNickname || !question || !options) {
        return res.status(400).json({
          error: {
            code: 'MISSING_FIELDS',
            message: 'senderId, senderNickname, question, and options are required',
          },
        });
      }

      if (!Array.isArray(options) || options.length < 2) {
        return res.status(400).json({
          error: {
            code: 'INVALID_OPTIONS',
            message: 'At least 2 options are required',
          },
        });
      }

      const pollData = {
        question,
        options: options.map((text: string, index: number) => ({
          id: `opt_${Date.now()}_${index}`,
          text,
          votes: [],
        })),
        allowMultiple: allowMultiple || false,
        isClosed: false,
      };

      const message = await messageManager.createPollMessage(
        id,
        senderId,
        senderNickname,
        pollData
      );

      res.json({
        success: true,
        data: {
          id: message.id,
          pollData: message.pollData,
          timestamp: message.timestamp,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'POLL_CREATION_FAILED',
          message: error.message,
        },
      });
    }
  });

  /**
   * PUT /api/messages/:id - Edit message
   */
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId, content } = req.body;

      if (!userId || !content) {
        return res.status(400).json({
          error: {
            code: 'MISSING_FIELDS',
            message: 'userId and content are required',
          },
        });
      }

      const message = await messageManager.editMessage(id, content, userId);

      if (!message) {
        return res.status(404).json({
          error: {
            code: 'MESSAGE_NOT_FOUND',
            message: 'Message not found',
          },
        });
      }

      res.json({
        success: true,
        data: {
          id: message.id,
          content: message.content,
          isEdited: message.isEdited,
          editedAt: message.editedAt,
        },
      });
    } catch (error: any) {
      res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
        error: {
          code: error.message.includes('Unauthorized') ? 'UNAUTHORIZED' : 'SERVER_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * DELETE /api/messages/:id - Delete message
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId, isModerator } = req.body;

      if (!userId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_FIELDS',
            message: 'userId is required',
          },
        });
      }

      const result = await messageManager.deleteMessage(id, userId, isModerator || false);

      if (!result) {
        return res.status(404).json({
          error: {
            code: 'MESSAGE_NOT_FOUND',
            message: 'Message not found',
          },
        });
      }

      res.json({
        success: true,
        message: 'Message deleted successfully',
      });
    } catch (error: any) {
      res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
        error: {
          code: error.message.includes('Unauthorized') ? 'UNAUTHORIZED' : 'SERVER_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * POST /api/messages/:id/pin - Pin message
   */
  router.post('/:id/pin', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId, isModerator } = req.body;

      if (!userId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_FIELDS',
            message: 'userId is required',
          },
        });
      }

      const result = await messageManager.pinMessage(id, userId, isModerator || false);

      if (!result) {
        return res.status(404).json({
          error: {
            code: 'MESSAGE_NOT_FOUND',
            message: 'Message not found',
          },
        });
      }

      res.json({
        success: true,
        message: 'Message pinned successfully',
      });
    } catch (error: any) {
      res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
        error: {
          code: error.message.includes('Unauthorized') ? 'UNAUTHORIZED' : 'SERVER_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * DELETE /api/messages/:id/pin - Unpin message
   */
  router.delete('/:id/pin', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId, isModerator } = req.body;

      if (!userId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_FIELDS',
            message: 'userId is required',
          },
        });
      }

      const result = await messageManager.unpinMessage(id, userId, isModerator || false);

      if (!result) {
        return res.status(404).json({
          error: {
            code: 'MESSAGE_NOT_FOUND',
            message: 'Message not found',
          },
        });
      }

      res.json({
        success: true,
        message: 'Message unpinned successfully',
      });
    } catch (error: any) {
      res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
        error: {
          code: error.message.includes('Unauthorized') ? 'UNAUTHORIZED' : 'SERVER_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * POST /api/messages/:id/react - Add reaction
   */
  router.post('/:id/react', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId, emoji } = req.body;

      if (!userId || !emoji) {
        return res.status(400).json({
          error: {
            code: 'MISSING_FIELDS',
            message: 'userId and emoji are required',
          },
        });
      }

      const result = await messageManager.addReaction(id, emoji, userId);

      if (!result) {
        return res.status(404).json({
          error: {
            code: 'MESSAGE_NOT_FOUND',
            message: 'Message not found',
          },
        });
      }

      res.json({
        success: true,
        message: 'Reaction added successfully',
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
   * DELETE /api/messages/:id/react - Remove reaction
   */
  router.delete('/:id/react', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId, emoji } = req.body;

      if (!userId || !emoji) {
        return res.status(400).json({
          error: {
            code: 'MISSING_FIELDS',
            message: 'userId and emoji are required',
          },
        });
      }

      const result = await messageManager.removeReaction(id, emoji, userId);

      if (!result) {
        return res.status(404).json({
          error: {
            code: 'MESSAGE_NOT_FOUND',
            message: 'Message not found',
          },
        });
      }

      res.json({
        success: true,
        message: 'Reaction removed successfully',
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
   * POST /api/messages/:id/vote - Vote in poll
   */
  router.post('/:id/vote', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId, optionId } = req.body;

      if (!userId || !optionId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_FIELDS',
            message: 'userId and optionId are required',
          },
        });
      }

      const result = await messageManager.votePoll(id, optionId, userId);

      if (!result) {
        return res.status(404).json({
          error: {
            code: 'POLL_NOT_FOUND',
            message: 'Poll not found',
          },
        });
      }

      res.json({
        success: true,
        message: 'Vote recorded successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'VOTE_FAILED',
          message: error.message,
        },
      });
    }
  });

  /**
   * POST /api/messages/:id/close - Close poll
   */
  router.post('/:id/close', async (req: Request, res: Response) => {
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

      const result = await messageManager.closePoll(id, userId);

      if (!result) {
        return res.status(404).json({
          error: {
            code: 'POLL_NOT_FOUND',
            message: 'Poll not found',
          },
        });
      }

      res.json({
        success: true,
        message: 'Poll closed successfully',
      });
    } catch (error: any) {
      res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
        error: {
          code: error.message.includes('Unauthorized') ? 'UNAUTHORIZED' : 'SERVER_ERROR',
          message: error.message,
        },
      });
    }
  });

  return router;
}
