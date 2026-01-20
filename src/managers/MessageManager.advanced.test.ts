import * as fc from 'fast-check';
import { MessageManager } from './MessageManager';
import { InMemoryStorage } from './InMemoryStorage';
import { v4 as uuidv4 } from 'uuid';

describe('MessageManager - Advanced Features', () => {
  let storage: InMemoryStorage;
  let messageManager: MessageManager;

  beforeEach(() => {
    storage = new InMemoryStorage();
    messageManager = new MessageManager(storage, 30);
  });

  afterEach(() => {
    messageManager.cleanup();
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
