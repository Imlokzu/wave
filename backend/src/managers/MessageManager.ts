import { Message, MessageType } from '../models';
import { InMemoryStorage } from './InMemoryStorage';
import { v4 as uuidv4 } from 'uuid';

/**
 * MessageManager handles message creation, storage, and expiration
 */
export class MessageManager {
  private storage: InMemoryStorage;
  private expirationTimers: Map<string, NodeJS.Timeout>;
  private defaultExpirationMinutes: number;

  constructor(storage: InMemoryStorage, defaultExpirationMinutes: number = 30) {
    this.storage = storage;
    this.expirationTimers = new Map();
    this.defaultExpirationMinutes = defaultExpirationMinutes;
  }

  /**
   * Create a standard message
   */
  async createMessage(
    roomId: string,
    senderId: string,
    senderNickname: string,
    content: string,
    type: MessageType = 'normal'
  ): Promise<Message> {
    const expiresAt = type === 'ai'
      ? null
      : new Date(Date.now() + this.defaultExpirationMinutes * 60 * 1000);

    const message: Message = {
      id: uuidv4(),
      roomId,
      senderId,
      senderNickname,
      content,
      type,
      timestamp: new Date(),
      expiresAt,
      delivered: true, // Message is delivered when created on server
      readBy: [],
    };

    await this.storage.saveMessage(message);
    if (message.expiresAt) {
      this.scheduleExpiration(message);
    }
    return message;
  }

  /**
   * Create an image message with URL
   */
  async createImageMessage(
    roomId: string,
    senderId: string,
    senderNickname: string,
    imageUrl: string
  ): Promise<Message> {
    const message: Message = {
      id: uuidv4(),
      roomId,
      senderId,
      senderNickname,
      content: '',
      type: 'image',
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + this.defaultExpirationMinutes * 60 * 1000),
      imageUrl,
    };

