import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Message } from '../models';
import { IDMManager } from './IDMManager';

/**
 * SupabaseDMManager handles direct messages with Supabase
 */
export class SupabaseDMManager implements IDMManager {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Helper to delete file from Supabase storage
   */
  private async deleteFileFromStorage(fileUrl: string, bucket: string = 'images'): Promise<void> {
    try {
      // Extract filename from URL
      const filename = fileUrl.split('/').pop();
      if (!filename) return;

      const { error } = await this.supabase.storage
        .from(bucket)
        .remove([filename]);

      if (error) {
        console.error('Error deleting file from storage:', error);
      } else {
        console.log('✅ File deleted from storage:', filename);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
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
    try {
      const { data, error } = await this.supabase
        .from('direct_messages')
        .insert({
          from_user_id: fromUserId,
          to_user_id: toUserId,
          content,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Convert to Message format
      const conversationId = this.getConversationId(fromUserId, toUserId);

      return {
        id: data.id,
        roomId: conversationId,
        senderId: fromUserId,
        senderNickname: fromUsername,
        content: data.content,
        type: 'normal',
        timestamp: new Date(data.created_at),
        expiresAt: null,
        isDeleted: data.is_deleted,
        deletedAt: data.deleted_at ? new Date(data.deleted_at) : undefined,
      };
    } catch (error) {
      console.error('Error sending DM:', error);
      throw error;
    }
  }

  /**
   * Get DM history between two users
   */
  async getDMHistory(userId1: string, userId2: string): Promise<Message[]> {
    try {
      const { data, error } = await this.supabase
        .from('direct_messages')
        .select('*, from_user:flux_users!from_user_id(username, nickname), read_by')
        .or(`and(from_user_id.eq.${userId1},to_user_id.eq.${userId2}),and(from_user_id.eq.${userId2},to_user_id.eq.${userId1})`)
        .order('created_at', { ascending: true });

      if (error || !data) {
        console.error('[SupabaseDMManager] Error fetching DM history:', error);
        return [];
      }

      const conversationId = this.getConversationId(userId1, userId2);

      return data.map(dm => ({
        id: dm.id,
        roomId: conversationId,
        senderId: dm.from_user_id,
        senderNickname: (dm.from_user as any)?.username || 'Unknown',
        content: dm.content,
        type: 'normal' as const,
        timestamp: new Date(dm.created_at),
        expiresAt: null,
        isDeleted: dm.is_deleted,
        deletedAt: dm.deleted_at ? new Date(dm.deleted_at) : undefined,
        delivered: true,
        readBy: (dm.read_by || []).map((r: any) => ({
          id: r.userId,
          nickname: r.nickname,
          readAt: new Date(r.readAt)
        })),
      }));
    } catch (error) {
      console.error('Error getting DM history:', error);
      return [];
    }
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('direct_messages')
        .select('from_user_id, to_user_id')
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);

      if (error || !data) {
        return [];
      }

      // Get unique conversation IDs
      const conversationIds = new Set<string>();
      data.forEach(dm => {
        const otherUserId = dm.from_user_id === userId ? dm.to_user_id : dm.from_user_id;
        conversationIds.add(this.getConversationId(userId, otherUserId));
      });

      return Array.from(conversationIds);
    } catch (error) {
      console.error('Error getting user conversations:', error);
      return [];
    }
  }

  /**
   * Delete a DM
   */
  async deleteDM(messageId: string, userId: string): Promise<boolean> {
    try {
      // Get the message first to check for files
      const { data: message, error: fetchError } = await this.supabase
        .from('direct_messages')
        .select('from_user_id, content')
        .eq('id', messageId)
        .single();

      if (fetchError || !message || message.from_user_id !== userId) {
        return false;
      }

      // Check if message has files and delete them
      if (message.content) {
        // Check for image marker: [Image: URL]
        if (message.content.startsWith('[Image:') && message.content.endsWith(']')) {
          const imageUrl = message.content.substring(8, message.content.length - 1).trim();
          await this.deleteFileFromStorage(imageUrl, 'images');
        }
        // Check for file marker: [File: URL]
        else if (message.content.startsWith('[File:') && message.content.endsWith(']')) {
          const fileUrl = message.content.substring(7, message.content.length - 1).trim();
          await this.deleteFileFromStorage(fileUrl, 'images'); // Using same bucket
        }
      }

      // Soft delete
      const { error } = await this.supabase
        .from('direct_messages')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          content: '[Message deleted]',
        })
        .eq('id', messageId);

      return !error;
    } catch (error) {
      console.error('Error deleting DM:', error);
      return false;
    }
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
    try {
      // Get the message first
      const { data: message, error: fetchError } = await this.supabase
        .from('direct_messages')
        .select('from_user_id, to_user_id, read_by')
        .eq('id', messageId)
        .single();

      if (fetchError) {
        // Silently ignore if message doesn't exist (e.g., temporary thinking messages)
        if (fetchError.code === 'PGRST116') {
          console.log('[SupabaseDMManager] Message not found (likely temporary), skipping read receipt');
          return null;
        }
        console.error('[SupabaseDMManager] Failed to fetch message:', fetchError);
        return null;
      }
      
      if (!message) {
        console.log('[SupabaseDMManager] Message not found');
        return null;
      }

      // Only the RECIPIENT can mark a message as read (not the sender)
      if (message.to_user_id !== userId) {
        console.log('[SupabaseDMManager] User is not the recipient, cannot mark as read');
        return null;
      }

      // Initialize readBy array if needed
      let readBy = message.read_by || [];
      
      // Check if already read by this user
      const alreadyRead = readBy.find((r: any) => r.userId === userId);
      if (alreadyRead) {
        console.log('[SupabaseDMManager] Already marked as read, returning existing readBy');
        return readBy; // Return existing readBy array
      }

      // Add read receipt
      readBy.push({
        userId,
        nickname,
        readAt: new Date().toISOString(),
      });

      // Update the message
      const { error: updateError } = await this.supabase
        .from('direct_messages')
        .update({ read_by: readBy })
        .eq('id', messageId);

      if (updateError) {
        console.error('[SupabaseDMManager] Failed to update read status:', updateError);
        return null;
      }

      console.log('[SupabaseDMManager] Successfully marked message as read');
      return readBy;
    } catch (error) {
      console.error('Error marking DM as read:', error);
      return null;
    }
  }

  /**
   * Get conversation ID for two users (sorted to ensure consistency)
   */
  private getConversationId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_');
  }
}
