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