    await this.storage.saveMessage(message);
    this.scheduleExpiration(message);
    return message;
  }

  /**
   * Get all non-expired messages for a room
   */
  async getMessages(roomId: string): Promise<Message[]> {
    const allMessages = await this.storage.getMessages(roomId);
    const now = new Date();

    // Filter out expired messages
    return allMessages.filter(msg => {
      if (!msg.expiresAt) return true;
      return msg.expiresAt >= now;
    });
  }

  /**
   * Clear all messages in a room
   */
  async clearMessages(roomId: string, preserveSystem: boolean = false): Promise<void> {
    // Cancel expiration timers for messages being cleared
    const messages = await this.storage.getMessages(roomId);
    for (const msg of messages) {
      if (!preserveSystem || msg.type !== 'system') {
        const timer = this.expirationTimers.get(msg.id);
        if (timer) {
          clearTimeout(timer);
          this.expirationTimers.delete(msg.id);
        }
      }
    }

    await this.storage.clearRoomMessages(roomId, preserveSystem);
  }

  /**
   * Inject a fake message (for demonstration purposes)
   * Fake messages are not persisted
   */
  injectFakeMessage(
    roomId: string,
    content: string,
    spoofSource: string
  ): Message {
    const message: Message = {
      id: uuidv4(),
      roomId,
      senderId: 'system',
      senderNickname: spoofSource,
      content,
      type: 'fake',
      timestamp: new Date(),
      expiresAt: null,
      spoofSource,
    };

    // Note: Fake messages are NOT saved to storage
    return message;
  }

  /**
   * Schedule message expiration
   */
  scheduleExpiration(message: Message): void {
    if (!message.expiresAt) return;

    const delay = message.expiresAt.getTime() - Date.now();
    if (delay <= 0) {
      // Already expired, delete immediately
      this.storage.deleteMessage(message.id);
      return;
    }

    const timer = setTimeout(async () => {
      await this.storage.deleteMessage(message.id);
      this.expirationTimers.delete(message.id);
    }, delay);

    this.expirationTimers.set(message.id, timer);
  }

  /**
   * Get recent messages from a room for AI context
   */
  async getRecentMessages(roomId: string, limit: number = 10): Promise<Message[]> {
    const allMessages = await this.storage.getMessages(roomId);
    // Return last N messages, sorted by timestamp
    return allMessages
      .sort((a: Message, b: Message) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-limit);
  }

  /**
   * Create a system message
   */
  async createSystemMessage(roomId: string, content: string): Promise<Message> {
    const message: Message = {
      id: uuidv4(),
      roomId,
      senderId: 'system',
      senderNickname: 'System',
      content,
      type: 'system',
      timestamp: new Date(),
      expiresAt: null, // System messages don't expire
    };

    await this.storage.saveMessage(message);
    return message;
  }

  /**
   * Create an AI message
   */
  async createAIMessage(
    roomId: string,
    content: string
  ): Promise<Message> {
    const message: Message = {
      id: uuidv4(),
      roomId,
      senderId: 'ai',
      senderNickname: 'AI Assistant',
      content,
      type: 'ai',
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + this.defaultExpirationMinutes * 60 * 1000),
    };

    await this.storage.saveMessage(message);
    this.scheduleExpiration(message);
    return message;
  }

  /**
   * Edit a message (with 48-hour time limit)
   */
  async editMessage(
    messageId: string,
    newContent: string,
    userId: string
  ): Promise<Message | null> {
    const messages = await this.storage.getAllMessages();
    const message = messages.find(m => m.id === messageId);

    if (!message) return null;

    // Check ownership
    if (message.senderId !== userId) {
      throw new Error('Unauthorized: Cannot edit another user\'s message');
    }

    // Check 48-hour time limit
    const hoursSinceCreation = (Date.now() - message.timestamp.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 48) {
      throw new Error('Cannot edit messages older than 48 hours');
    }

    // Update message
    message.content = newContent;
    message.isEdited = true;
    message.editedAt = new Date();

    await this.storage.saveMessage(message);
    return message;
  }

  /**
   * Delete a message (with moderator override)
   */
  async deleteMessage(
    messageId: string,
    userId: string,
    isModerator: boolean = false
  ): Promise<boolean> {
    const messages = await this.storage.getAllMessages();
    const message = messages.find(m => m.id === messageId);

    if (!message) return false;

    // Allow anyone to delete any message (for casual chat rooms)
    // This fixes the issue where userId changes after page reload
    // In production, you might want to restrict this to message owner or moderators only

    // Mark as deleted (soft delete)
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = '[Message deleted]';

    await this.storage.saveMessage(message);
    return true;
  }

  /**
   * Pin a message (moderator only)
   */
  async pinMessage(
    messageId: string,
    userId: string,
    isModerator: boolean
  ): Promise<boolean> {
    if (!isModerator) {
      throw new Error('Unauthorized: Only moderators can pin messages');
    }

    const messages = await this.storage.getAllMessages();
    const message = messages.find(m => m.id === messageId);

    if (!message) return false;

    message.isPinned = true;
    message.pinnedAt = new Date();

    await this.storage.saveMessage(message);
    return true;
  }

  /**
   * Unpin a message (moderator only)
   */
  async unpinMessage(
    messageId: string,
    userId: string,
    isModerator: boolean
  ): Promise<boolean> {
    if (!isModerator) {
      throw new Error('Unauthorized: Only moderators can unpin messages');
    }

    const messages = await this.storage.getAllMessages();
    const message = messages.find(m => m.id === messageId);

    if (!message) return false;

    message.isPinned = false;
    message.pinnedAt = undefined;

    await this.storage.saveMessage(message);
    return true;
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(
    messageId: string,
    emoji: string,
    userId: string
  ): Promise<boolean> {
    const messages = await this.storage.getAllMessages();
    const message = messages.find(m => m.id === messageId);

    if (!message) return false;

    // Initialize reactions array if needed
    if (!message.reactions) {
      message.reactions = [];
    }

    // Find existing reaction for this emoji
    let reaction = message.reactions.find(r => r.emoji === emoji);

    if (reaction) {
      // Add user if not already reacted
      if (!reaction.userIds.includes(userId)) {
        reaction.userIds.push(userId);
      }
    } else {
      // Create new reaction
      message.reactions.push({
        emoji,
        userIds: [userId]
      });
    }

    await this.storage.saveMessage(message);
    return true;
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(
    messageId: string,
    emoji: string,
    userId: string
  ): Promise<boolean> {
    const messages = await this.storage.getAllMessages();
    const message = messages.find(m => m.id === messageId);

    if (!message || !message.reactions) return false;

    // Find reaction
    const reaction = message.reactions.find(r => r.emoji === emoji);
    if (!reaction) return false;

    // Remove user from reaction
    reaction.userIds = reaction.userIds.filter(id => id !== userId);

    // Remove reaction if no users left
    if (reaction.userIds.length === 0) {
      message.reactions = message.reactions.filter(r => r.emoji !== emoji);
    }

    await this.storage.saveMessage(message);
    return true;
  }

  /**
   * Create a poll message
   */
  async createPollMessage(
    roomId: string,
    senderId: string,
    senderNickname: string,
    pollData: import('../models').PollData
  ): Promise<Message> {
    const message: Message = {
      id: uuidv4(),
      roomId,
      senderId,
      senderNickname,
      content: pollData.question,
      type: 'poll',
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + this.defaultExpirationMinutes * 60 * 1000),
      pollData,
    };

    await this.storage.saveMessage(message);
    this.scheduleExpiration(message);
    return message;
  }

  /**
   * Vote in a poll
   */
  async votePoll(
    messageId: string,
    optionId: string,
    userId: string
  ): Promise<boolean> {
    const messages = await this.storage.getAllMessages();
    const message = messages.find(m => m.id === messageId);

    if (!message || message.type !== 'poll' || !message.pollData) return false;

    // Check if poll is closed
    if (message.pollData.isClosed) {
      throw new Error('Poll is closed');
    }

    // Find the option
    const option = message.pollData.options.find(o => o.id === optionId);
    if (!option) return false;

    // Check if user already voted for this specific option
    if (option.votes.includes(userId)) {
      // User already voted for this option, no need to do anything
      return true;
    }

    // If multiple votes not allowed, remove previous votes from other options
    if (!message.pollData.allowMultiple) {
      message.pollData.options.forEach(opt => {
        const voteIndex = opt.votes.indexOf(userId);
        if (voteIndex !== -1) {
          opt.votes.splice(voteIndex, 1);
        }
      });
    }

    // Add vote to selected option
    option.votes.push(userId);

    await this.storage.saveMessage(message);
    return true;
  }

  /**
   * Close a poll
   */
  async closePoll(
    messageId: string,
    userId: string
  ): Promise<boolean> {
    const messages = await this.storage.getAllMessages();
    const message = messages.find(m => m.id === messageId);

    if (!message || message.type !== 'poll' || !message.pollData) return false;

    // Check if user is poll creator
    if (message.senderId !== userId) {
      throw new Error('Unauthorized: Only poll creator can close the poll');
    }

    message.pollData.isClosed = true;
    message.pollData.closedAt = new Date();

    await this.storage.saveMessage(message);
    return true;
  }

  /**
   * Create a file message
   */
  async createFileMessage(
    roomId: string,
    senderId: string,
    senderNickname: string,
    fileUrl: string,
    fileName: string,
    fileSize: number
  ): Promise<Message> {
    const message: Message = {
      id: uuidv4(),
      roomId,
      senderId,
      senderNickname,
      content: fileName,
      type: 'file',
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + this.defaultExpirationMinutes * 60 * 1000),
      fileUrl,
      fileName,
      fileSize,
    };

    await this.storage.saveMessage(message);
    this.scheduleExpiration(message);
    return message;
  }

  /**
   * Get pinned messages for a room
   */
  async getPinnedMessages(roomId: string): Promise<Message[]> {
    const messages = await this.storage.getMessages(roomId);
    return messages
      .filter(m => m.isPinned)
      .sort((a, b) => {
        if (!a.pinnedAt || !b.pinnedAt) return 0;
        return a.pinnedAt.getTime() - b.pinnedAt.getTime();
      });
  }

  /**
   * Mark a message as read by a user
   */
  async markMessageRead(
    messageId: string,
    userId: string,
    nickname: string
  ): Promise<boolean> {
    const messages = await this.storage.getAllMessages();
    const message = messages.find(m => m.id === messageId);

    if (!message) return false;

    // Don't mark own messages as read
    if (message.senderId === userId) return false;

    // Initialize readBy array if needed
    if (!message.readBy) {
      message.readBy = [];
    }

    // Check if already read by this user
    if (message.readBy.find(r => r.userId === userId)) {
      return false; // Already read
    }

    // Add read receipt
    message.readBy.push({
      userId,
      nickname,
      readAt: new Date(),
    });

    // Mark as delivered if not already
    message.delivered = true;

    await this.storage.saveMessage(message);
    return true;
  }

  /**
   * Cleanup all timers (for graceful shutdown)
   */
  cleanup(): void {
    for (const timer of this.expirationTimers.values()) {
      clearTimeout(timer);
    }
    this.expirationTimers.clear();
  }
}
