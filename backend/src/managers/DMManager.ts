import { Message } from '../models';
import { v4 as uuidv4 } from 'uuid';
import { IDMManager } from './IDMManager';

/**
 * DMManager handles direct messages between users
 */
export class DMManager implements IDMManager {
  private conversations: Map<string, Message[]> = new Map(); // conversationId -> messages
  private static AI_BOT_ID = '00000000-0000-0000-0000-000000000001';

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
    content: string,
    messageType: 'text' | 'image' | 'file' | 'voice' = 'text',
    fileUrl?: string,
    fileName?: string,
    fileSize?: number,
    imageUrl?: string
  ): Promise<Message> {
    const conversationId = this.getConversationId(fromUserId, toUserId);

    const message: Message = {
      id: uuidv4(),
      roomId: conversationId, // Use conversation ID as room ID
      senderId: fromUserId,
      senderNickname: fromUsername,
      content,
      type: messageType === 'text' ? 'normal' : messageType,
      timestamp: new Date(),
      expiresAt: null, // DMs don't expire
      fileUrl,
      fileName,
      fileSize,
      imageUrl,
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
    const baseMessages = this.conversations.get(conversationId) || [];

    // Include AI messages addressed to userId1 with context userId2
    const aiConversationId = this.getConversationId(DMManager.AI_BOT_ID, userId1);
    const aiMessages = (this.conversations.get(aiConversationId) || []).filter(msg => {
      const match = (msg.content || '').match(/^\[\[dmctx\|([^\]]+)\]\]\s*/);
      const ctxId = match ? match[1] : null;
      return msg.senderId === DMManager.AI_BOT_ID && ctxId === userId2;
    });

    return [...baseMessages, ...aiMessages].sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
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
   * Edit a DM (with 48-hour time limit)
   */
  async editDM(
    messageId: string,
    userId: string,
    newContent: string
  ): Promise<Message | null> {
    for (const messages of this.conversations.values()) {
      const message = messages.find(m => m.id === messageId);
      if (message) {
        // Check ownership
        if (message.senderId !== userId) {
          return null;
        }

        // Check 48-hour time limit
        const hoursSinceCreation = (Date.now() - message.timestamp.getTime()) / (1000 * 60 * 60);
        if (hoursSinceCreation > 48) {
          return null;
        }

        // Update message
        message.content = newContent;
        message.isEdited = true;
        message.editedAt = new Date();

        return message;
      }
    }
    return null;
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
