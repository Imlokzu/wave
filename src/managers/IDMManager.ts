import { Message } from '../models';

/**
 * Interface for direct message management
 */
export interface IDMManager {
  sendDM(
    fromUserId: string,
    fromUsername: string,
    toUserId: string,
    content: string
  ): Promise<Message>;
  getDMHistory(userId1: string, userId2: string): Promise<Message[]>;
  getUserConversations(userId: string): Promise<string[]>;
  deleteDM(messageId: string, userId: string): Promise<boolean>;
  markDMRead(messageId: string, userId: string, nickname: string): Promise<any[] | null>;
}
