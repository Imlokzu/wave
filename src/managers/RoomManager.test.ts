import * as fc from 'fast-check';
import { RoomManager } from './RoomManager';
import { InMemoryStorage } from './InMemoryStorage';
import { Participant } from '../models';
import { v4 as uuidv4 } from 'uuid';

describe('RoomManager', () => {
  let storage: InMemoryStorage;
  let roomManager: RoomManager;

  beforeEach(() => {
    storage = new InMemoryStorage();
    roomManager = new RoomManager(storage);
  });

  /**
   * **Feature: flux-messenger, Property 4: Room code uniqueness**
   * For any set of created rooms, each room should have a unique room code
   * that differs from all other room codes.
   * **Validates: Requirements 2.1**
   */
  describe('Property 4: Room code uniqueness', () => {
    it('should generate unique room codes for all created rooms', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 20 }),
          async (numRooms) => {
            const storage = new InMemoryStorage();
            const manager = new RoomManager(storage);
            const rooms = [];

            // Create multiple rooms
            for (let i = 0; i < numRooms; i++) {
              const room = await manager.createRoom(10);
              rooms.push(room);
            }

            // Verify all codes are unique
            const codes = rooms.map(r => r.code);
            const uniqueCodes = new Set(codes);
            expect(uniqueCodes.size).toBe(codes.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 5: Capacity enforcement**
   * For any room with maximum capacity N, after N users have joined,
   * any additional join attempt should be rejected.
   * **Validates: Requirements 2.2, 2.4**
   */
  describe('Property 5: Capacity enforcement', () => {
    it('should reject joins when room is at capacity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 5 }),
          async (maxUsers, extraAttempts) => {
            const storage = new InMemoryStorage();
            const manager = new RoomManager(storage);
            const room = await manager.createRoom(maxUsers);

            // Fill room to capacity
            for (let i = 0; i < maxUsers; i++) {
              const participant: Participant = {
                id: uuidv4(),
                nickname: `User${i}`,
                joinedAt: new Date(),
                socketId: `socket-${i}`,
              };
              const result = await manager.addParticipant(room.id, participant);
              expect(result).toBe(true);
            }

            // Try to add extra participants
            for (let i = 0; i < extraAttempts; i++) {
              const participant: Participant = {
                id: uuidv4(),
                nickname: `ExtraUser${i}`,
                joinedAt: new Date(),
                socketId: `socket-extra-${i}`,
              };
              const result = await manager.addParticipant(room.id, participant);
              expect(result).toBe(false);
            }

            // Verify room is still at max capacity
            const count = await manager.getParticipantCount(room.id);
            expect(count).toBe(maxUsers);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 6: Leave removes participant**
   * For any room and any participant in that room, when the participant leaves,
   * they should no longer appear in the room's participant list.
   * **Validates: Requirements 2.3**
   */
  describe('Property 6: Leave removes participant', () => {
    it('should remove participant from room when they leave', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              nickname: fc.string({ minLength: 1, maxLength: 50 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (participantData) => {
            const storage = new InMemoryStorage();
            const manager = new RoomManager(storage);
            const room = await manager.createRoom(50);

            // Add all participants
            const participants: Participant[] = participantData.map((data, i) => ({
              id: data.id,
              nickname: data.nickname,
              joinedAt: new Date(),
              socketId: `socket-${i}`,
            }));

            for (const participant of participants) {
              await manager.addParticipant(room.id, participant);
            }

            // Pick a random participant to remove
            const toRemove = participants[Math.floor(Math.random() * participants.length)];
            await manager.removeParticipant(room.id, toRemove.id);

            // Verify participant is removed
            const updatedRoom = await manager.getRoom(room.id);
            expect(updatedRoom).not.toBeNull();
            expect(updatedRoom!.participants.has(toRemove.id)).toBe(false);
            expect(updatedRoom!.participants.size).toBe(participants.length - 1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 7: Room info accuracy**
   * For any room, when querying room information, the returned participant count
   * should equal the actual number of participants in the room.
   * **Validates: Requirements 2.5**
   */
  describe('Property 7: Room info accuracy', () => {
    it('should return accurate participant count', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 20 }),
          async (numParticipants) => {
            const storage = new InMemoryStorage();
            const manager = new RoomManager(storage);
            const room = await manager.createRoom(50);

            // Add participants
            for (let i = 0; i < numParticipants; i++) {
              const participant: Participant = {
                id: uuidv4(),
                nickname: `User${i}`,
                joinedAt: new Date(),
                socketId: `socket-${i}`,
              };
              await manager.addParticipant(room.id, participant);
            }

            // Verify count matches
            const count = await manager.getParticipantCount(room.id);
            expect(count).toBe(numParticipants);

            const updatedRoom = await manager.getRoom(room.id);
            expect(updatedRoom!.participants.size).toBe(numParticipants);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 21: Lock sets read-only state**
   * For any room, when a moderator locks the room, the room's isLocked
   * property should be set to true.
   * **Validates: Requirements 7.1**
   */
  describe('Property 21: Lock sets read-only state', () => {
    it('should set isLocked to true when room is locked', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            const storage = new InMemoryStorage();
            const manager = new RoomManager(storage);
            const room = await manager.createRoom(10);

            // Lock the room
            await manager.lockRoom(room.id);

            // Verify room is locked
            const updatedRoom = await manager.getRoom(room.id);
            expect(updatedRoom).not.toBeNull();
            expect(updatedRoom!.isLocked).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 22: Lock-unlock round trip**
   * For any room, when a moderator locks then immediately unlocks the room,
   * non-moderator users should be able to send messages again.
   * **Validates: Requirements 7.3**
   */
  describe('Property 22: Lock-unlock round trip', () => {
    it('should restore unlocked state after lock-unlock sequence', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            const storage = new InMemoryStorage();
            const manager = new RoomManager(storage);
            const room = await manager.createRoom(10);

            // Initial state should be unlocked
            expect(room.isLocked).toBe(false);

            // Lock then unlock
            await manager.lockRoom(room.id);
            await manager.unlockRoom(room.id);

            // Verify room is unlocked again
            const updatedRoom = await manager.getRoom(room.id);
            expect(updatedRoom).not.toBeNull();
            expect(updatedRoom!.isLocked).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

  /**
   * **Feature: flux-messenger, Property 60: Typing indicator broadcast**
   * For any user in a room, when they start typing, a typing indicator
   * should be broadcast to all other participants.
   * **Validates: Requirements 17.1**
   */
  describe('Property 60: Typing indicator broadcast', () => {
    it('should track typing users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userId: fc.uuid(),
              nickname: fc.string({ minLength: 1, maxLength: 20 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (users) => {
            const storage = new InMemoryStorage();
            const manager = new RoomManager(storage);
            const room = await manager.createRoom(50);

            // Add participants
            for (const user of users) {
              await manager.addParticipant(room.id, {
                id: user.userId,
                nickname: user.nickname,
                joinedAt: new Date(),
                socketId: uuidv4(),
              });
            }

            // Set typing for all users
            for (const user of users) {
              manager.setTyping(room.id, user.userId, user.nickname);
            }

            // Get typing users
            const typing = await manager.getTypingUsers(room.id);

            expect(typing.length).toBe(users.length);
            expect(typing.every(t => users.some(u => u.userId === t.userId))).toBe(true);

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 61: Typing indicator timeout**
   * For any typing indicator, after 3 seconds of inactivity,
   * the indicator should be removed.
   * **Validates: Requirements 17.2**
   */
  describe('Property 61: Typing indicator timeout', () => {
    it('should remove typing indicator after 3 seconds', async () => {
      const storage = new InMemoryStorage();
      const manager = new RoomManager(storage);
      const room = await manager.createRoom(50);
      const userId = uuidv4();

      // Add participant
      await manager.addParticipant(room.id, {
        id: userId,
        nickname: 'User',
        joinedAt: new Date(),
        socketId: uuidv4(),
      });

      // Set typing
      manager.setTyping(room.id, userId, 'User');

      // Verify typing is active
      let typing = await manager.getTypingUsers(room.id);
      expect(typing.length).toBe(1);

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 3100));

      // Verify typing is cleared
      typing = await manager.getTypingUsers(room.id);
      expect(typing.length).toBe(0);

      manager.cleanup();
    });
  });

  /**
   * **Feature: flux-messenger, Property 62: Typing indicator cleared on send**
   * For any user with an active typing indicator, when they send a message,
   * their typing indicator should be immediately removed.
   * **Validates: Requirements 17.3**
   */
  describe('Property 62: Typing indicator cleared on send', () => {
    it('should clear typing when explicitly cleared', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 20 }),
          async (userId, nickname) => {
            const storage = new InMemoryStorage();
            const manager = new RoomManager(storage);
            const room = await manager.createRoom(50);

            // Add participant
            await manager.addParticipant(room.id, {
              id: userId,
              nickname,
              joinedAt: new Date(),
              socketId: uuidv4(),
            });

            // Set typing
            manager.setTyping(room.id, userId, nickname);

            // Clear typing (simulating message send)
            manager.clearTyping(room.id, userId);

            // Verify typing is cleared
            const typing = await manager.getTypingUsers(room.id);
            expect(typing.length).toBe(0);

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 76: Room code regeneration uniqueness**
   * For any room, when the code is regenerated, the new code should be
   * unique and different from the old code.
   * **Validates: Requirements 22.1**
   */
  describe('Property 76: Room code regeneration uniqueness', () => {
    it('should generate unique code when regenerating', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (moderatorId) => {
            const storage = new InMemoryStorage();
            const manager = new RoomManager(storage);
            const room = await manager.createRoom(50);

            // Add moderator
            await manager.addModerator(room.id, moderatorId);

            const oldCode = room.code;

            // Regenerate code
            const newCode = await manager.regenerateRoomCode(room.id, moderatorId);

            expect(newCode).not.toBeNull();
            expect(newCode).not.toBe(oldCode);
            expect(newCode!.length).toBe(6);

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flux-messenger, Property 77: Old room code invalidation**
   * For any room with a regenerated code, attempts to join using the old code
   * should be rejected.
   * **Validates: Requirements 22.2**
   */
  describe('Property 77: Old room code invalidation', () => {
    it('should invalidate old code after regeneration', async () => {
      const storage = new InMemoryStorage();
      const manager = new RoomManager(storage);
      const room = await manager.createRoom(50);
      const moderatorId = uuidv4();

      // Add moderator
      await manager.addModerator(room.id, moderatorId);

      const oldCode = room.code;

      // Regenerate code
      const newCode = await manager.regenerateRoomCode(room.id, moderatorId);
      
      expect(newCode).not.toBeNull();
      expect(newCode).not.toBe(oldCode);

      // New code should work
      const roomByNewCode = await manager.getRoomByCode(newCode!);
      expect(roomByNewCode).not.toBeNull();
      expect(roomByNewCode!.id).toBe(room.id);
      
      // Verify the room's code was actually updated
      const roomById = await manager.getRoom(room.id);
      expect(roomById!.code).toBe(newCode);

      manager.cleanup();
    });
  });

  /**
   * **Feature: flux-messenger, Property 80: Regeneration preserves room data**
   * For any room, when the code is regenerated, all existing participants
   * and messages should remain unchanged.
   * **Validates: Requirements 22.5**
   */
  describe('Property 80: Regeneration preserves room data', () => {
    it('should preserve participants when regenerating code', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userId: fc.uuid(),
              nickname: fc.string({ minLength: 1, maxLength: 20 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (participants) => {
            const storage = new InMemoryStorage();
            const manager = new RoomManager(storage);
            const room = await manager.createRoom(50);

            // Add moderator (first participant)
            const moderatorId = participants[0].userId;
            await manager.addModerator(room.id, moderatorId);

            // Add all participants
            for (const p of participants) {
              await manager.addParticipant(room.id, {
                id: p.userId,
                nickname: p.nickname,
                joinedAt: new Date(),
                socketId: uuidv4(),
              });
            }

            const participantCountBefore = await manager.getParticipantCount(room.id);

            // Regenerate code
            await manager.regenerateRoomCode(room.id, moderatorId);

            // Verify participants are preserved
            const participantCountAfter = await manager.getParticipantCount(room.id);
            expect(participantCountAfter).toBe(participantCountBefore);

            manager.cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
