import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { RoomManager, MessageManager } from '../managers';
import { IUserManager } from '../managers/IUserManager';
import { IDMManager } from '../managers/IDMManager';
import { ImageUploadService } from '../services';
import { validateNickname } from '../utils';

interface SocketData {
  userId?: string;
  roomId?: string;
  nickname?: string;
  username?: string;
  roomUserId?: string; // Room-specific user ID (for stable room participant tracking)
}

export function setupSocketIO(
  httpServer: HTTPServer,
  roomManager: RoomManager,
  messageManager: MessageManager,
  imageUploadService: ImageUploadService,
  userManager: IUserManager,
  dmManager: IDMManager,
  fileUploadService?: any
) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Track socket-to-user mappings
  const socketToUser = new Map<string, SocketData>();
  
  // Track disconnect timeouts to prevent spam on page refresh
  const disconnectTimeouts = new Map<string, NodeJS.Timeout>();
  
  // Track online users for status tracking
  const onlineUsers = new Map<string, { socketId: string; lastSeen: Date }>();

  /**
   * Helper function to delete files from Supabase storage
   */
  async function deleteFileFromStorage(fileUrl: string): Promise<void> {
    if (!fileUploadService) {
      console.log('⚠️ FileUploadService not available, skipping file deletion');
      return;
    }

    try {
      console.log('🗑️ Deleting file from storage:', fileUrl);
      const success = await fileUploadService.deleteFile(fileUrl);
      if (success) {
        console.log('✅ File deleted from storage');
      } else {
        console.log('⚠️ File deletion failed or file not found');
      }
    } catch (error) {
      console.error('❌ Error deleting file from storage:', error);
    }
  }

  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    /**
     * join:room - Join a chat room
     */
    socket.on('join:room', async (data: { roomCode: string; nickname: string }) => {
      try {
        const { roomCode, nickname } = data;

        // Validate nickname
        if (!validateNickname(nickname)) {
          socket.emit('error', {
            code: 'INVALID_NICKNAME',
            message: 'Nickname is required and cannot be empty',
          });
          return;
        }

        // Get room
        const room = await roomManager.getRoomByCode(roomCode);
        if (!room) {
          socket.emit('error', {
            code: 'ROOM_NOT_FOUND',
            message: 'Room not found',
          });
          return;
        }

        // Check if room is full
        if (await roomManager.isRoomFull(room.id)) {
          socket.emit('error', {
            code: 'ROOM_FULL',
            message: 'Room is at maximum capacity',
          });
          return;
        }

        // Create a stable user ID based on nickname + room
        // This ensures the same user gets the same ID even after page reload
        const stableUserId = `${room.id}_${nickname.trim().toLowerCase()}`;

        // Check if this is a reconnection (user already exists in room)
        const existingParticipants = await roomManager.getParticipants(room.id);
        const isReconnection = existingParticipants.some(p => p.id === stableUserId);

        // Cancel any pending disconnect timeout for this user (handles reconnection)
        const existingTimeout = disconnectTimeouts.get(stableUserId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          disconnectTimeouts.delete(stableUserId);
        }

        // Add participant using stable user ID as the key (not socket.id)
        const participant = {
          id: stableUserId,
          nickname: nickname.trim(),
          joinedAt: new Date(),
          socketId: socket.id,
        };

        const success = await roomManager.addParticipant(room.id, participant);
        if (!success) {
          socket.emit('error', {
            code: 'JOIN_FAILED',
            message: 'Failed to join room',
          });
          return;
        }

        // Store socket data with stable user ID, preserving username and real userId if already set
        const existingSocketData = socketToUser.get(socket.id) || {};
        socketToUser.set(socket.id, {
          userId: existingSocketData.userId || stableUserId, // Keep real UUID if exists, otherwise use room-based ID
          roomId: room.id,
          nickname: participant.nickname,
          username: existingSocketData.username, // Preserve username from register:username
          roomUserId: stableUserId, // Store room-specific ID separately
        });

        // Join Socket.IO room
        socket.join(room.id);

        // Send confirmation to user with stable user ID
        socket.emit('room:joined', {
          roomId: room.id,
          roomCode: room.code,
          participantId: socket.id,
          userId: stableUserId,
          nickname: participant.nickname,
        });

        // Get all participants and broadcast to everyone in the room
        const participants = await roomManager.getParticipants(room.id);
        console.log(`[Socket] Broadcasting participants to room ${room.id}:`, participants.map(p => p.nickname));
        io.to(room.id).emit('room:participants', participants);

        // Only broadcast join message for NEW users, not reconnections
        if (!isReconnection) {
          // Create a non-persisted system message (just broadcast, don't store)
          const joinMessage = {
            id: `system_join_${Date.now()}`,
            roomId: room.id,
            type: 'system',
            content: `${participant.nickname} joined the room`,
            timestamp: new Date(),
          };
          socket.to(room.id).emit('message:new', joinMessage);
        }

        // Send existing messages
        const messages = await messageManager.getMessages(room.id);
        socket.emit('messages:history', messages);

        console.log(`User ${nickname} ${isReconnection ? 'reconnected to' : 'joined'} room ${roomCode}`);
      } catch (error: any) {
        console.error('Error joining room:', error);
        socket.emit('error', {
          code: 'SERVER_ERROR',
          message: error.message,
        });
      }
    });

    /**
     * send:message - Send a text message
     */
    socket.on('send:message', async (data: { content: string }) => {
      try {
        const socketData = socketToUser.get(socket.id);
        
        console.log(`📨 [Socket] send:message called, socketData:`, socketData);
        
        if (!socketData || !socketData.roomId) {
          console.error(`❌ [Socket] send:message failed: Not in room. socketData:`, socketData);
          socket.emit('error', {
            code: 'NOT_IN_ROOM',
            message: 'You must join a room first',
          });
          return;
        }

        const { roomId, userId, nickname } = socketData;
        
        if (!userId || !nickname) {
          console.error(`❌ [Socket] send:message failed: Missing userId or nickname. socketData:`, socketData);
          socket.emit('error', {
            code: 'INVALID_USER_DATA',
            message: 'User data is incomplete. Please refresh the page.',
          });
          return;
        }

        console.log(`📝 [Socket] Creating message from ${nickname} (${userId}) in room ${roomId}`);

        // Check if room is locked
        const room = await roomManager.getRoom(roomId);
        if (room?.isLocked) {
          const isModerator = await roomManager.isModerator(roomId, userId!);
          if (!isModerator) {
            socket.emit('error', {
              code: 'ROOM_LOCKED',
              message: 'Room is locked. Only moderators can send messages.',
            });
            return;
          }
        }

        // Create message
        const message = await messageManager.createMessage(
          roomId,
          userId!,
          nickname!,
          data.content
        );

        // Broadcast to all in room
        io.to(roomId).emit('message:new', message);

        console.log(`✅ [Socket] Message from ${nickname} in room ${roomId}`);

        // Check if message mentions @ai
        if (data.content.includes('@ai')) {
          console.log('🤖 [Socket] AI mention detected, processing...');
          
          const AI_BOT_ID = '00000000-0000-0000-0000-000000000001';
          const userQuery = data.content.replace('@ai', '').trim();
          
          // Smart detection: Check if query likely needs web search
          const searchKeywords = [
            // Product/pricing
            'price', 'cost', 'how much', 'expensive', 'cheap', 'buy', 'purchase',
            // Specifications
            'specs', 'specifications', 'features', 'review', 'comparison',
            // Time-sensitive
            'release date', 'when', 'latest', 'current', 'recent', 'new', 'upcoming',
            // News/events
            'news', 'today', 'yesterday', 'this week', 'this month',
            // Years (anything 2023+)
            '2023', '2024', '2025', '2026',
            // Questions about existence/availability
            'is there', 'does', 'has', 'available', 'exist'
          ];
          
          const needsSearch = searchKeywords.some(keyword => 
            userQuery.toLowerCase().includes(keyword.toLowerCase())
          );
          
          console.log(`[Socket] Query needs search: ${needsSearch} - "${userQuery.substring(0, 50)}..."`);
          
          if (needsSearch) {
            // Show searching indicator
            const thinkingMessage = await messageManager.createMessage(
              roomId,
              AI_BOT_ID,
              '🤖 WaveBot',
              '🔍 Searching the web...'
            );
            io.to(roomId).emit('message:new', thinkingMessage);
            
            try {
              // Detect user location for region-specific search
              const { getLocationService } = await import('../services/LocationService');
              const locationService = getLocationService();
              const clientIP = socket.handshake.address || '';
              const location = await locationService.getLocationFromIP(clientIP);
              const region = location ? locationService.getDuckDuckGoRegion(location.countryCode) : undefined;
              
              if (location) {
                console.log(`[Socket] User location: ${location.city}, ${location.country} -> Search region: ${region}`);
              }
              
              // Search DuckDuckGo first
              const { getSearchService } = await import('../services/SearchService');
              const searchService = getSearchService();
              const searchResults = await searchService.searchDuckDuckGo(userQuery, 5, region);
              const formattedResults = searchService.formatResultsForAI(searchResults);
              
              console.log(`[Socket] Found ${searchResults.length} search results`);
              
              // Delete searching message
              await messageManager.deleteMessage(thinkingMessage.id, AI_BOT_ID, true);
              io.to(roomId).emit('message:deleted', { messageId: thinkingMessage.id });
              
              // Now call DeepSeek with search results
              const { getDeepSeekService } = await import('../services/DeepSeekAIService');
              const deepSeekService = getDeepSeekService();
              
              // Set user region for future searches
              if (region) {
                deepSeekService.setUserRegion(region);
              }
              
              // Get recent messages for context
              const recentMessages = await messageManager.getRecentMessages(roomId, 10);
              const conversationContext = recentMessages
                .filter(m => m.type === 'normal' && !m.isDeleted)
                .map(m => `${m.senderNickname}: ${m.content}`)
                .join('\n');
              
              const messages = [
                {
                  role: 'system' as const,
                  content: `You are WaveBot, a helpful AI assistant. Answer the user's question using ONLY the web search results provided below. Be accurate and cite sources when possible.

DO NOT add signatures, footers, or "powered by" messages at the end of your response.

Recent conversation:
${conversationContext}

Web search results:
${formattedResults}`
                },
                {
                  role: 'user' as const,
                  content: userQuery
                }
              ];
              
              // Call AI without tool calling (just use search results)
              const aiResponse = await deepSeekService.chat(messages, false);
              
              // Send AI response
              const aiMessage = await messageManager.createMessage(
                roomId,
                AI_BOT_ID,
                '🤖 WaveBot',
                aiResponse
              );
              io.to(roomId).emit('message:new', aiMessage);
              console.log(`✅ [Socket] AI response sent with web search results`);
              
            } catch (searchError: any) {
              console.error('❌ [Socket] Search error:', searchError);
              
              // Delete searching message
              await messageManager.deleteMessage(thinkingMessage.id, AI_BOT_ID, true);
              io.to(roomId).emit('message:deleted', { messageId: thinkingMessage.id });
              
              // Send error
              const errorMessage = await messageManager.createMessage(
                roomId,
                AI_BOT_ID,
                '🤖 WaveBot',
                '❌ Sorry, search failed. Please try again.'
              );
              io.to(roomId).emit('message:new', errorMessage);
            }
          } else {
            // No search needed, use DeepSeek directly
            const { getDeepSeekService } = await import('../services/DeepSeekAIService');
            const deepSeekService = getDeepSeekService();
            
            const recentMessages = await messageManager.getRecentMessages(roomId, 10);
            const conversationContext = recentMessages
              .filter(m => m.type === 'normal' && !m.isDeleted)
              .map(m => `${m.senderNickname}: ${m.content}`)
              .join('\n');
            
            const messages = [
              {
                role: 'system' as const,
                content: `You are WaveBot, a helpful AI assistant in WaveChat messenger. Be friendly and helpful.

DO NOT add signatures, footers, or "powered by" messages at the end of your response.

Recent conversation:
${conversationContext}`
              },
              {
                role: 'user' as const,
                content: userQuery
              }
            ];
            
            try {
              const aiResponse = await deepSeekService.chat(messages, false);
              
              const aiMessage = await messageManager.createMessage(
                roomId,
                AI_BOT_ID,
                '🤖 WaveBot',
                aiResponse
              );
              io.to(roomId).emit('message:new', aiMessage);
              console.log(`✅ [Socket] AI response sent (no search needed)`);
            } catch (aiError: any) {
              console.error('❌ [Socket] AI error:', aiError);
              const errorMessage = await messageManager.createMessage(
                roomId,
                AI_BOT_ID,
                '🤖 WaveBot',
                '❌ Sorry, I encountered an error. Please try again.'
              );
              io.to(roomId).emit('message:new', errorMessage);
            }
          }
        }
      } catch (error: any) {
        console.error('❌ [Socket] Error sending message:', error);
        socket.emit('error', {
          code: 'SERVER_ERROR',
          message: error.message,
        });
      }
    });

    /**
     * send:image - Send an image message
     */
    socket.on('send:image', async (data: { imageData: string; filename: string }) => {
      try {
        const socketData = socketToUser.get(socket.id);
        if (!socketData || !socketData.roomId) {
          socket.emit('error', {
            code: 'NOT_IN_ROOM',
            message: 'You must join a room first',
          });
          return;
        }

        const { roomId, userId, nickname } = socketData;

        // Convert base64 to buffer
        const base64Data = data.imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Detect mime type from base64 prefix
        const mimeMatch = data.imageData.match(/^data:(image\/\w+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

        // Upload image
        const result = await imageUploadService.uploadImage(buffer, data.filename, mimeType);

        // Create image message
        const message = await messageManager.createImageMessage(
          roomId,
          userId!,
          nickname!,
          result.url
        );

        // Broadcast to all in room
        io.to(roomId).emit('message:image', message);

        console.log(`Image from ${nickname} in room ${roomId}`);
      } catch (error: any) {
        console.error('Error sending image:', error);
        socket.emit('error', {
          code: 'IMAGE_UPLOAD_FAILED',
          message: error.message,
        });
      }
    });

    /**
     * send:ai:message - Send a message to AI bot
     */
    socket.on('send:ai:message', async (data: { content: string }) => {
      try {
        const socketData = socketToUser.get(socket.id);
        if (!socketData || !socketData.roomId) {
          socket.emit('error', {
            code: 'NOT_IN_ROOM',
            message: 'You must join a room first',
          });
          return;
        }

        const { roomId } = socketData;

        // Import AI service
        const { getWaveAIService } = await import('../services/WaveAIService');
        const aiService = getWaveAIService();

        // Check if AI is available
        const isAvailable = await aiService.isAvailable();
        if (!isAvailable) {
          const offlineMessage = await messageManager.createSystemMessage(
            roomId,
            '🤖 AI Assistant is currently offline. Please configure the AI service to enable this feature.'
          );
          io.to(roomId).emit('message:system', offlineMessage);
          return;
        }

        // Forward message to AI
        try {
          const aiResponse = await aiService.sendMessage(data.content);

          // Create AI message
          const aiMessage = await messageManager.createAIMessage(roomId, aiResponse);

          // Broadcast AI response
          io.to(roomId).emit('message:ai', aiMessage);

          console.log(`AI response sent to room ${roomId}`);
        } catch (aiError: any) {
          // Handle AI service errors
          const errorMessage = await messageManager.createSystemMessage(
            roomId,
            `🤖 AI Assistant error: ${aiError.message}`
          );
          io.to(roomId).emit('message:system', errorMessage);
        }
      } catch (error: any) {
        console.error('Error handling AI message:', error);
        socket.emit('error', {
          code: 'AI_ERROR',
          message: error.message,
        });
      }
    });

    /**
     * leave:room - Leave the current room
     */
    socket.on('leave:room', async () => {
      try {
        const socketData = socketToUser.get(socket.id);
        if (!socketData || !socketData.roomId) {
          return;
        }

        const { roomId, userId, nickname } = socketData;

        // Remove participant
        await roomManager.removeParticipant(roomId, userId!);

        // Leave Socket.IO room
        socket.leave(roomId);

        // DON'T broadcast leave message - removed to prevent spam
        // socket.to(roomId).emit('room:user:left', {
        //   userId,
        // });

        // Clear socket data
        socketToUser.delete(socket.id);

        console.log(`User ${nickname} left room ${roomId}`);
      } catch (error: any) {
        console.error('Error leaving room:', error);
      }
    });

    /**
     * get:participants - Get current participants list (for polling/heartbeat)
     */
    socket.on('get:participants', async () => {
      try {
        const socketData = socketToUser.get(socket.id);
        if (!socketData || !socketData.roomId) {
          return;
        }

        const { roomId } = socketData;
        const participants = await roomManager.getParticipants(roomId);
        console.log(`[Heartbeat] Sending ${participants.length} participants to ${socketData.nickname}`);
        socket.emit('room:participants', participants);
      } catch (error: any) {
        console.error('Error getting participants:', error);
      }
    });

    /**
     * user:away - Update user's away status (when tab is hidden/visible)
     */
    socket.on('user:away', async (data: { away: boolean }) => {
      try {
        const socketData = socketToUser.get(socket.id);
        if (!socketData || !socketData.roomId) {
          return;
        }

        const { roomId, userId, nickname } = socketData;
        
        // Update participant's away status
        await roomManager.setParticipantAway(roomId, userId!, data.away);
        
        console.log(`User ${nickname} is now ${data.away ? 'away' : 'active'}`);
        
        // Broadcast updated participants to everyone in the room
        const participants = await roomManager.getParticipants(roomId);
        io.to(roomId).emit('room:participants', participants);
      } catch (error: any) {
        console.error('Error updating away status:', error);
      }
    });

    /**
     * clear:chat:local - Clear chat locally for this user
     */
    socket.on('clear:chat:local', () => {
      socket.emit('chat:cleared:local');
    });

    /**
     * clear:chat:all - Clear chat for everyone
     */
    socket.on('clear:chat:all', async () => {
      try {
        const socketData = socketToUser.get(socket.id);
        if (!socketData || !socketData.roomId) {
          return;
        }

        const { roomId } = socketData;

        // Clear messages
        await messageManager.clearMessages(roomId, true);

        // Create confirmation message
        const confirmMessage = await messageManager.createSystemMessage(
          roomId,
          'Chat has been cleared'
        );

        // Broadcast to all in room
        io.to(roomId).emit('chat:cleared', confirmMessage);

        console.log(`Chat cleared in room ${roomId}`);
      } catch (error: any) {
        console.error('Error clearing chat:', error);
      }
    });

    /**
     * action:panic - Panic button (clear local + disconnect)
     */
    socket.on('action:panic', async () => {
      try {
        const socketData = socketToUser.get(socket.id);
        if (socketData && socketData.roomId) {
          await roomManager.removeParticipant(socketData.roomId, socketData.userId!);
        }

        // Clear locally and disconnect
        socket.emit('chat:cleared:local');
        socket.disconnect(true);

        console.log(`Panic button triggered by ${socket.id}`);
      } catch (error: any) {
        console.error('Error handling panic:', error);
      }
    });

    /**
     * action:spoof - Inject fake message
     */
    socket.on('action:spoof', async (data: { content: string; spoofSource?: string }) => {
      try {
        const socketData = socketToUser.get(socket.id);
        if (!socketData || !socketData.roomId) {
          return;
        }

        const { roomId } = socketData;

        // Inject fake message
        const fakeMessage = messageManager.injectFakeMessage(
          roomId,
          data.content,
          data.spoofSource || 'Google'
        );

        // Broadcast to all in room
        io.to(roomId).emit('message:fake', fakeMessage);

        console.log(`Fake message injected in room ${roomId}`);
      } catch (error: any) {
        console.error('Error injecting fake message:', error);
      }
    });

    /**
     * edit:message - Edit a message
     */
    socket.on('edit:message', async (data: { messageId: string; content: string }) => {
      try {
        const socketData = socketToUser.get(socket.id);
        if (!socketData || !socketData.roomId) {
          socket.emit('error', {
            code: 'NOT_IN_ROOM',
            message: 'You must join a room first',
          });
          return;
        }

        const { roomId, userId } = socketData;

        // Edit message
        const editedMessage = await messageManager.editMessage(data.messageId, data.content, userId!);

        if (!editedMessage) {
          socket.emit('error', {
            code: 'EDIT_FAILED',
            message: 'Failed to edit message. You may not have permission or the time limit has passed.',
          });
          return;
        }

        // Broadcast to all in room
        io.to(roomId).emit('message:edited', editedMessage);

        console.log(`Message ${data.messageId} edited in room ${roomId}`);
      } catch (error: any) {
        console.error('Error editing message:', error);
        socket.emit('error', {
          code: 'SERVER_ERROR',
          message: error.message,
        });
      }
    });

    /**
     * delete:message - Delete a message (works for both rooms and DMs)
     */
    socket.on('delete:message', async (data: { messageId: string }) => {
      try {
        const socketData = socketToUser.get(socket.id);
        
        // Check if user is in a room or DM
        const isInRoom = socketData && socketData.roomId;
        const isRegistered = socketData && socketData.userId;
        
        if (!isInRoom && !isRegistered) {
          socket.emit('error', {
            code: 'NOT_AUTHORIZED',
            message: 'You must join a room or be registered first',
          });
          return;
        }

        // If in a room, use room deletion logic
        if (isInRoom && socketData) {
          const { roomId, userId } = socketData;

          if (!userId || !roomId) {
            socket.emit('error', {
              code: 'NOT_AUTHORIZED',
              message: 'User ID or Room ID not found',
            });
            return;
          }

          // Check if user is moderator
          const isModerator = await roomManager.isModerator(roomId, userId);

          // Get message first to check for files
          const messages = await messageManager.getMessages(roomId);
          const message = messages.find(m => m.id === data.messageId);

          // Delete message
          const success = await messageManager.deleteMessage(data.messageId, userId, isModerator);

          if (!success) {
            socket.emit('error', {
              code: 'DELETE_FAILED',
              message: 'Failed to delete message. You may not have permission.',
            });
            return;
          }

          // If message had an image or file, delete from storage
          if (message && (message.imageUrl || message.fileUrl)) {
            const fileUrl = message.imageUrl || message.fileUrl;
            if (fileUrl) {
              await deleteFileFromStorage(fileUrl);
            }
          }

          // Broadcast to all in room
          io.to(roomId).emit('message:deleted', { messageId: data.messageId });

          console.log(`Message ${data.messageId} deleted in room ${roomId}`);
        } 
        // If not in room but registered, treat as DM deletion
        else if (isRegistered) {
          const { userId } = socketData!;
          const { messageId } = data;

          if (!userId) {
            socket.emit('error', {
              code: 'NOT_AUTHORIZED',
              message: 'User ID not found',
            });
            return;
          }

          console.log('🗑️ Deleting DM message:', messageId);

          // Get the message first to check if it has files
          // Note: We can't easily get DM history without knowing the other user
          // So we'll try to delete and handle file cleanup in the DM delete handler
          const success = await dmManager.deleteDM(messageId, userId);

          if (!success) {
            socket.emit('error', {
              code: 'DELETE_FAILED',
              message: 'Failed to delete message. You may not have permission.',
            });
            return;
          }

          // Emit to sender
          socket.emit('message:deleted', { messageId });
          console.log('✅ DM message deleted successfully');
        }
      } catch (error: any) {
        console.error('Error deleting message:', error);
        socket.emit('error', {
          code: 'SERVER_ERROR',
          message: error.message,
        });
      }
    });

    /**
     * add:reaction - Add a reaction to a message
     */
    socket.on('add:reaction', async (data: { messageId: string; emoji: string }) => {
      try {
        const socketData = socketToUser.get(socket.id);
        if (!socketData || !socketData.roomId) {
          socket.emit('error', {
            code: 'NOT_IN_ROOM',
            message: 'You must join a room first',
          });
          return;
        }

        const { roomId, userId } = socketData;

        // Add reaction
        const success = await messageManager.addReaction(data.messageId, data.emoji, userId!);

        if (!success) {
          socket.emit('error', {
            code: 'REACTION_FAILED',
            message: 'Failed to add reaction',
          });
          return;
        }

        // Broadcast to all in room
        io.to(roomId).emit('reaction:added', {
          messageId: data.messageId,
          emoji: data.emoji,
          userId,
        });

        console.log(`Reaction ${data.emoji} added to message ${data.messageId}`);
      } catch (error: any) {
        console.error('Error adding reaction:', error);
        socket.emit('error', {
          code: 'SERVER_ERROR',
          message: error.message,
        });
      }
    });

    /**
     * remove:reaction - Remove a reaction from a message
     */
    socket.on('remove:reaction', async (data: { messageId: string; emoji: string }) => {
      try {
        const socketData = socketToUser.get(socket.id);
        if (!socketData || !socketData.roomId) {
          socket.emit('error', {
            code: 'NOT_IN_ROOM',
            message: 'You must join a room first',
          });
          return;
        }

        const { roomId, userId } = socketData;

        // Remove reaction
        const success = await messageManager.removeReaction(data.messageId, data.emoji, userId!);

        if (!success) {
          socket.emit('error', {
            code: 'REACTION_FAILED',
            message: 'Failed to remove reaction',
          });
          return;
        }

        // Broadcast to all in room
        io.to(roomId).emit('reaction:removed', {
          messageId: data.messageId,
          emoji: data.emoji,
          userId,
        });

        console.log(`Reaction ${data.emoji} removed from message ${data.messageId}`);
      } catch (error: any) {
        console.error('Error removing reaction:', error);
        socket.emit('error', {
          code: 'SERVER_ERROR',
          message: error.message,
        });
      }
    });

    /**
     * pin:message - Pin a message
     */
    socket.on('pin:message', async (data: { messageId: string }) => {
      try {
        const socketData = socketToUser.get(socket.id);
        if (!socketData || !socketData.roomId) {
          socket.emit('error', {
            code: 'NOT_IN_ROOM',
            message: 'You must join a room first',
          });
          return;
        }

        const { roomId, userId } = socketData;

        // Check if user is moderator
        const isModerator = await roomManager.isModerator(roomId, userId!);

        // Pin message
        const success = await messageManager.pinMessage(data.messageId, userId!, isModerator);

        if (!success) {
          socket.emit('error', {
            code: 'PIN_FAILED',
            message: 'Failed to pin message. You may not have permission.',
          });
          return;
        }

        // Broadcast to all in room
        io.to(roomId).emit('message:pinned', { messageId: data.messageId });

        console.log(`Message ${data.messageId} pinned in room ${roomId}`);
      } catch (error: any) {
        console.error('Error pinning message:', error);
        socket.emit('error', {
          code: 'SERVER_ERROR',
          message: error.message,
        });
      }
    });

    /**
     * unpin:message - Unpin a message
     */
    socket.on('unpin:message', async (data: { messageId: string }) => {
      try {
        const socketData = socketToUser.get(socket.id);
        if (!socketData || !socketData.roomId) {
          socket.emit('error', {
            code: 'NOT_IN_ROOM',
            message: 'You must join a room first',
          });
          return;
        }

        const { roomId, userId } = socketData;

        // Check if user is moderator
        const isModerator = await roomManager.isModerator(roomId, userId!);

        // Unpin message
        const success = await messageManager.unpinMessage(data.messageId, userId!, isModerator);

        if (!success) {
          socket.emit('error', {
            code: 'UNPIN_FAILED',
            message: 'Failed to unpin message. You may not have permission.',
          });
          return;
        }

        // Broadcast to all in room
        io.to(roomId).emit('message:unpinned', { messageId: data.messageId });

        console.log(`Message ${data.messageId} unpinned in room ${roomId}`);
      } catch (error: any) {
        console.error('Error unpinning message:', error);
        socket.emit('error', {
          code: 'SERVER_ERROR',
          message: error.message,
        });
      }
    });

    /**
     * typing:start - User started typing
     */
    socket.on('typing:start', async () => {
      try {
        const socketData = socketToUser.get(socket.id);
        if (!socketData || !socketData.roomId) {
          return;
        }

        const { roomId, nickname } = socketData;

        // Broadcast to others in room (not to self)
        socket.to(roomId).emit('typing:update', {
          userId: socket.id,
          nickname,
          isTyping: true,
        });
      } catch (error: any) {
        console.error('Error handling typing start:', error);
      }
    });

    /**
     * typing:stop - User stopped typing
     */
    socket.on('typing:stop', async () => {
      try {
        const socketData = socketToUser.get(socket.id);
        if (!socketData || !socketData.roomId) {
          return;
        }

        const { roomId } = socketData;

        // Broadcast to others in room (not to self)
        socket.to(roomId).emit('typing:update', {
          userId: socket.id,
          isTyping: false,
        });
      } catch (error: any) {
        console.error('Error handling typing stop:', error);
      }
    });

    /**
     * send:poll - Create a poll
     */
    socket.on('send:poll', async (data: { question: string; options: string[]; allowMultiple?: boolean }) => {
      try {
        const socketData = socketToUser.get(socket.id);
        if (!socketData || !socketData.roomId) {
          socket.emit('error', {
            code: 'NOT_IN_ROOM',
            message: 'You must join a room first',
          });
          return;
        }

        const { roomId, userId, nickname } = socketData;

        // Validate poll data
        if (!data.question || !data.options || data.options.length < 2) {
          socket.emit('error', {
            code: 'INVALID_POLL',
            message: 'Poll must have a question and at least 2 options',
          });
          return;
        }

        // Create poll data
        const pollData = {
          question: data.question,
          options: data.options.map((text, index) => ({
            id: `opt_${Date.now()}_${index}`,
            text,
            votes: [],
          })),
          allowMultiple: data.allowMultiple || false,
          isClosed: false,
        };

        // Create poll message
        const message = await messageManager.createPollMessage(
          roomId,
          userId!,
          nickname!,
          pollData
        );

        // Broadcast to all in room
        io.to(roomId).emit('message:poll', message);

        console.log(`Poll created in room ${roomId}`);
      } catch (error: any) {
        console.error('Error creating poll:', error);
        socket.emit('error', {
          code: 'SERVER_ERROR',
          message: error.message,
        });
      }
    });

    /**
     * vote:poll - Vote in a poll
     */
    socket.on('vote:poll', async (data: { messageId: string; optionId: string }) => {
      try {
        const socketData = socketToUser.get(socket.id);
        if (!socketData || !socketData.roomId) {
          socket.emit('error', {
            code: 'NOT_IN_ROOM',
            message: 'You must join a room first',
          });
          return;
        }

        const { roomId, userId } = socketData;

        // Vote in poll
        const success = await messageManager.votePoll(data.messageId, data.optionId, userId!);

        if (!success) {
          socket.emit('error', {
            code: 'VOTE_FAILED',
            message: 'Failed to vote. Poll may be closed or you may have already voted.',
          });
          return;
        }

        // Get updated message with poll data
        const messages = await messageManager.getMessages(roomId);
        const pollMessage = messages.find(m => m.id === data.messageId);

        if (pollMessage && pollMessage.pollData) {
          // Broadcast to all in room with updated poll data
          io.to(roomId).emit('poll:voted', {
            messageId: data.messageId,
            optionId: data.optionId,
            userId,
            pollData: pollMessage.pollData,
          });
        }

        console.log(`Vote recorded for poll ${data.messageId}`);
      } catch (error: any) {
        console.error('Error voting in poll:', error);
        socket.emit('error', {
          code: 'SERVER_ERROR',
          message: error.message,
        });
      }
    });

    /**
     * close:poll - Close a poll
     */
    socket.on('close:poll', async (data: { messageId: string }) => {
      try {
        const socketData = socketToUser.get(socket.id);
        if (!socketData || !socketData.roomId) {
          socket.emit('error', {
            code: 'NOT_IN_ROOM',
            message: 'You must join a room first',
          });
          return;
        }

        const { roomId, userId } = socketData;

        // Close poll
        const success = await messageManager.closePoll(data.messageId, userId!);

        if (!success) {
          socket.emit('error', {
            code: 'CLOSE_POLL_FAILED',
            message: 'Failed to close poll. You may not be the creator.',
          });
          return;
        }

        // Broadcast to all in room
        io.to(roomId).emit('poll:closed', { messageId: data.messageId });

        console.log(`Poll ${data.messageId} closed in room ${roomId}`);
      } catch (error: any) {
        console.error('Error closing poll:', error);
        socket.emit('error', {
          code: 'SERVER_ERROR',
          message: error.message,
        });
      }
    });

    /**
     * send:file - Send a file message
     * Note: File upload is handled via REST API, this just broadcasts the message
     */
    socket.on('send:file', async (data: { message: any }) => {
      try {
        const socketData = socketToUser.get(socket.id);
        if (!socketData || !socketData.roomId) {
          return;
        }

        const { roomId } = socketData;

        // Broadcast file message to all in room
        io.to(roomId).emit('message:file', data.message);

        console.log(`File message broadcast in room ${roomId}`);
      } catch (error: any) {
        console.error('Error broadcasting file:', error);
      }
    });

    /**
     * send:voice - Send a voice message
     * Note: Voice upload is handled via REST API, this just broadcasts the message
     */
    socket.on('send:voice', async (data: { message: any }) => {
      try {
        const socketData = socketToUser.get(socket.id);
        if (!socketData || !socketData.roomId) {
          return;
        }

        const { roomId } = socketData;

        // Broadcast voice message to all in room
        io.to(roomId).emit('message:voice', data.message);

        console.log(`Voice message broadcast in room ${roomId}`);
      } catch (error: any) {
        console.error('Error broadcasting voice:', error);
      }
    });

    /**
     * mark:read - Mark a single message as read
     */
    socket.on('mark:read', async (data: { messageId: string }) => {
      try {
        const socketData = socketToUser.get(socket.id);
        if (!socketData || !socketData.roomId) {
          return;
        }

        const { roomId, userId, nickname } = socketData;
        const { messageId } = data;

        // Mark message as read
        const success = await messageManager.markMessageRead(messageId, userId!, nickname!);

        if (success) {
          // Broadcast read receipt to all in room
          io.to(roomId).emit('message:read', {
            messageId,
            userId,
            nickname,
            readAt: new Date(),
          });
        }
      } catch (error: any) {
        console.error('Error marking message as read:', error);
      }
    });

    /**
     * mark:all:read - Mark multiple messages as read
     */
    socket.on('mark:all:read', async (data: { messageIds: string[] }) => {
      try {
        const socketData = socketToUser.get(socket.id);
        if (!socketData || !socketData.roomId) {
          return;
        }

        const { roomId, userId, nickname } = socketData;
        const { messageIds } = data;

        // Mark all messages as read
        for (const messageId of messageIds) {
          const success = await messageManager.markMessageRead(messageId, userId!, nickname!);

          if (success) {
            // Broadcast read receipt to all in room
            io.to(roomId).emit('message:read', {
              messageId,
              userId,
              nickname,
              readAt: new Date(),
            });
          }
        }
      } catch (error: any) {
        console.error('Error marking messages as read:', error);
      }
    });

    /**
     * mark:dm:read - Mark a DM as read
     */
    socket.on('mark:dm:read', async (data: { messageId: string; otherUsername: string }) => {
      try {
        const socketData = socketToUser.get(socket.id);
        if (!socketData || !socketData.userId || !socketData.username) {
          return;
        }

        const { userId, nickname, username } = socketData;
        const { messageId, otherUsername } = data;

        console.log('[DM Read Receipt] Marking DM as read:', { messageId, userId, otherUsername });

        // Mark DM as read
        const success = await dmManager.markDMRead(messageId, userId!, nickname || username!);

        if (success) {
          console.log('[DM Read Receipt] Successfully marked as read, broadcasting...');
          
          // Find the other user's socket(s) and emit read receipt
          const otherUsernameClean = otherUsername.replace('@', '').toLowerCase();
          
          for (const [sid, data] of socketToUser.entries()) {
            const dataUsernameClean = data.username ? data.username.replace('@', '').toLowerCase() : '';
            
            if (dataUsernameClean === otherUsernameClean) {
              io.to(sid).emit('dm:read', {
                messageId,
                userId,
                nickname: nickname || username,
                readAt: new Date(),
              });
              console.log('[DM Read Receipt] Emitted to socket:', sid);
            }
          }
        }
      } catch (error: any) {
        console.error('Error marking DM as read:', error);
      }
    });

    /**
     * mark:dm:all:read - Mark multiple DMs as read
     */
    socket.on('mark:dm:all:read', async (data: { messageIds: string[]; otherUsername: string }) => {
      try {
        const socketData = socketToUser.get(socket.id);
        if (!socketData || !socketData.userId || !socketData.username) {
          console.error('[DM Read Receipt] Socket data missing:', socketData);
          return;
        }

        const { userId, nickname, username } = socketData;
        const { messageIds, otherUsername } = data;

        console.log('[DM Read Receipt] Marking multiple DMs as read:', { count: messageIds.length, otherUsername });

        // Mark all DMs as read
        for (const messageId of messageIds) {
          console.log('[DM Read Receipt] Processing message:', messageId);
          const readBy = await dmManager.markDMRead(messageId, userId!, nickname || username!);
          console.log('[DM Read Receipt] Mark result readBy:', readBy);

          // If readBy is returned (either newly marked or already marked), emit to sender
          if (readBy) {
            console.log('[DM Read Receipt] Finding sender sockets to emit update...');
            
            // Find the other user's socket(s) and emit read receipt with full readBy array
            const otherUsernameClean = otherUsername.replace('@', '').toLowerCase();
            
            let emittedCount = 0;
            for (const [sid, data] of socketToUser.entries()) {
              const dataUsernameClean = data.username ? data.username.replace('@', '').toLowerCase() : '';
              
              if (dataUsernameClean === otherUsernameClean) {
                console.log('[DM Read Receipt] Emitting to socket:', sid);
                io.to(sid).emit('dm:read', {
                  messageId,
                  readBy: readBy.map((r: any) => ({
                    id: r.userId,
                    nickname: r.nickname,
                    readAt: r.readAt
                  }))
                });
                emittedCount++;
              }
            }
            console.log('[DM Read Receipt] Emitted to', emittedCount, 'sockets');
          } else {
            console.error('[DM Read Receipt] Failed to mark message (not recipient or error):', messageId);
          }
        }
      } catch (error: any) {
        console.error('Error marking DMs as read:', error);
      }
    });

    /**
     * register:username - Register a username for DMs and invites
     */
    socket.on('register:username', async (data: { username: string; nickname: string }) => {
      try {
        let { username, nickname } = data;
        
        console.log(`🔵 [Socket] register:username called with username: "${username}", nickname: "${nickname}"`);

        // Normalize username (add @ if not present)
        if (!username.startsWith('@')) {
          username = '@' + username;
        }

        // Check if user already exists (from auth system)
        let user = await userManager.getUserByUsername(username);
        
        if (!user) {
          console.log(`🆕 [Socket] User doesn't exist, registering new user: ${username}`);
          // User doesn't exist, register them
          user = await userManager.registerUser(username, nickname);
          
          if (!user) {
            console.error(`❌ [Socket] Failed to register user: ${username} (username taken)`);
            socket.emit('error', {
              code: 'USERNAME_TAKEN',
              message: 'Username is already taken',
            });
            return;
          }
          console.log(`✅ [Socket] New user registered: ${user.username}`);
        } else {
          console.log(`✅ [Socket] User already exists: ${user.username}, reusing existing user`);
        }

        // Update socket data with username for invites
        const socketData = socketToUser.get(socket.id) || {};
        console.log('📝 [Socket] Current socketData before update:', socketData);
        
        socketData.userId = user.id;
        socketData.username = user.username;
        socketData.nickname = user.nickname;
        socketToUser.set(socket.id, socketData);

        console.log(`📝 [Socket] Socket data updated for ${socket.id}:`, {
          userId: user.id,
          username: user.username,
          nickname: user.nickname,
          roomId: socketData.roomId,
        });
        
        console.log('📊 [Socket] All connected sockets after registration:');
        let idx = 0;
        for (const [sid, data] of socketToUser.entries()) {
          idx++;
          console.log(`   ${idx}. Socket ${sid}:`, {
            username: data.username,
            nickname: data.nickname,
            userId: data.userId,
            roomId: data.roomId,
          });
        }

        socket.emit('username:registered', {
          user: {
            id: user.id,
            username: user.username,
            nickname: user.nickname,
          },
        });

        console.log(`✅ [Socket] Username registered successfully for socket: ${user.username}`);
      } catch (error: any) {
        console.error('❌ [Socket] Error registering username:', error);
        socket.emit('error', {
          code: 'REGISTRATION_ERROR',
          message: error.message,
        });
      }
    });

    /**
     * send:dm - Send a direct message
     */
    socket.on('send:dm', async (data: { toUsername: string; content: string }) => {
      try {
        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log('💬 [BACKEND] SEND:DM EVENT RECEIVED');
        console.log('═══════════════════════════════════════════════════════');
        
        const socketData = socketToUser.get(socket.id);
        console.log('Socket ID:', socket.id);
        console.log('Socket Data:', socketData);
        
        if (!socketData || !socketData.userId || !socketData.username) {
          console.error('❌ User not registered');
          console.log('═══════════════════════════════════════════════════════');
          console.log('');
          socket.emit('error', {
            code: 'NOT_REGISTERED',
            message: 'You must register a username first',
          });
          return;
        }

        let { toUsername, content } = data;
        console.log('From:', socketData.username);
        console.log('To:', toUsername);
        console.log('Content:', content);

        // Normalize username
        if (!toUsername.startsWith('@')) {
          toUsername = '@' + toUsername;
          console.log('Normalized to:', toUsername);
        }

        // Get recipient
        const toUser = await userManager.getUserByUsername(toUsername);
        if (!toUser) {
          console.error('❌ Recipient not found:', toUsername);
          console.log('═══════════════════════════════════════════════════════');
          console.log('');
          socket.emit('error', {
            code: 'USER_NOT_FOUND',
            message: 'Recipient not found',
          });
          return;
        }

        console.log('✅ Recipient found:', toUser.username);

        // Strip model tag from content before saving (e.g., "[model:wave-deepseek-v3.1]")
        let cleanContent = content.replace(/\[model:[^\]]+\]/g, '').trim();
        
        // Send DM with cleaned content
        const message = await dmManager.sendDM(
          socketData.userId,
          socketData.username,
          toUser.id,
          cleanContent
        );

        console.log('📝 Message created:', message);

        // Add sender and recipient info to message
        const messageWithInfo = {
          ...message,
          senderUsername: socketData.username,
          senderNickname: socketData.nickname || socketData.username,
          to_username: toUser.username,
        };

        // Emit to sender
        socket.emit('dm:sent', { message: messageWithInfo });
        console.log('✅ dm:sent emitted to sender');

        // Find recipient's socket(s) and emit to them
        // ## MULTI-SESSION SUPPORT: Send to ALL sockets for this user (supports multiple browsers/devices)
        // Check both with and without @ prefix, case-insensitive
        const toUsernameClean = toUsername.replace('@', '').toLowerCase();
        const toUsernameWithAt = '@' + toUsernameClean;
        
        let recipientFound = false;
        let recipientCount = 0;
        console.log('🔍 Looking for recipient socket(s)...');
        console.log('   Checking for:', toUsernameClean, 'or', toUsernameWithAt, 'or userId:', toUser.id);
        
        for (const [sid, data] of socketToUser.entries()) {
          const dataUsernameClean = data.username ? data.username.replace('@', '').toLowerCase() : '';
          
          console.log(`   Socket ${sid}: username="${data.username}" (clean: "${dataUsernameClean}"), userId="${data.userId}"`);
          
          if (dataUsernameClean === toUsernameClean || 
              data.userId === toUser.id) {
            io.to(sid).emit('dm:received', { message: messageWithInfo });
            console.log('   ✅ MATCH! dm:received emitted to:', sid);
            recipientFound = true;
            recipientCount++;
          }
        }

        if (!recipientFound) {
          console.log('⚠️ Recipient not online - no matching socket found');
        } else {
          console.log(`✅ Message delivered to ${recipientCount} session(s)`);
        }

        console.log('═══════════════════════════════════════════════════════');
        console.log('');

        // Check if message mentions @ai
        if (content.includes('@ai')) {
          console.log('🤖 [DM] AI mention detected, processing...');
          
          const AI_BOT_ID = '00000000-0000-0000-0000-000000000001';
          
          // Extract model from content if specified (e.g., "[model:wave-deepseek-v3.1]")
          const modelMatch = content.match(/\[model:([^\]]+)\]/);
          const requestedModel = modelMatch ? modelMatch[1] : null;
          console.log('🎯 [DM] Requested AI model:', requestedModel || 'default');
          
          // Generate proper UUID for thinking message (temporary, not saved to DB)
          const { randomUUID } = await import('crypto');
          const thinkingMessageId = randomUUID();
          
          // Send "AI is thinking..." indicator to sender
          const thinkingMessageToSender = {
            id: thinkingMessageId,
            roomId: message.roomId,
            senderId: AI_BOT_ID,
            senderNickname: '🤖 WaveBot',
            senderUsername: 'wavebot',
            content: '💭 Thinking...',
            type: 'normal' as const,
            timestamp: new Date(),
            expiresAt: null,
            delivered: true,
            to_username: socketData.username,
          };
          socket.emit('dm:received', { message: thinkingMessageToSender });
          
          // Import DeepSeek AI service with web search
          const { getDeepSeekService } = await import('../services/DeepSeekAIService');
          const deepSeekService = getDeepSeekService();

          // Fetch recent DM history for context (last 10 messages)
          const allDMHistory = await dmManager.getDMHistory(socketData.userId, toUser.id);
          const dmHistory = allDMHistory.slice(-10); // Get last 10 messages
          
          // Build message history for AI with conversation context
          const messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
            {
              role: 'system' as const,
              content: `You are WaveBot, a helpful AI assistant in WaveChat messenger.

🚨 CRITICAL RULE - SEARCH FIRST, ANSWER LATER:
If you don't have 100% certain, up-to-date information about the CURRENT USER QUESTION, you MUST respond with ONLY:
[SEARCH: your search query]

IMPORTANT: Focus on the LATEST user message. Don't mix up previous conversation topics with the current question.

DO NOT:
❌ Give an answer first then search
❌ Say "I don't have information" without searching
❌ Make up or guess information
❌ Add signatures, footers, or "powered by" messages
❌ Search for topics from previous messages when the user asks a NEW question

DO:
✅ Immediately respond [SEARCH: ...] if uncertain about the CURRENT question
✅ Search for ANY question about products, prices, specs, dates, news, events, weather after 2023
✅ Just answer the question directly without extra branding
✅ Use markdown formatting: **bold**, *italic*, \`code\`, ### headings, - lists
✅ Pay attention to what the user is asking RIGHT NOW, not what they asked before

EXAMPLES OF CORRECT BEHAVIOR:
User: "How much is OnePlus Pad 2?"
You: [SEARCH: OnePlus Pad 2 price 2024]

User: "What's the weather in Munich?"
You: [SEARCH: Munich weather now]
(NOT: [SEARCH: OnePlus 15 price] - this is WRONG! User asked about weather, not OnePlus!)

User: "When was iPhone 15 released?"
You: [SEARCH: iPhone 15 release date]

ONLY answer directly for:
- Math calculations (2+2=4)
- Code writing
- Translations
- Explaining concepts you know

DO NOT add signatures, footers, or "powered by" messages at the end of your response.`
            }
          ];
          
          // Add conversation history (exclude AI thinking messages and current message)
          for (const msg of dmHistory) {
            // Skip thinking/error messages and the current message
            if (msg.content.includes('💭 Thinking') || 
                msg.content.includes('🔍 Searching') ||
                msg.id === message.id) {
              continue;
            }
            
            // Determine role based on sender
            if (msg.senderId === AI_BOT_ID) {
              messages.push({
                role: 'assistant' as const,
                content: msg.content
              });
            } else {
              // Remove @ai mention from user messages in history
              const cleanContent = msg.content.replace(/@ai/gi, '').trim();
              if (cleanContent) {
                messages.push({
                  role: 'user' as const,
                  content: cleanContent
                });
              }
            }
          }
          
          // Add current user message (use cleanContent to remove model tag and @ai)
          messages.push({
            role: 'user' as const,
            content: cleanContent.replace('@ai', '').trim()
          });

          try {
            // Call DeepSeek AI WITHOUT web search (free models don't support tools)
            const aiResponse = await deepSeekService.chat(messages, false);
            
            // Check if AI requested search
            const searchMatch = aiResponse.match(/\[SEARCH:\s*(.+?)\]/);
            if (searchMatch) {
              const searchQuery = searchMatch[1].trim();
              console.log('🔍 [DM] AI requested search:', searchQuery);
              
              // Update thinking message to show searching
              const searchingMessage = {
                ...thinkingMessageToSender,
                content: '🔍 Searching the web...',
              };
              socket.emit('dm:received', { message: searchingMessage });
              
              // Import search service
              const { getSearchService } = await import('../services/SearchService');
              const searchService = getSearchService();
              
              try {
                // Perform search
                const searchResults = await searchService.searchDuckDuckGo(searchQuery, 5);
                
                if (searchResults.length > 0) {
                  // Format search results for AI
                  const formattedResults = searchResults.map((r: any, i: number) => 
                    `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.snippet || 'No description'}`
                  ).join('\n\n');
                  
                  // Ask AI again with search results
                  const messagesWithSearch = [
                    ...messages,
                    {
                      role: 'assistant' as const,
                      content: aiResponse
                    },
                    {
                      role: 'user' as const,
                      content: `Answer my previous question using these search results:\n${formattedResults}`
                    }
                  ];
                  
                  // Get final answer from AI
                  const finalAnswer = await deepSeekService.chat(messagesWithSearch, false);
                  
                  // Save final answer to database
                  const aiMessageToSender = await dmManager.sendDM(
                    AI_BOT_ID,
                    'wavebot',
                    socketData.userId,
                    finalAnswer
                  );

                  const aiMessageToRecipient = await dmManager.sendDM(
                    AI_BOT_ID,
                    'wavebot',
                    toUser.id,
                    finalAnswer
                  );

                  // Send to sender
                  const aiMessageForSender = {
                    ...aiMessageToSender,
                    senderNickname: '🤖 WaveBot',
                    senderUsername: 'wavebot',
                    to_username: socketData.username,
                  };
                  socket.emit('dm:received', { message: aiMessageForSender });
                  console.log(`✅ [DM] AI response with search sent to sender`);
                  
                  // Send to recipient if online
                  if (recipientFound) {
                    const aiMessageForRecipient = {
                      ...aiMessageToRecipient,
                      senderNickname: '🤖 WaveBot',
                      senderUsername: 'wavebot',
                      to_username: toUser.username,
                      dmContext: socketData.username,
                    };
                    
                    for (const [sid, data] of socketToUser.entries()) {
                      const dataUsernameClean = data.username ? data.username.replace('@', '').toLowerCase() : '';
                      if (dataUsernameClean === toUsernameClean || data.userId === toUser.id) {
                        io.to(sid).emit('dm:received', { message: aiMessageForRecipient });
                      }
                    }
                    console.log('✅ [DM] AI response with search also sent to recipient');
                  }
                  
                  return; // Exit early, we've handled the search case
                } else {
                  // No search results, send error
                  const { randomUUID } = await import('crypto');
                  const errorMessage = {
                    id: randomUUID(),
                    roomId: message.roomId,
                    senderId: AI_BOT_ID,
                    senderNickname: '🤖 WaveBot',
                    senderUsername: 'wavebot',
                    content: '❌ No search results found. Please try rephrasing your question.',
                    type: 'normal' as const,
                    timestamp: new Date(),
                    expiresAt: null,
                    delivered: true,
                    to_username: socketData.username,
                  };
                  socket.emit('dm:received', { message: errorMessage });
                  return;
                }
              } catch (searchError) {
                console.error('❌ [DM] Search error:', searchError);
                const { randomUUID } = await import('crypto');
                const errorMessage = {
                  id: randomUUID(),
                  roomId: message.roomId,
                  senderId: AI_BOT_ID,
                  senderNickname: '🤖 WaveBot',
                  senderUsername: 'wavebot',
                  content: '❌ Search failed. Please try again.',
                  type: 'normal' as const,
                  timestamp: new Date(),
                  expiresAt: null,
                  delivered: true,
                  to_username: socketData.username,
                };
                socket.emit('dm:received', { message: errorMessage });
                return;
              }
            }
            
            // No search needed, save regular AI response to database as DM from AI bot to sender
            const aiMessageToSender = await dmManager.sendDM(
              AI_BOT_ID,
              'wavebot',
              socketData.userId,
              aiResponse
            );

            // Also save AI response to recipient
            const aiMessageToRecipient = await dmManager.sendDM(
              AI_BOT_ID,
              'wavebot',
              toUser.id,
              aiResponse
            );

            // Prepare message for sender
            const aiMessageForSender = {
              ...aiMessageToSender,
              senderNickname: '🤖 WaveBot',
              senderUsername: 'wavebot',
              to_username: socketData.username,
            };

            // Send to sender
            socket.emit('dm:received', { message: aiMessageForSender });
            console.log(`✅ [DM] AI response sent to sender with web search`);
            
            // Also send to recipient if they're online
            if (recipientFound) {
              const aiMessageForRecipient = {
                ...aiMessageToRecipient,
                senderNickname: '🤖 WaveBot',
                senderUsername: 'wavebot',
                to_username: toUser.username,
                dmContext: socketData.username,
              };
              
              for (const [sid, data] of socketToUser.entries()) {
                const dataUsernameClean = data.username ? data.username.replace('@', '').toLowerCase() : '';
                if (dataUsernameClean === toUsernameClean || data.userId === toUser.id) {
                  io.to(sid).emit('dm:received', { message: aiMessageForRecipient });
                }
              }
              console.log('✅ [DM] AI response also sent to recipient');
            }
          } catch (aiError: any) {
            console.error('❌ [DM] AI processing error:', aiError);
            // Send error message (not saved to DB, just temporary)
            const { randomUUID } = await import('crypto');
            const errorMessage = {
              id: randomUUID(),
              roomId: message.roomId,
              senderId: AI_BOT_ID,
              senderNickname: '🤖 WaveBot',
              senderUsername: 'wavebot',
              content: '❌ Sorry, I encountered an error. Please try again.',
              type: 'normal' as const,
              timestamp: new Date(),
              expiresAt: null,
              delivered: true,
              to_username: socketData.username,
            };
            socket.emit('dm:received', { message: errorMessage });
          }
        }
      } catch (error: any) {
        console.error('❌ Error sending DM:', error);
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        socket.emit('error', {
          code: 'DM_ERROR',
          message: error.message,
        });
      }
    });

    /**
     * get:dm:history - Get DM history with another user
     */
    socket.on('get:dm:history', async (data: { otherUsername: string }) => {
      try {
        const socketData = socketToUser.get(socket.id);
        if (!socketData || !socketData.userId) {
          socket.emit('error', {
            code: 'NOT_REGISTERED',
            message: 'You must register a username first',
          });
          return;
        }

        const { otherUsername } = data;

        // Get other user
        const otherUser = await userManager.getUserByUsername(otherUsername);
        if (!otherUser) {
          socket.emit('error', {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          });
          return;
        }

        // Get history
        const messages = await dmManager.getDMHistory(socketData.userId, otherUser.id);

        socket.emit('dm:history', {
          otherUser: {
            id: otherUser.id,
            username: otherUser.username,
            nickname: otherUser.nickname,
          },
          messages,
        });
      } catch (error: any) {
        console.error('Error getting DM history:', error);
        socket.emit('error', {
          code: 'HISTORY_ERROR',
          message: error.message,
        });
      }
    });

    /**
     * delete:dm - Delete a DM message
     */
    socket.on('delete:dm', async (data: { messageId: string }) => {
      try {
        console.log('🗑️ [BACKEND] DELETE:DM EVENT RECEIVED');
        
        const socketData = socketToUser.get(socket.id);
        if (!socketData || !socketData.userId) {
          socket.emit('error', {
            code: 'NOT_REGISTERED',
            message: 'You must register a username first',
          });
          return;
        }

        const { messageId } = data;
        console.log('Deleting DM:', messageId, 'by user:', socketData.userId);

        // Get the message first to check if it has files
        const allMessages = await dmManager.getDMHistory(socketData.userId, socketData.userId);
        const message = allMessages.find(m => m.id === messageId);
        
        // Delete the DM
        const success = await dmManager.deleteDM(messageId, socketData.userId);

        if (!success) {
          socket.emit('error', {
            code: 'DELETE_FAILED',
            message: 'Failed to delete message. You may not have permission.',
          });
          return;
        }

        // If message had an image or file, delete from Supabase storage
        if (message && message.content) {
          // Check for image marker: [Image: URL]
          if (message.content.startsWith('[Image:') && message.content.endsWith(']')) {
            const imageUrl = message.content.substring(8, message.content.length - 1).trim();
            await deleteFileFromStorage(imageUrl);
          }
          // Check for file marker: [File: URL]
          else if (message.content.startsWith('[File:') && message.content.endsWith(']')) {
            const fileUrl = message.content.substring(7, message.content.length - 1).trim();
            await deleteFileFromStorage(fileUrl);
          }
        }

        // Emit to sender
        socket.emit('dm:deleted', { messageId });
        console.log('✅ DM deleted successfully');

        // TODO: Notify recipient if they're online
        // For now, they'll see it deleted when they refresh or check history

      } catch (error: any) {
        console.error('❌ Error deleting DM:', error);
        socket.emit('error', {
          code: 'DELETE_ERROR',
          message: error.message,
        });
      }
    });

    /**
     * search:users - Search for users
     */
    socket.on('search:users', async (data: { query: string }) => {
      try {
        const { query } = data;

        const users = await userManager.searchUsers(query);

        socket.emit('users:found', {
          users: users.map(u => ({
            id: u.id,
            username: u.username,
            nickname: u.nickname,
          })),
        });
      } catch (error: any) {
        console.error('Error searching users:', error);
        socket.emit('error', {
          code: 'SEARCH_ERROR',
          message: error.message,
        });
      }
    });

    /**
     * user:setup - Set up user online status
     */
    socket.on('user:setup', async (data: { userId: string }) => {
      try {
        const { userId } = data;
        
        // Track online user
        onlineUsers.set(userId, {
          socketId: socket.id,
          lastSeen: new Date()
        });

        // Join user's personal room for notifications
        socket.join(userId);

        // Broadcast user is online
        socket.broadcast.emit('user:online', { userId });

        console.log(`User ${userId} is now online`);
      } catch (error: any) {
        console.error('Error setting up user:', error);
      }
    });

    /**
     * user:status - Get user online status
     */
    socket.on('user:status', async (data: { userId: string }) => {
      try {
        const { userId } = data;
        const userStatus = onlineUsers.get(userId);

        socket.emit('user:status:response', {
          userId,
          isOnline: !!userStatus,
          lastSeen: userStatus?.lastSeen || null
        });
      } catch (error: any) {
        console.error('Error getting user status:', error);
      }
    });

    /**
     * call:user - Initiate WebRTC call
     */
    socket.on('call:user', async (data: { userToCall: string; signalData: any; from: string; name: string }) => {
      try {
        const { userToCall, signalData, from, name } = data;
        
        // Find the socket of the user being called
        const userStatus = onlineUsers.get(userToCall);
        
        if (userStatus) {
          io.to(userStatus.socketId).emit('call:incoming', {
            signal: signalData,
            from,
            name,
            callerSocketId: socket.id
          });
          console.log(`Call initiated from ${from} to ${userToCall}`);
        } else {
          socket.emit('error', {
            code: 'USER_OFFLINE',
            message: 'User is not online'
          });
        }
      } catch (error: any) {
        console.error('Error initiating call:', error);
        socket.emit('error', {
          code: 'CALL_ERROR',
          message: error.message
        });
      }
    });

    /**
     * call:answer - Answer WebRTC call
     */
    socket.on('call:answer', async (data: { to: string; signal: any }) => {
      try {
        const { to, signal } = data;
        
        io.to(to).emit('call:accepted', { signal });
        console.log(`Call answered to ${to}`);
      } catch (error: any) {
        console.error('Error answering call:', error);
      }
    });

    /**
     * call:end - End WebRTC call
     */
    socket.on('call:end', async (data: { to: string }) => {
      try {
        const { to } = data;
        
        // Find the user's socket
        const userStatus = onlineUsers.get(to);
        if (userStatus) {
          io.to(userStatus.socketId).emit('call:ended');
          console.log(`Call ended with ${to}`);
        }
      } catch (error: any) {
        console.error('Error ending call:', error);
      }
    });

    /**
     * send:invite - Send a room invite to another user
     */
    socket.on('send:invite', async (data: { toUsername: string; roomId: string; roomCode: string }) => {
      try {
        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log('📧 [BACKEND] SEND:INVITE EVENT RECEIVED');
        console.log('═══════════════════════════════════════════════════════');
        
        const socketData = socketToUser.get(socket.id);
        console.log('Socket ID:', socket.id);
        console.log('Socket Data:', socketData);
        
        if (!socketData) {
          console.error(`❌ [Socket] send:invite failed: Not in room`);
          console.log('═══════════════════════════════════════════════════════');
          console.log('');
          socket.emit('error', { code: 'NOT_IN_ROOM', message: 'You must be in a room to send invites' });
          return;
        }

        let { toUsername } = data;
        const { roomId, roomCode } = data;
        const { userId: fromUserId, nickname: fromNickname, username: fromUsername } = socketData;

        console.log('From User ID:', fromUserId);
        console.log('From Username:', fromUsername);
        console.log('From Nickname:', fromNickname);
        console.log('To Username (raw):', toUsername);
        console.log('Room ID:', roomId);
        console.log('Room Code:', roomCode);

        // Normalize target username (add @ if not present)
        if (!toUsername.startsWith('@')) {
          toUsername = '@' + toUsername;
          console.log('🔄 Normalized target username to:', toUsername);
        }

        // First, verify the target user exists in the user manager
        try {
          console.log('🔍 Looking up target user in UserManager...');
          const targetUser = await userManager.getUserByUsername(toUsername);
          
          if (!targetUser) {
            console.error(`❌ User not found in UserManager: ${toUsername}`);
            console.log('═══════════════════════════════════════════════════════');
            console.log('');
            socket.emit('error', { code: 'USER_NOT_FOUND', message: `User ${toUsername} not found` });
            return;
          }

          console.log('✅ Target user found in UserManager:');
          console.log('   ID:', targetUser.id);
          console.log('   Username:', targetUser.username);
          console.log('   Nickname:', targetUser.nickname);
          console.log('   Online:', targetUser.isOnline);

          // Find ALL target user's sockets (support multiple sessions)
          // ## MULTI-SESSION SUPPORT: Send to ALL sockets for this user
          const targetSocketIds: string[] = [];
          console.log('🔍 Searching for target user\'s socket(s) in socketToUser map...');
          console.log('Total sockets:', socketToUser.size);
          
          let socketIndex = 0;
          for (const [sid, data] of socketToUser.entries()) {
            socketIndex++;
            console.log(`   Socket ${socketIndex}/${socketToUser.size}:`);
            console.log('      Socket ID:', sid);
            console.log('      Username:', data.username);
            console.log('      User ID:', data.userId);
            console.log('      Nickname:', data.nickname);
            console.log('      Room ID:', data.roomId);
            
            // Match by username (preferred) or userId
            if (data.username === toUsername || data.username === targetUser.username || data.userId === targetUser.id) {
              targetSocketIds.push(sid);
              console.log('      ✅ MATCH FOUND!');
            } else {
              console.log('      ❌ No match');
            }
          }

          if (targetSocketIds.length > 0) {
            console.log('');
            console.log(`✅ Found ${targetSocketIds.length} target socket(s):`, targetSocketIds);
            console.log('📤 Emitting invite:received to all target sockets...');
            
            // User is online, send real-time notification to ALL sessions
            const invite = {
              id: `invite_${Date.now()}`,
              fromUserId,
              fromUsername: fromUsername || fromNickname,
              toUsername: targetUser.username,
              roomId,
              roomCode,
              timestamp: new Date()
            };

            console.log('Invite object:', JSON.stringify(invite, null, 2));
            
            // Send to ALL user's sessions
            targetSocketIds.forEach(sid => {
              io.to(sid).emit('invite:received', invite);
              console.log('✅ invite:received emitted to socket:', sid);
            });
            
            console.log('📤 Emitting invite:sent confirmation to sender...');
            socket.emit('invite:sent', { success: true, username: toUsername });
            console.log('✅ invite:sent confirmation emitted');
          } else {
            console.log('');
            console.log('⚠️ Target socket(s) NOT found - user is offline or not connected');
            console.log('📤 Emitting invite:sent with offline flag...');
            socket.emit('invite:sent', { success: true, username: toUsername, offline: true });
            console.log('✅ invite:sent (offline) emitted');
          }
          
          console.log('═══════════════════════════════════════════════════════');
          console.log('');
        } catch (error: any) {
          console.error('❌ Error looking up user:', error);
          console.log('═══════════════════════════════════════════════════════');
          console.log('');
          socket.emit('error', { code: 'USER_LOOKUP_ERROR', message: 'Failed to find user' });
        }
      } catch (error: any) {
        console.error('❌ Error sending invite:', error);
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        socket.emit('error', { code: 'INVITE_ERROR', message: 'Failed to send invite' });
      }
    });

    /**
     * disconnect - Handle disconnection
     * Wait 3 seconds before broadcasting disconnect to avoid spam on page refresh
     */
    socket.on('disconnect', async () => {
      try {
        const socketData = socketToUser.get(socket.id);
        
        // Handle online status
        for (const [onlineUserId, status] of onlineUsers.entries()) {
          if (status.socketId === socket.id) {
            status.lastSeen = new Date();
            onlineUsers.delete(onlineUserId);
            socket.broadcast.emit('user:offline', { userId: onlineUserId, lastSeen: status.lastSeen });
            console.log(`User ${onlineUserId} is now offline`);
            break;
          }
        }
        
        if (socketData && socketData.roomId) {
          const { roomId, userId, nickname } = socketData;

          // Cancel any existing timeout for this user (in case of rapid reconnect)
          const existingTimeout = disconnectTimeouts.get(userId!);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          // Set a timeout before actually removing the user
          // This prevents "disconnected" spam when users refresh the page
          const timeout = setTimeout(async () => {
            try {
              // Check if user reconnected by looking for any socket with this userId
              let userReconnected = false;
              for (const [, data] of socketToUser.entries()) {
                if (data.userId === userId && data.roomId === roomId) {
                  userReconnected = true;
                  break;
                }
              }
              
              if (!userReconnected) {
                // User didn't reconnect, remove them
                await roomManager.removeParticipant(roomId, userId!);

                // Create a non-persisted leave message (just broadcast, don't store)
                const leaveMessage = {
                  id: `system_leave_${Date.now()}`,
                  roomId: roomId,
                  type: 'system',
                  content: `${nickname} left the room`,
                  timestamp: new Date(),
                };
                io.to(roomId).emit('message:new', leaveMessage);

                // Get updated participants and broadcast to everyone in the room
                const participants = await roomManager.getParticipants(roomId);
                console.log(`Broadcasting updated participants (${participants.length}) to room ${roomId}:`, participants.map(p => p.nickname));
                io.to(roomId).emit('room:participants', participants);

                console.log(`User ${nickname} truly disconnected from room ${roomId}`);
              }
              
              disconnectTimeouts.delete(userId!);
            } catch (error: any) {
              console.error('Error in disconnect timeout:', error);
            }
          }, 3000); // 3 second grace period

          disconnectTimeouts.set(userId!, timeout);
          socketToUser.delete(socket.id);
        }

        console.log(`Socket disconnected: ${socket.id}`);
      } catch (error: any) {
        console.error('Error handling disconnect:', error);
      }
    });
  });

  return io;
}
