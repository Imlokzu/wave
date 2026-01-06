import { Message } from '../models';
import { v4 as uuidv4 } from 'uuid';
import { IDMManager } from './IDMManager';

/**
 * DMManager handles direct messages between users
 */
export class DMManager implements IDMManager {
  private conversations: Map<string, Message[]> = new Map(); // conversationId -> messages

  /**
   * Get conversation ID for two users (sorted to ensure consistency)
   */
  private getConversationId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_');
  }

  /**
   * Send a direct message
   */
  async sendDM(
    fromUserId: string,
    fromUsername: string,
    toUserId: string,
    content: string
  ): Promise<Message> {
    const conversationId = this.getConversationId(fromUserId, toUserId);

    const message: Message = {
      id: uuidv4(),
      roomId: conversationId, // Use conversation ID as room ID
      senderId: fromUserId,
      senderNickname: fromUsername,
      content,
      type: 'normal',
      timestamp: new Date(),
      expiresAt: null, // DMs don't expire
    };

    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, []);
    }

    this.conversations.get(conversationId)!.push(message);

    return message;
  }

  /**
   * Get DM history between two users
   */
  async getDMHistory(userId1: string, userId2: string): Promise<Message[]> {
    const conversationId = this.getConversationId(userId1, userId2);
    return this.conversations.get(conversationId) || [];
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string): Promise<string[]> {
    const conversations: string[] = [];

    for (const [conversationId] of this.conversations) {
      if (conversationId.includes(userId)) {
        conversations.push(conversationId);
      }
    }

    return conversations;
  }

  /**
   * Delete a DM
   */
  async deleteDM(messageId: string, userId: string): Promise<boolean> {
    for (const messages of this.conversations.values()) {
      const messageIndex = messages.findIndex(m => m.id === messageId);
      if (messageIndex !== -1) {
        const message = messages[messageIndex];
        if (message.senderId === userId) {
          message.isDeleted = true;
          message.deletedAt = new Date();
          message.content = '[Message deleted]';
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Mark a DM as read by a user
   * Returns the updated readBy array (or null if failed)
   */
  async markDMRead(
    messageId: string,
    userId: string,
    nickname: string
  ): Promise<any[] | null> {
    for (const messages of this.conversations.values()) {
      const message = messages.find(m => m.id === messageId);
      if (message) {
        // Don't mark own messages as read
        if (message.senderId === userId) {
          return null;
        }

        // Initialize readBy array if needed
        if (!message.readBy) {
          message.readBy = [];
        }

        // Check if already read by this user
        const alreadyRead = message.readBy.find(r => r.userId === userId);
        if (alreadyRead) {
          return message.readBy; // Return existing readBy array
        }

        // Add read receipt
        message.readBy.push({
          userId,
          nickname,
          readAt: new Date(),
        });

        return message.readBy;
      }
    }
    return null;
  }
}
