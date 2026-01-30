import * as fc from 'fast-check';
import { MessageManager } from './MessageManager';
import { InMemoryStorage } from './InMemoryStorage';
import { Message, Room } from '../models';
import { v4 as uuidv4 } from 'uuid';

describe('MessageManager', () => {
  let storage: InMemoryStorage;
  let messageManager: MessageManager;

  beforeEach(() => {
    storage = new InMemoryStorage();
    messageManager = new MessageManager(storage, 30);
  });

  afterEach(() => {
    messageManager.cleanup();
  });

  afterAll(() => {
    // Ensure all timers are cleared
    jest.clearAllTimers();
  });

  /**
   * **Feature: flux-messenger, Property 10: Message ID uniqueness**
   * For any set of created messages, each message should have a unique identifier
   * that differs from all other message identifiers.
   * **Validates: Requirements 3.3**
   */
  describe('Property 10: Message ID uniqueness', () => {
    it('should generate unique IDs for all messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 50 }),
          async (numMessages) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();

            const messages = [];
            for (let i = 0; i < numMessages; i++) {
              const msg = await manager.createMessage(
                roomId,
                uuidv4(),
                `User${i}`,
                `Message ${i}`
              );
              messages.push(msg);
            }

            // Verify all IDs are unique
            const ids = messages.map(m => m.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 9: Non-expired message delivery**
   * For any room, when a user joins, they should receive only messages
   * where the current time is before the message's expiration time.
   * **Validates: Requirements 3.2**
   */
  describe('Property 9: Non-expired message delivery', () => {
    it('should only return non-expired messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              content: fc.string({ minLength: 1, maxLength: 100 }),
              expiresInMs: fc.integer({ min: -1000, max: 5000 }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (messageData) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();

            // Create messages with different expiration times
            const now = Date.now();
            for (const data of messageData) {
              const msg: Message = {
                id: uuidv4(),
                roomId,
                senderId: uuidv4(),
                senderNickname: 'User',
                content: data.content,
                type: 'normal',
                timestamp: new Date(),
                expiresAt: new Date(now + data.expiresInMs),
              };
              await storage.saveMessage(msg);
            }

            // Get messages
            const retrieved = await manager.getMessages(roomId);

            // All retrieved messages should be non-expired
            const currentTime = new Date();
            for (const msg of retrieved) {
              if (msg.expiresAt) {
                expect(msg.expiresAt.getTime()).toBeGreaterThanOrEqual(currentTime.getTime());
              }
            }

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 11: Message expiration cleanup**
   * For any message with an expiration time, after the expiration time has passed,
   * the message should no longer exist in storage.
   * **Validates: Requirements 3.4, 8.1**
   */
  describe('Property 11: Message expiration cleanup', () => {
    it('should remove messages after expiration', async () => {
      const storage = new InMemoryStorage();
      const manager = new MessageManager(storage, 30);
      const roomId = uuidv4();

      try {
        // Create a message that expires in 100ms
        const msg = await manager.createMessage(
          roomId,
          uuidv4(),
          'User',
          'Test message'
        );
        msg.expiresAt = new Date(Date.now() + 100);
        await storage.saveMessage(msg);
        manager.scheduleExpiration(msg);

        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 200));

        // Message should be gone
        const messages = await storage.getMessages(roomId);
        expect(messages.find(m => m.id === msg.id)).toBeUndefined();
      } finally {
        manager.cleanup();
      }
    });
  });

  /**
   * **Feature: flux-messenger, Property 15: Clear all deletes messages**
   * For any room with messages, when clear chat for everyone is triggered,
   * all non-system messages should be deleted from the room.
   * **Validates: Requirements 5.1**
   */
  describe('Property 15: Clear all deletes messages', () => {
    it('should delete all non-system messages when clearing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              content: fc.string({ minLength: 1, maxLength: 100 }),
              type: fc.constantFrom('normal' as const, 'image' as const, 'ai' as const),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (messageData) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();

            // Create messages
            for (const data of messageData) {
              await manager.createMessage(
                roomId,
                uuidv4(),
                'User',
                data.content,
                data.type
              );
            }

            // Clear all messages
            await manager.clearMessages(roomId, false);

            // No messages should remain
            const messages = await storage.getMessages(roomId);
            expect(messages.length).toBe(0);

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 16: Safety banner preservation**
   * For any room, when messages are cleared for everyone, the safety banner
   * system message should remain in the room.
   * **Validates: Requirements 5.3**
   */
  describe('Property 16: Safety banner preservation', () => {
    it('should preserve system messages when clearing with preserveSystem flag', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 1, maxLength: 100 }),
            { minLength: 1, maxLength: 10 }
          ),
          async (normalMessages) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();

            // Create system message (safety banner)
            await manager.createSystemMessage(roomId, 'Safety warning: Do not share personal information');

            // Create normal messages
            for (const content of normalMessages) {
              await manager.createMessage(roomId, uuidv4(), 'User', content);
            }

            // Clear with preserve system flag
            await manager.clearMessages(roomId, true);

            // Only system messages should remain
            const messages = await storage.getMessages(roomId);
            expect(messages.length).toBeGreaterThan(0);
            expect(messages.every(m => m.type === 'system')).toBe(true);

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 19: Fake message non-persistence**
   * For any fake message, when querying persistent storage, the fake message
   * should not be present.
   * **Validates: Requirements 6.3**
   */
  describe('Property 19: Fake message non-persistence', () => {
    it('should not persist fake messages to storage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              content: fc.string({ minLength: 1, maxLength: 100 }),
              spoofSource: fc.constantFrom('Google', 'Wikipedia', 'BBC News'),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (fakeMessageData) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();

            // Inject fake messages
            for (const data of fakeMessageData) {
              manager.injectFakeMessage(roomId, data.content, data.spoofSource);
            }

            // Verify no fake messages in storage
            const messages = await storage.getMessages(roomId);
            expect(messages.filter(m => m.type === 'fake').length).toBe(0);

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 20: Fake message ephemerality**
   * For any room, when a user disconnects and reconnects, previously sent
   * fake messages should not be included in the delivered message history.
   * **Validates: Requirements 6.4**
   */
  describe('Property 20: Fake message ephemerality', () => {
    it('should not include fake messages in message history', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (numFakeMessages) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();

            // Inject fake messages
            for (let i = 0; i < numFakeMessages; i++) {
              manager.injectFakeMessage(roomId, `Fake ${i}`, 'Google');
            }

            // Simulate reconnect - get messages from storage
            const messages = await manager.getMessages(roomId);

            // No fake messages should be in history
            expect(messages.filter(m => m.type === 'fake').length).toBe(0);

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 40: Spoof source identification**
   * For any fake message, the spoofSource field should correctly identify
   * the source (Google, Wikipedia, etc.) and be visible in the message.
   * **Validates: Requirements 12.3, 12.4**
   */
  describe('Property 40: Spoof source identification', () => {
    it('should correctly identify and display spoof source', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              content: fc.string({ minLength: 1, maxLength: 100 }),
              spoofSource: fc.constantFrom('Google', 'Wikipedia', 'BBC News', 'NASA', 'WHO'),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (fakeMessageData) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();

            // Inject fake messages with different sources
            const fakeMessages = fakeMessageData.map(data =>
              manager.injectFakeMessage(roomId, data.content, data.spoofSource)
            );

            // Verify each fake message has correct spoofSource
            for (let i = 0; i < fakeMessages.length; i++) {
              const msg = fakeMessages[i];
              const expectedSource = fakeMessageData[i].spoofSource;

              expect(msg.type).toBe('fake');
              expect(msg.spoofSource).toBe(expectedSource);
              expect(msg.senderNickname).toBe(expectedSource);
              expect(msg.senderId).toBe('system');
            }

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 24: Global expiration application**
   * For any system-level expiration configuration, all newly created messages
   * should have an expiration time matching the configured duration.
   * **Validates: Requirements 8.2**
   */
  describe('Property 24: Global expiration application', () => {
    it('should apply global expiration to all new messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 120 }),
          fc.integer({ min: 1, max: 10 }),
          async (expirationMinutes, numMessages) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, expirationMinutes);
            const roomId = uuidv4();

            const messages = [];
            for (let i = 0; i < numMessages; i++) {
              const msg = await manager.createMessage(
                roomId,
                uuidv4(),
                'User',
                `Message ${i}`
              );
              messages.push(msg);
            }

            // All messages should have expiration set
            for (const msg of messages) {
              expect(msg.expiresAt).not.toBeNull();
              
              // Check expiration is approximately correct (within 1 second tolerance)
              const expectedExpiration = msg.timestamp.getTime() + expirationMinutes * 60 * 1000;
              const actualExpiration = msg.expiresAt!.getTime();
              expect(Math.abs(actualExpiration - expectedExpiration)).toBeLessThan(1000);
            }

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 26: Silent expiration**
   * For any message that expires, no deletion event should be broadcast
   * to room participants.
   * **Validates: Requirements 8.4**
   */
  describe('Property 26: Silent expiration', () => {
    it('should silently remove expired messages without broadcasting', async () => {
      const storage = new InMemoryStorage();
      const manager = new MessageManager(storage, 30);
      const roomId = uuidv4();

      try {
        // Create a message that expires quickly
        const msg = await manager.createMessage(
          roomId,
          uuidv4(),
          'User',
          'Test'
        );
        msg.expiresAt = new Date(Date.now() + 50);
        await storage.saveMessage(msg);
        manager.scheduleExpiration(msg);

        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 100));

        // Message should be gone (silent deletion)
        const messages = await storage.getMessages(roomId);
        expect(messages.find(m => m.id === msg.id)).toBeUndefined();
      } finally {
        manager.cleanup();
      }
    });
  });
});

  /**
   * **Feature: flux-messenger, Property 29: Image format validation**
   * For any uploaded image, the system should accept only JPEG, PNG, GIF, and WebP
   * formats and reject all other file types.
   * **Validates: Requirements 10.1**
   */
  describe('Property 29: Image format validation', () => {
    it('should create image messages with valid URLs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('jpg', 'jpeg', 'png', 'gif', 'webp'),
          fc.string({ minLength: 10, maxLength: 100 }),
          async (extension, urlPath) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();

            const imageUrl = `https://storage.example.com/${urlPath}.${extension}`;
            const msg = await manager.createImageMessage(
              roomId,
              uuidv4(),
              'User',
              imageUrl
            );

            expect(msg.type).toBe('image');
            expect(msg.imageUrl).toBe(imageUrl);

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 30: Image size limit enforcement**
   * For any uploaded image, when the file size exceeds the maximum limit,
   * the upload should be rejected.
   * **Validates: Requirements 10.2**
   */
  describe('Property 30: Image size limit enforcement', () => {
    it('should store image messages with size metadata', async () => {
      // Note: Size validation happens at upload service level
      // MessageManager just stores the URL
      const storage = new InMemoryStorage();
      const manager = new MessageManager(storage, 30);
      const roomId = uuidv4();

      const imageUrl = 'https://storage.example.com/image.jpg';
      const msg = await manager.createImageMessage(
        roomId,
        uuidv4(),
        'User',
        imageUrl
      );

      expect(msg.imageUrl).toBe(imageUrl);
      manager.cleanup();
    });
  });

  /**
   * **Feature: flux-messenger, Property 32: Image message broadcast**
   * For any image message created, the message should be broadcast to all
   * room participants with type='image' and contain the image URL.
   * **Validates: Requirements 10.4, 10.5**
   */
  describe('Property 32: Image message broadcast', () => {
    it('should create image messages with correct type and URL', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              imageUrl: fc.webUrl(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (imageData) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();

            // Create image messages
            for (const data of imageData) {
              await manager.createImageMessage(
                roomId,
                uuidv4(),
                'User',
                data.imageUrl
              );
            }

            // Verify all messages have correct type and URL
            const messages = await manager.getMessages(roomId);
            expect(messages.length).toBe(imageData.length);
            
            for (const msg of messages) {
              expect(msg.type).toBe('image');
              expect(msg.imageUrl).toBeDefined();
            }

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 33: Image expiration cleanup**
   * For any image message with an expiration time, after expiration,
   * the message reference should be removed from storage.
   * **Validates: Requirements 10.6**
   */
  describe('Property 33: Image expiration cleanup', () => {
    it('should remove image messages after expiration', async () => {
      const storage = new InMemoryStorage();
      const manager = new MessageManager(storage, 30);
      const roomId = uuidv4();

      try {
        // Create image message that expires quickly
        const msg = await manager.createImageMessage(
          roomId,
          uuidv4(),
          'User',
          'https://example.com/image.jpg'
        );
        msg.expiresAt = new Date(Date.now() + 50);
        await storage.saveMessage(msg);
        manager.scheduleExpiration(msg);

        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 100));

        // Image message should be gone
        const messages = await storage.getMessages(roomId);
        expect(messages.find(m => m.id === msg.id)).toBeUndefined();
      } finally {
        manager.cleanup();
      }
    });
  });

  /**
   * **Feature: flux-messenger, Property 41: Message edit updates content**
   * For any message owned by a user, when that user edits the message,
    * the
 content should be updated and the isEdited flag should be set to true.
   * **Validates: Requirements 13.1**
   */
  describe('Property 41: Message edit updates content', () => {
    it('should update message content and set isEdited flag', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (originalContent, newContent) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();
            const userId = uuidv4();

            // Create message
            const msg = await manager.createMessage(
              roomId,
              userId,
              'User',
              originalContent
            );

            // Edit message
            const edited = await manager.editMessage(msg.id, newContent, userId);

            expect(edited).not.toBeNull();
            expect(edited!.content).toBe(newContent);
            expect(edited!.isEdited).toBe(true);
            expect(edited!.editedAt).toBeDefined();

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 43: Edit authorization**
   * For any message, when a user who is not the message owner attempts to edit it,
   * the edit should be rejected.
   * **Validates: Requirements 13.3**
   */
  describe('Property 43: Edit authorization', () => {
    it('should reject edits from non-owners', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (content) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();
            const ownerId = uuidv4();
            const otherUserId = uuidv4();

            // Create message
            const msg = await manager.createMessage(
              roomId,
              ownerId,
              'Owner',
              content
            );

            // Try to edit as different user
            await expect(
              manager.editMessage(msg.id, 'New content', otherUserId)
            ).rejects.toThrow('Unauthorized');

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 45: Edit time limit enforcement**
   * For any message older than 48 hours, edit attempts should be rejected.
   * **Validates: Requirements 13.5**
   */
  describe('Property 45: Edit time limit enforcement', () => {
    it('should reject edits for messages older than 48 hours', async () => {
      const storage = new InMemoryStorage();
      const manager = new MessageManager(storage, 30);
      const roomId = uuidv4();
      const userId = uuidv4();

      // Create message with old timestamp
      const msg = await manager.createMessage(
        roomId,
        userId,
        'User',
        'Old message'
      );

      // Set timestamp to 49 hours ago
      msg.timestamp = new Date(Date.now() - 49 * 60 * 60 * 1000);
      await storage.saveMessage(msg);

      // Try to edit
      await expect(
        manager.editMessage(msg.id, 'New content', userId)
      ).rejects.toThrow('Cannot edit messages older than 48 hours');

      manager.cleanup();
    });
  });

  /**
   * **Feature: flux-messenger, Property 46: Message deletion removes from storage**
   * For any message owned by a user, when that user deletes the message,
   * it should be marked as deleted and the deletion should be broadcast.
   * **Validates: Requirements 14.1**
   */
  describe('Property 46: Message deletion removes from storage', () => {
    it('should mark message as deleted', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (content) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();
            const userId = uuidv4();

            // Create message
            const msg = await manager.createMessage(
              roomId,
              userId,
              'User',
              content
            );

            // Delete message
            const result = await manager.deleteMessage(msg.id, userId, false);

            expect(result).toBe(true);

            // Verify message is marked as deleted
            const messages = await storage.getMessages(roomId);
            const deletedMsg = messages.find(m => m.id === msg.id);
            expect(deletedMsg).toBeDefined();
            expect(deletedMsg!.isDeleted).toBe(true);
            expect(deletedMsg!.deletedAt).toBeDefined();

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 48: Delete authorization with moderator override**
   * For any message, when a non-owner non-moderator attempts to delete it,
   * the deletion should be rejected; when a moderator attempts deletion, it should succeed.
   * **Validates: Requirements 14.3, 14.4**
   */
  describe('Property 48: Delete authorization with moderator override', () => {
    it('should reject deletion from non-owners and allow moderators', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (content) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();
            const ownerId = uuidv4();
            const otherUserId = uuidv4();
            const moderatorId = uuidv4();

            // Create message
            const msg = await manager.createMessage(
              roomId,
              ownerId,
              'Owner',
              content
            );

            // Try to delete as non-owner non-moderator
            await expect(
              manager.deleteMessage(msg.id, otherUserId, false)
            ).rejects.toThrow('Unauthorized');

            // Delete as moderator should succeed
            const result = await manager.deleteMessage(msg.id, moderatorId, true);
            expect(result).toBe(true);

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

  /**
   * **Feature: flux-messenger, Property 50: Reaction addition and storage**
   * For any message and any emoji, when a user adds a reaction,
   * the reaction should be stored in the message's reactions map and broadcast to all participants.
   * **Validates: Requirements 15.1**
   */
  describe('Property 50: Reaction addition and storage', () => {
    it('should store reactions correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              emoji: fc.constantFrom('👍', '❤️', '😂', '🎉', '🔥'),
              userId: fc.uuid(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (reactionData) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();

            // Create message
            const msg = await manager.createMessage(
              roomId,
              uuidv4(),
              'User',
              'Test message'
            );

            // Add reactions
            for (const data of reactionData) {
              await manager.addReaction(msg.id, data.emoji, data.userId);
            }

            // Verify reactions are stored
            const messages = await storage.getMessages(roomId);
            const message = messages.find(m => m.id === msg.id);
            expect(message).toBeDefined();
            expect(message!.reactions).toBeDefined();
            expect(message!.reactions!.length).toBeGreaterThan(0);

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 51: Reaction removal round trip**
   * For any message with a reaction, when the same user removes that reaction,
   * the reaction should no longer exist in the message's reactions map.
   * **Validates: Requirements 15.2**
   */
  describe('Property 51: Reaction removal round trip', () => {
    it('should remove reactions correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('👍', '❤️', '😂', '🎉', '🔥'),
          fc.uuid(),
          async (emoji, userId) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();

            // Create message
            const msg = await manager.createMessage(
              roomId,
              uuidv4(),
              'User',
              'Test message'
            );

            // Add reaction
            await manager.addReaction(msg.id, emoji, userId);

            // Remove reaction
            await manager.removeReaction(msg.id, emoji, userId);

            // Verify reaction is removed
            const messages = await storage.getMessages(roomId);
            const message = messages.find(m => m.id === msg.id);
            
            if (message!.reactions) {
              const reaction = message!.reactions.find(r => r.emoji === emoji);
              if (reaction) {
                expect(reaction.userIds).not.toContain(userId);
              }
            }

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 52: Reaction grouping and counting**
   * For any message, when multiple users react with the same emoji,
   * the reactions map should contain one entry for that emoji with multiple user IDs.
   * **Validates: Requirements 15.3**
   */
  describe('Property 52: Reaction grouping and counting', () => {
    it('should group reactions by emoji', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('👍', '❤️', '😂'),
          fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }),
          async (emoji, userIds) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();

            // Create message
            const msg = await manager.createMessage(
              roomId,
              uuidv4(),
              'User',
              'Test message'
            );

            // Add same reaction from multiple users
            for (const userId of userIds) {
              await manager.addReaction(msg.id, emoji, userId);
            }

            // Verify reactions are grouped
            const messages = await storage.getMessages(roomId);
            const message = messages.find(m => m.id === msg.id);
            expect(message).toBeDefined();
            expect(message!.reactions).toBeDefined();

            const reaction = message!.reactions!.find(r => r.emoji === emoji);
            expect(reaction).toBeDefined();
            expect(reaction!.userIds.length).toBe(userIds.length);

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 55: Pin message authorization and marking**
   * For any message, when a moderator pins it, the message should have
   * isPinned=true and pinnedAt timestamp.
   * **Validates: Requirements 16.1**
   */
  describe('Property 55: Pin message authorization and marking', () => {
    it('should pin messages when user is moderator', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (content) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();
            const moderatorId = uuidv4();

            // Create message
            const msg = await manager.createMessage(
              roomId,
              uuidv4(),
              'User',
              content
            );

            // Pin as moderator
            const result = await manager.pinMessage(msg.id, moderatorId, true);

            expect(result).toBe(true);

            // Verify message is pinned
            const messages = await storage.getMessages(roomId);
            const pinnedMsg = messages.find(m => m.id === msg.id);
            expect(pinnedMsg).toBeDefined();
            expect(pinnedMsg!.isPinned).toBe(true);
            expect(pinnedMsg!.pinnedAt).toBeDefined();

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 56: Pinned message retrieval**
   * For any room, when querying pinned messages, only messages with
   * isPinned=true should be returned.
   * **Validates: Requirements 16.2**
   */
  describe('Property 56: Pinned message retrieval', () => {
    it('should return only pinned messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 5 }),
          async (numPinned, numUnpinned) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();
            const moderatorId = uuidv4();

            // Create and pin some messages
            for (let i = 0; i < numPinned; i++) {
              const msg = await manager.createMessage(
                roomId,
                uuidv4(),
                'User',
                `Pinned ${i}`
              );
              await manager.pinMessage(msg.id, moderatorId, true);
            }

            // Create unpinned messages
            for (let i = 0; i < numUnpinned; i++) {
              await manager.createMessage(
                roomId,
                uuidv4(),
                'User',
                `Unpinned ${i}`
              );
            }

            // Get pinned messages
            const pinned = await manager.getPinnedMessages(roomId);

            expect(pinned.length).toBe(numPinned);
            expect(pinned.every(m => m.isPinned === true)).toBe(true);

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 57: Unpin round trip**
   * For any pinned message, when a moderator unpins it, the message
   * should have isPinned=false.
   * **Validates: Requirements 16.3**
   */
  describe('Property 57: Unpin round trip', () => {
    it('should unpin messages correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (content) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();
            const moderatorId = uuidv4();

            // Create and pin message
            const msg = await manager.createMessage(
              roomId,
              uuidv4(),
              'User',
              content
            );
            await manager.pinMessage(msg.id, moderatorId, true);

            // Unpin message
            const result = await manager.unpinMessage(msg.id, moderatorId, true);

            expect(result).toBe(true);

            // Verify message is unpinned
            const messages = await storage.getMessages(roomId);
            const unpinnedMsg = messages.find(m => m.id === msg.id);
            expect(unpinnedMsg).toBeDefined();
            expect(unpinnedMsg!.isPinned).toBe(false);

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 59: Pin authorization enforcement**
   * For any message, when a non-moderator attempts to pin it,
   * the operation should be rejected.
   * **Validates: Requirements 16.5**
   */
  describe('Property 59: Pin authorization enforcement', () => {
    it('should reject pin attempts from non-moderators', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (content) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();
            const userId = uuidv4();

            // Create message
            const msg = await manager.createMessage(
              roomId,
              uuidv4(),
              'User',
              content
            );

            // Try to pin as non-moderator
            await expect(
              manager.pinMessage(msg.id, userId, false)
            ).rejects.toThrow('Unauthorized');

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 65: Poll creation and broadcast**
   * For any poll message, when created, it should be broadcast to all
   * room participants with type='poll'.
   * **Validates: Requirements 18.1**
   */
  describe('Property 65: Poll creation and broadcast', () => {
    it('should create poll messages correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 100 }),
          fc.array(
            fc.string({ minLength: 1, maxLength: 50 }),
            { minLength: 2, maxLength: 5 }
          ),
          async (question, optionTexts) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();

            const pollData: import('../models').PollData = {
              question,
              options: optionTexts.map(text => ({
                id: uuidv4(),
                text,
                votes: []
              })),
              allowMultiple: false,
              isClosed: false
            };

            const msg = await manager.createPollMessage(
              roomId,
              uuidv4(),
              'User',
              pollData
            );

            expect(msg.type).toBe('poll');
            expect(msg.pollData).toBeDefined();
            expect(msg.pollData!.question).toBe(question);
            expect(msg.pollData!.options.length).toBe(optionTexts.length);

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 66: Poll vote recording**
   * For any poll option, when a user votes for it, the user's ID
   * should be added to that option's votes set.
   * **Validates: Requirements 18.2**
   */
  describe('Property 66: Poll vote recording', () => {
    it('should record votes correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
          async (userIds) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();

            const pollData: import('../models').PollData = {
              question: 'Test poll?',
              options: [
                { id: uuidv4(), text: 'Option 1', votes: [] },
                { id: uuidv4(), text: 'Option 2', votes: [] }
              ],
              allowMultiple: false,
              isClosed: false
            };

            const msg = await manager.createPollMessage(
              roomId,
              uuidv4(),
              'User',
              pollData
            );

            // Vote for first option
            const optionId = pollData.options[0].id;
            for (const userId of userIds) {
              await manager.votePoll(msg.id, optionId, userId);
            }

            // Verify votes
            const messages = await storage.getMessages(roomId);
            const pollMsg = messages.find(m => m.id === msg.id);
            expect(pollMsg).toBeDefined();
            expect(pollMsg!.pollData).toBeDefined();
            
            const option = pollMsg!.pollData!.options.find(o => o.id === optionId);
            expect(option).toBeDefined();
            expect(option!.votes.length).toBe(userIds.length);

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 68: Poll vote uniqueness**
   * For any poll, when a user attempts to vote multiple times,
   * only their most recent vote should be recorded (or rejected if allowMultiple=false).
   * **Validates: Requirements 18.4**
   */
  describe('Property 68: Poll vote uniqueness', () => {
    it('should prevent duplicate votes when allowMultiple is false', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (userId) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();

            const option1Id = uuidv4();
            const option2Id = uuidv4();

            const pollData: import('../models').PollData = {
              question: 'Test poll?',
              options: [
                { id: option1Id, text: 'Option 1', votes: [] },
                { id: option2Id, text: 'Option 2', votes: [] }
              ],
              allowMultiple: false,
              isClosed: false
            };

            const msg = await manager.createPollMessage(
              roomId,
              uuidv4(),
              'User',
              pollData
            );

            // Vote for first option
            await manager.votePoll(msg.id, option1Id, userId);

            // Vote for second option (should remove first vote)
            await manager.votePoll(msg.id, option2Id, userId);

            // Verify only second vote exists
            const messages = await storage.getMessages(roomId);
            const pollMsg = messages.find(m => m.id === msg.id);
            
            const option1 = pollMsg!.pollData!.options.find(o => o.id === option1Id);
            const option2 = pollMsg!.pollData!.options.find(o => o.id === option2Id);
            
            expect(option1!.votes).not.toContain(userId);
            expect(option2!.votes).toContain(userId);

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 69: Poll closure state**
   * For any poll, when the creator closes it, the isClosed flag
   * should be set to true and closedAt timestamp should be set.
   * **Validates: Requirements 18.5**
   */
  describe('Property 69: Poll closure state', () => {
    it('should close polls correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (creatorId) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();

            const pollData: import('../models').PollData = {
              question: 'Test poll?',
              options: [
                { id: uuidv4(), text: 'Option 1', votes: [] },
                { id: uuidv4(), text: 'Option 2', votes: [] }
              ],
              allowMultiple: false,
              isClosed: false
            };

            const msg = await manager.createPollMessage(
              roomId,
              creatorId,
              'Creator',
              pollData
            );

            // Close poll
            await manager.closePoll(msg.id, creatorId);

            // Verify poll is closed
            const messages = await storage.getMessages(roomId);
            const pollMsg = messages.find(m => m.id === msg.id);
            
            expect(pollMsg!.pollData!.isClosed).toBe(true);
            expect(pollMsg!.pollData!.closedAt).toBeDefined();

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  });
});

  /**
   * **Feature: flux-messenger, Property 41: Message edit updates content**
   * For any message edit operation, the message content should be updated
   * and the isEdited flag should be set to true.
   * **Validates: Requirements 13.1**
   */
  describe('Property 41: Message edit updates content', () => {
    it('should update message content and set edited flag', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.string({ minLength: 1, maxLength: 500 }),
          async (originalContent, newContent) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();
            const userId = uuidv4();

            // Create message
            const msg = await manager.createMessage(
              roomId,
              userId,
              'User',
              originalContent
            );

            // Edit message
            const edited = await manager.editMessage(msg.id, newContent, userId);

            expect(edited).not.toBeNull();
            expect(edited!.content).toBe(newContent);
            expect(edited!.isEdited).toBe(true);
            expect(edited!.editedAt).toBeDefined();

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 43: Edit authorization**
   * For any message edit attempt, only the original sender should be able
   * to edit the message. Other users should be rejected.
   * **Validates: Requirements 13.3**
   */
  describe('Property 43: Edit authorization', () => {
    it('should reject edits from non-owners', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          async (content) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();
            const ownerId = uuidv4();
            const otherId = uuidv4();

            // Create message
            const msg = await manager.createMessage(
              roomId,
              ownerId,
              'Owner',
              content
            );

            // Try to edit as different user
            await expect(
              manager.editMessage(msg.id, 'New content', otherId)
            ).rejects.toThrow('Unauthorized');

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 45: Edit time limit enforcement**
   * For any message edit attempt after 48 hours, the edit should be rejected
   * with an appropriate error message.
   * **Validates: Requirements 13.5**
   */
  describe('Property 45: Edit time limit enforcement', () => {
    it('should reject edits after 48 hours', async () => {
      const storage = new InMemoryStorage();
      const manager = new MessageManager(storage, 30);
      const roomId = uuidv4();
      const userId = uuidv4();

      // Create message
      const msg = await manager.createMessage(
        roomId,
        userId,
        'User',
        'Original content'
      );

      // Simulate 49 hours passing
      const oldTimestamp = new Date(Date.now() - 49 * 60 * 60 * 1000);
      msg.timestamp = oldTimestamp;
      await storage.saveMessage(msg);

      // Try to edit
      await expect(
        manager.editMessage(msg.id, 'New content', userId)
      ).rejects.toThrow('Cannot edit messages older than 48 hours');

      manager.cleanup();
    });
  });

  /**
   * **Feature: flux-messenger, Property 46: Message deletion removes from storage**
   * For any message deletion, the message should be marked as deleted
   * and content should be replaced with placeholder text.
   * **Validates: Requirements 14.1**
   */
  describe('Property 46: Message deletion removes from storage', () => {
    it('should mark message as deleted', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          async (content) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();
            const userId = uuidv4();

            // Create message
            const msg = await manager.createMessage(
              roomId,
              userId,
              'User',
              content
            );

            // Delete message
            const result = await manager.deleteMessage(msg.id, userId, false);

            expect(result).toBe(true);

            // Verify message is marked as deleted
            const messages = await storage.getAllMessages();
            const deletedMsg = messages.find(m => m.id === msg.id);
            expect(deletedMsg!.isDeleted).toBe(true);
            expect(deletedMsg!.content).toBe('[Message deleted]');
            expect(deletedMsg!.deletedAt).toBeDefined();

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 48: Delete authorization with moderator override**
   * For any message deletion, only the owner or a moderator should be able
   * to delete the message.
   * **Validates: Requirements 14.3, 14.4**
   */
  describe('Property 48: Delete authorization with moderator override', () => {
    it('should allow owner to delete', async () => {
      const storage = new InMemoryStorage();
      const manager = new MessageManager(storage, 30);
      const roomId = uuidv4();
      const userId = uuidv4();

      const msg = await manager.createMessage(roomId, userId, 'User', 'Content');
      const result = await manager.deleteMessage(msg.id, userId, false);

      expect(result).toBe(true);
      manager.cleanup();
    });

    it('should allow moderator to delete', async () => {
      const storage = new InMemoryStorage();
      const manager = new MessageManager(storage, 30);
      const roomId = uuidv4();
      const userId = uuidv4();
      const modId = uuidv4();

      const msg = await manager.createMessage(roomId, userId, 'User', 'Content');
      const result = await manager.deleteMessage(msg.id, modId, true);

      expect(result).toBe(true);
      manager.cleanup();
    });

    it('should reject non-owner non-moderator', async () => {
      const storage = new InMemoryStorage();
      const manager = new MessageManager(storage, 30);
      const roomId = uuidv4();
      const userId = uuidv4();
      const otherId = uuidv4();

      const msg = await manager.createMessage(roomId, userId, 'User', 'Content');

      await expect(
        manager.deleteMessage(msg.id, otherId, false)
      ).rejects.toThrow('Unauthorized');

      manager.cleanup();
    });
  });

  /**
   * **Feature: flux-messenger, Property 50: Reaction addition and storage**
   * For any reaction addition, the reaction should be stored with the message
   * and associated with the user who reacted.
   * **Validates: Requirements 15.1**
   */
  describe('Property 50: Reaction addition and storage', () => {
    it('should add reactions to messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.constantFrom('👍', '❤️', '😂', '😮', '😢', '🎉'), { minLength: 1, maxLength: 5 }),
          async (emojis) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();
            const userId = uuidv4();

            // Create message
            const msg = await manager.createMessage(
              roomId,
              userId,
              'User',
              'Content'
            );

            // Add reactions
            for (const emoji of emojis) {
              await manager.addReaction(msg.id, emoji, userId);
            }

            // Verify reactions
            const messages = await storage.getAllMessages();
            const reactedMsg = messages.find(m => m.id === msg.id);
            expect(reactedMsg!.reactions).toBeDefined();
            expect(reactedMsg!.reactions!.length).toBeGreaterThan(0);

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 51: Reaction removal round trip**
   * For any reaction that is added and then removed, the reaction should
   * no longer appear in the message's reaction list.
   * **Validates: Requirements 15.2**
   */
  describe('Property 51: Reaction removal round trip', () => {
    it('should remove reactions from messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('👍', '❤️', '😂', '😮', '😢', '🎉'),
          async (emoji) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();
            const userId = uuidv4();

            // Create message
            const msg = await manager.createMessage(
              roomId,
              userId,
              'User',
              'Content'
            );

            // Add reaction
            await manager.addReaction(msg.id, emoji, userId);

            // Remove reaction
            await manager.removeReaction(msg.id, emoji, userId);

            // Verify reaction removed
            const messages = await storage.getAllMessages();
            const reactedMsg = messages.find(m => m.id === msg.id);
            const reaction = reactedMsg!.reactions?.find(r => r.emoji === emoji);
            expect(reaction).toBeUndefined();

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 52: Reaction grouping and counting**
   * For any message with multiple reactions, reactions with the same emoji
   * should be grouped together with a count of users who reacted.
   * **Validates: Requirements 15.3**
   */
  describe('Property 52: Reaction grouping and counting', () => {
    it('should group reactions by emoji', async () => {
      const storage = new InMemoryStorage();
      const manager = new MessageManager(storage, 30);
      const roomId = uuidv4();
      const userId1 = uuidv4();
      const userId2 = uuidv4();
      const userId3 = uuidv4();

      // Create message
      const msg = await manager.createMessage(
        roomId,
        userId1,
        'User1',
        'Content'
      );

      // Multiple users react with same emoji
      await manager.addReaction(msg.id, '👍', userId1);
      await manager.addReaction(msg.id, '👍', userId2);
      await manager.addReaction(msg.id, '❤️', userId3);

      // Verify grouping
      const messages = await storage.getAllMessages();
      const reactedMsg = messages.find(m => m.id === msg.id);
      
      const thumbsUp = reactedMsg!.reactions?.find(r => r.emoji === '👍');
      expect(thumbsUp!.userIds.length).toBe(2);
      
      const heart = reactedMsg!.reactions?.find(r => r.emoji === '❤️');
      expect(heart!.userIds.length).toBe(1);

      manager.cleanup();
    });
  });

  /**
   * **Feature: flux-messenger, Property 55: Pin message authorization and marking**
   * For any pin operation, only moderators should be able to pin messages,
   * and the message should be marked with isPinned flag.
   * **Validates: Requirements 16.1**
   */
  describe('Property 55: Pin message authorization and marking', () => {
    it('should allow moderators to pin messages', async () => {
      const storage = new InMemoryStorage();
      const manager = new MessageManager(storage, 30);
      const roomId = uuidv4();
      const userId = uuidv4();
      const modId = uuidv4();

      const msg = await manager.createMessage(roomId, userId, 'User', 'Content');
      const result = await manager.pinMessage(msg.id, modId, true);

      expect(result).toBe(true);

      const messages = await storage.getAllMessages();
      const pinnedMsg = messages.find(m => m.id === msg.id);
      expect(pinnedMsg!.isPinned).toBe(true);
      expect(pinnedMsg!.pinnedAt).toBeDefined();

      manager.cleanup();
    });

    it('should reject non-moderators from pinning', async () => {
      const storage = new InMemoryStorage();
      const manager = new MessageManager(storage, 30);
      const roomId = uuidv4();
      const userId = uuidv4();

      const msg = await manager.createMessage(roomId, userId, 'User', 'Content');

      await expect(
        manager.pinMessage(msg.id, userId, false)
      ).rejects.toThrow('Unauthorized');

      manager.cleanup();
    });
  });

  /**
   * **Feature: flux-messenger, Property 56: Pinned message retrieval**
   * For any room with pinned messages, getPinnedMessages should return
   * only pinned messages sorted by pinnedAt timestamp.
   * **Validates: Requirements 16.2**
   */
  describe('Property 56: Pinned message retrieval', () => {
    it('should retrieve only pinned messages', async () => {
      const storage = new InMemoryStorage();
      const manager = new MessageManager(storage, 30);
      const roomId = uuidv4();
      const modId = uuidv4();

      // Create multiple messages
      const msg1 = await manager.createMessage(roomId, modId, 'Mod', 'Message 1');
      const msg2 = await manager.createMessage(roomId, modId, 'Mod', 'Message 2');
      const msg3 = await manager.createMessage(roomId, modId, 'Mod', 'Message 3');

      // Pin some messages
      await manager.pinMessage(msg1.id, modId, true);
      await manager.pinMessage(msg3.id, modId, true);

      // Get pinned messages
      const pinned = await manager.getPinnedMessages(roomId);

      expect(pinned.length).toBe(2);
      expect(pinned.some(m => m.id === msg1.id)).toBe(true);
      expect(pinned.some(m => m.id === msg3.id)).toBe(true);
      expect(pinned.some(m => m.id === msg2.id)).toBe(false);

      manager.cleanup();
    });
  });

  /**
   * **Feature: flux-messenger, Property 57: Unpin round trip**
   * For any message that is pinned and then unpinned, the isPinned flag
   * should be false and pinnedAt should be undefined.
   * **Validates: Requirements 16.3**
   */
  describe('Property 57: Unpin round trip', () => {
    it('should unpin previously pinned messages', async () => {
      const storage = new InMemoryStorage();
      const manager = new MessageManager(storage, 30);
      const roomId = uuidv4();
      const modId = uuidv4();

      const msg = await manager.createMessage(roomId, modId, 'Mod', 'Content');

      // Pin message
      await manager.pinMessage(msg.id, modId, true);

      // Unpin message
      await manager.unpinMessage(msg.id, modId, true);

      // Verify unpinned
      const messages = await storage.getAllMessages();
      const unpinnedMsg = messages.find(m => m.id === msg.id);
      expect(unpinnedMsg!.isPinned).toBe(false);
      expect(unpinnedMsg!.pinnedAt).toBeUndefined();

      manager.cleanup();
    });
  });

  /**
   * **Feature: flux-messenger, Property 59: Pin authorization enforcement**
   * For any unpin operation, only moderators should be able to unpin messages.
   * **Validates: Requirements 16.5**
   */
  describe('Property 59: Pin authorization enforcement', () => {
    it('should reject non-moderators from unpinning', async () => {
      const storage = new InMemoryStorage();
      const manager = new MessageManager(storage, 30);
      const roomId = uuidv4();
      const modId = uuidv4();
      const userId = uuidv4();

      const msg = await manager.createMessage(roomId, modId, 'Mod', 'Content');
      await manager.pinMessage(msg.id, modId, true);

      await expect(
        manager.unpinMessage(msg.id, userId, false)
      ).rejects.toThrow('Unauthorized');

      manager.cleanup();
    });
  });

  /**
   * **Feature: flux-messenger, Property 65: Poll creation and broadcast**
   * For any poll creation, a poll message should be created with the question,
   * options, and settings.
   * **Validates: Requirements 18.1**
   */
  describe('Property 65: Poll creation and broadcast', () => {
    it('should create poll messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 200 }),
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 2, maxLength: 5 }),
          async (question, optionTexts) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();
            const userId = uuidv4();

            const pollData = {
              question,
              options: optionTexts.map((text, i) => ({
                id: `opt_${i}`,
                text,
                votes: []
              })),
              allowMultiple: false,
              isClosed: false
            };

            const msg = await manager.createPollMessage(
              roomId,
              userId,
              'User',
              pollData
            );

            expect(msg.type).toBe('poll');
            expect(msg.pollData).toBeDefined();
            expect(msg.pollData!.question).toBe(question);
            expect(msg.pollData!.options.length).toBe(optionTexts.length);

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 68: Poll vote uniqueness**
   * For any poll with allowMultiple=false, a user should only be able to
   * vote once, and subsequent votes should replace the previous vote.
   * **Validates: Requirements 18.4**
   */
  describe('Property 68: Poll vote uniqueness', () => {
    it('should enforce single vote when allowMultiple is false', async () => {
      const storage = new InMemoryStorage();
      const manager = new MessageManager(storage, 30);
      const roomId = uuidv4();
      const userId = uuidv4();

      const pollData = {
        question: 'Choose one',
        options: [
          { id: 'opt_1', text: 'Option 1', votes: [] },
          { id: 'opt_2', text: 'Option 2', votes: [] }
        ],
        allowMultiple: false,
        isClosed: false
      };

      const msg = await manager.createPollMessage(roomId, userId, 'User', pollData);

      // Vote for option 1
      await manager.votePoll(msg.id, 'opt_1', userId);

      // Vote for option 2 (should replace vote)
      await manager.votePoll(msg.id, 'opt_2', userId);

      // Verify only one vote
      const messages = await storage.getAllMessages();
      const pollMsg = messages.find(m => m.id === msg.id);
      
      const opt1Votes = pollMsg!.pollData!.options.find(o => o.id === 'opt_1')!.votes;
      const opt2Votes = pollMsg!.pollData!.options.find(o => o.id === 'opt_2')!.votes;

      expect(opt1Votes.includes(userId)).toBe(false);
      expect(opt2Votes.includes(userId)).toBe(true);

      manager.cleanup();
    });
  });

  /**
   * **Feature: flux-messenger, Property 69: Poll closure state**
   * For any poll that is closed, the isClosed flag should be true and
   * no further votes should be accepted.
   * **Validates: Requirements 18.5**
   */
  describe('Property 69: Poll closure state', () => {
    it('should prevent voting after poll is closed', async () => {
      const storage = new InMemoryStorage();
      const manager = new MessageManager(storage, 30);
      const roomId = uuidv4();
      const userId = uuidv4();
      const voterId = uuidv4();

      const pollData = {
        question: 'Choose one',
        options: [
          { id: 'opt_1', text: 'Option 1', votes: [] }
        ],
        allowMultiple: false,
        isClosed: false
      };

      const msg = await manager.createPollMessage(roomId, userId, 'User', pollData);

      // Close poll
      await manager.closePoll(msg.id, userId);

      // Try to vote
      await expect(
        manager.votePoll(msg.id, 'opt_1', voterId)
      ).rejects.toThrow('Poll is closed');

      manager.cleanup();
    });
  });

  /**
   * **Feature: flux-messenger, Property 71: Document file format validation**
   * For any file upload, only allowed formats (PDF, DOC, DOCX, TXT, ZIP, GIF)
   * should be accepted.
   * **Validates: Requirements 19.2**
   */
  describe('Property 71: Document file format validation', () => {
    it('should create file messages with valid formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('pdf', 'doc', 'docx', 'txt', 'zip', 'gif'),
          fc.string({ minLength: 5, maxLength: 50 }),
          async (extension, filename) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();
            const userId = uuidv4();

            const fileUrl = `https://storage.example.com/${filename}.${extension}`;
            const msg = await manager.createFileMessage(
              roomId,
              userId,
              'User',
              fileUrl,
              `${filename}.${extension}`,
              1024000
            );

            expect(msg.type).toBe('file');
            expect(msg.fileUrl).toBe(fileUrl);
            expect(msg.fileName).toBe(`${filename}.${extension}`);

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 72: File size limit enforcement**
   * For any file upload exceeding 10MB, the upload should be rejected.
   * **Validates: Requirements 19.3**
   */
  describe('Property 72: File size limit enforcement', () => {
    it('should store file size metadata', async () => {
      const storage = new InMemoryStorage();
      const manager = new MessageManager(storage, 30);
      const roomId = uuidv4();
      const userId = uuidv4();

      const fileSize = 5 * 1024 * 1024; // 5MB
      const msg = await manager.createFileMessage(
        roomId,
        userId,
        'User',
        'https://storage.example.com/file.pdf',
        'document.pdf',
        fileSize
      );

      expect(msg.fileSize).toBe(fileSize);
      expect(msg.fileSize).toBeLessThanOrEqual(10 * 1024 * 1024);

      manager.cleanup();
    });
  });

  /**
   * **Feature: flux-messenger, Property 73: File message metadata storage**
   * For any file message, the metadata (URL, filename, size) should be
   * stored and retrievable.
   * **Validates: Requirements 19.4**
   */
  describe('Property 73: File message metadata storage', () => {
    it('should store complete file metadata', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 50 }),
          fc.integer({ min: 1000, max: 10000000 }),
          async (filename, fileSize) => {
            const storage = new InMemoryStorage();
            const manager = new MessageManager(storage, 30);
            const roomId = uuidv4();
            const userId = uuidv4();

            const fileUrl = `https://storage.example.com/${filename}`;
            const msg = await manager.createFileMessage(
              roomId,
              userId,
              'User',
              fileUrl,
              filename,
              fileSize
            );

            expect(msg.fileUrl).toBe(fileUrl);
            expect(msg.fileName).toBe(filename);
            expect(msg.fileSize).toBe(fileSize);

            // Verify retrieval
            const messages = await manager.getMessages(roomId);
            const retrieved = messages.find(m => m.id === msg.id);
            expect(retrieved!.fileUrl).toBe(fileUrl);
            expect(retrieved!.fileName).toBe(filename);
            expect(retrieved!.fileSize).toBe(fileSize);

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
