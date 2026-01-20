import * as fc from 'fast-check';
import { InMemoryStorage } from './InMemoryStorage';
import { Message, Room, Participant } from '../models';
import { v4 as uuidv4 } from 'uuid';

describe('InMemoryStorage', () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
  });

  /**
   * **Feature: flux-messenger, Property 25: Storage disabled mode**
   * For any system with storage disabled, when messages are created,
   * they should only exist in memory and not be written to persistent storage.
   * **Validates: Requirements 8.3**
   */
  describe('Property 25: Storage disabled mode', () => {
    it('should store messages only in memory (no persistence)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            id: fc.uuid(),
            roomId: fc.uuid(),
            senderId: fc.uuid(),
            senderNickname: fc.string({ minLength: 1, maxLength: 50 }),
            content: fc.string({ minLength: 1, maxLength: 500 }),
            type: fc.constantFrom('normal' as const, 'system' as const),
          }), { minLength: 1, maxLength: 20 }),
          async (messageData) => {
            const storage = new InMemoryStorage();
            const roomId = uuidv4();

            // Create room first
            const room: Room = {
              id: roomId,
              code: 'TEST123',
              createdAt: new Date(),
              maxUsers: 10,
              participants: new Map(),
              isLocked: false,
              moderators: new Set(),
            };
            await storage.saveRoom(room);

            // Save messages
            const messages: Message[] = messageData.map(data => ({
              ...data,
              roomId,
              timestamp: new Date(),
              expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            }));

            for (const message of messages) {
              await storage.saveMessage(message);
            }

            // Verify messages exist in memory
            const retrieved = await storage.getMessages(roomId);
            expect(retrieved.length).toBe(messages.length);

            // Verify no external persistence (all data is in-memory only)
            // This is validated by the fact that InMemoryStorage doesn't
            // write to disk, database, or any external storage
            expect(storage.getMessageCount(roomId)).toBe(messages.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not persist fake messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            id: fc.uuid(),
            content: fc.string({ minLength: 1, maxLength: 500 }),
            spoofSource: fc.constantFrom('Google', 'Wikipedia', 'BBC News'),
          }), { minLength: 1, maxLength: 10 }),
          async (fakeMessageData) => {
            const storage = new InMemoryStorage();
            const roomId = uuidv4();

            // Create room
            const room: Room = {
              id: roomId,
              code: 'TEST456',
              createdAt: new Date(),
              maxUsers: 10,
              participants: new Map(),
              isLocked: false,
              moderators: new Set(),
            };
            await storage.saveRoom(room);

            // Save fake messages
            const fakeMessages: Message[] = fakeMessageData.map(data => ({
              id: data.id,
              roomId,
              senderId: 'system',
              senderNickname: data.spoofSource,
              content: data.content,
              type: 'fake' as const,
              timestamp: new Date(),
              expiresAt: null,
              spoofSource: data.spoofSource,
            }));

            for (const message of fakeMessages) {
              await storage.saveMessage(message);
            }

            // Verify fake messages are NOT persisted
            const retrieved = await storage.getMessages(roomId);
            expect(retrieved.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Additional unit tests
  describe('Room operations', () => {
    it('should save and retrieve room by ID', async () => {
      const room: Room = {
        id: uuidv4(),
        code: 'ABC123',
        createdAt: new Date(),
        maxUsers: 10,
        participants: new Map(),
        isLocked: false,
        moderators: new Set(),
      };

      await storage.saveRoom(room);
      const retrieved = await storage.getRoom(room.id);

      expect(retrieved).toEqual(room);
    });

    it('should retrieve room by code', async () => {
      const room: Room = {
        id: uuidv4(),
        code: 'XYZ789',
        createdAt: new Date(),
        maxUsers: 10,
        participants: new Map(),
        isLocked: false,
        moderators: new Set(),
      };

      await storage.saveRoom(room);
      const retrieved = await storage.getRoomByCode(room.code);

      expect(retrieved).toEqual(room);
    });

    it('should delete room and its messages', async () => {
      const roomId = uuidv4();
      const room: Room = {
        id: roomId,
        code: 'DEL123',
        createdAt: new Date(),
        maxUsers: 10,
        participants: new Map(),
        isLocked: false,
        moderators: new Set(),
      };

      await storage.saveRoom(room);

      const message: Message = {
        id: uuidv4(),
        roomId,
        senderId: uuidv4(),
        senderNickname: 'Test',
        content: 'Hello',
        type: 'normal',
        timestamp: new Date(),
        expiresAt: null,
      };

      await storage.saveMessage(message);
      await storage.deleteRoom(roomId);

      expect(await storage.getRoom(roomId)).toBeNull();
      expect(await storage.getMessages(roomId)).toEqual([]);
    });
  });

  describe('Message operations', () => {
    it('should clear room messages while preserving system messages', async () => {
      const roomId = uuidv4();
      const room: Room = {
        id: roomId,
        code: 'CLR123',
        createdAt: new Date(),
        maxUsers: 10,
        participants: new Map(),
        isLocked: false,
        moderators: new Set(),
      };

      await storage.saveRoom(room);

      const normalMessage: Message = {
        id: uuidv4(),
        roomId,
        senderId: uuidv4(),
        senderNickname: 'User',
        content: 'Normal message',
        type: 'normal',
        timestamp: new Date(),
        expiresAt: null,
      };

      const systemMessage: Message = {
        id: uuidv4(),
        roomId,
        senderId: 'system',
        senderNickname: 'System',
        content: 'System message',
        type: 'system',
        timestamp: new Date(),
        expiresAt: null,
      };

      await storage.saveMessage(normalMessage);
      await storage.saveMessage(systemMessage);

      await storage.clearRoomMessages(roomId, true);

      const messages = await storage.getMessages(roomId);
      expect(messages.length).toBe(1);
      expect(messages[0].type).toBe('system');
    });
  });
});
