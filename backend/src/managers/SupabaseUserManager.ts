import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User } from '../models/Participant';
import { IUserManager } from './IUserManager';

/**
 * SupabaseUserManager handles user registration and lookup with Supabase
 */
export class SupabaseUserManager implements IUserManager {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Register a new user with unique username
   */
  async registerUser(username: string, nickname: string, passwordHash?: string): Promise<User | null> {
    try {
      // Remove @ if present (we don't store @ in database)
      if (username.startsWith('@')) {
        username = username.substring(1);
      }

      // Prepare insert data
      const insertData: any = {
        username: username.toLowerCase(),
        nickname,
        is_pro: false, // Default to free user
      };

      // Add password hash if provided
      if (passwordHash) {
        insertData.password_hash = passwordHash;
      }

      // Insert user (lowercase for consistency)
      const { data, error } = await this.supabase
        .from('flux_users')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        // Username already taken (unique constraint violation)
        if (error.code === '23505') {
          return null;
        }
        throw error;
      }

      // Create default free subscription for new user
      try {
        await this.supabase
          .from('subscriptions')
          .insert({
            user_id: data.id,
            tier: 'free',
            start_date: new Date().toISOString(),
            auto_renew: false,
          });
      } catch (subError) {
        console.error('Error creating subscription for new user:', subError);
        // Don't fail user registration if subscription creation fails
      }

      return {
        id: data.id,
        username: data.username,
        nickname: data.nickname,
        passwordHash: data.password_hash,
        isPro: data.is_pro || false,
        createdAt: new Date(data.created_at),
        lastSeen: new Date(data.last_seen),
      };
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User | null> {
    try {
      // Remove @ if present (we don't store @ in database)
      if (username.startsWith('@')) {
        username = username.substring(1);
      }

      console.log(`[DEBUG] Looking up user: "${username.toLowerCase()}"`);

      const { data, error } = await this.supabase
        .from('flux_users')
        .select('*')
        .eq('username', username.toLowerCase())
        .single();

      if (error) {
        console.error('[DEBUG] Supabase error:', error);
        return null;
      }

      if (!data) {
        console.log('[DEBUG] No user found');
        return null;
      }

      console.log('[DEBUG] User found:', {
        id: data.id,
        username: data.username,
        hasPassword: !!data.password_hash,
        isAdmin: data.is_admin,
        isPro: data.is_pro
      });

      return {
        id: data.id,
        username: data.username,
        nickname: data.nickname,
        passwordHash: data.password_hash,
        isPro: data.is_pro || false,
        isAdmin: data.is_admin || false,
        createdAt: new Date(data.created_at),
        lastSeen: new Date(data.last_seen),
      };
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabase
        .from('flux_users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        username: data.username,
        nickname: data.nickname,
        isPro: data.is_pro || false,
        isAdmin: data.is_admin || false,
        createdAt: new Date(data.created_at),
        lastSeen: new Date(data.last_seen),
      };
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  /**
   * Check if username is available
   */
  async isUsernameAvailable(username: string): Promise<boolean> {
    // Remove @ if present (we don't store @ in database)
    if (username.startsWith('@')) {
      username = username.substring(1);
    }

    const user = await this.getUserByUsername(username);
    return user === null;
  }

  /**
   * Search users by username or nickname
   */
  async searchUsers(query: string): Promise<User[]> {
    try {
      const lowerQuery = query.toLowerCase();

      const { data, error } = await this.supabase
        .from('flux_users')
        .select('*')
        .or(`username.ilike.%${lowerQuery}%,nickname.ilike.%${lowerQuery}%`)
        .limit(10);

      if (error || !data) {
        return [];
      }

      return data.map(u => ({
        id: u.id,
        username: u.username,
        nickname: u.nickname,
        isPro: u.is_pro || false,
        createdAt: new Date(u.created_at),
        lastSeen: new Date(u.last_seen),
      }));
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  /**
   * Update user's last seen
   */
  async updateLastSeen(userId: string): Promise<void> {
    try {
      await this.supabase
        .from('flux_users')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('Error updating last seen:', error);
    }
  }

  /**
   * Get all users (for directory)
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const { data, error } = await this.supabase
        .from('flux_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) {
        return [];
      }

      return data.map(u => ({
        id: u.id,
        username: u.username,
        nickname: u.nickname,
        isPro: u.is_pro || false,
        isAdmin: u.is_admin || false,
        status: u.is_online ? 'online' : 'offline',
        is_banned: u.is_banned || false,
        createdAt: new Date(u.created_at),
        lastSeen: new Date(u.last_seen),
      }));
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  /**
   * Get user by ID (alias for getUserById)
   */
  async getUser(userId: string): Promise<User | null> {
    return this.getUserById(userId);
  }

  /**
   * Set user online/offline status
   */
  async setUserOnline(userId: string, isOnline: boolean): Promise<void> {
    try {
      await this.supabase
        .from('flux_users')
        .update({ 
          is_online: isOnline,
          last_seen: new Date().toISOString()
        })
        .eq('id', userId);
    } catch (error) {
      console.error('Error setting user online status:', error);
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User | null> {
    try {
      const updateData: any = {};
      
      if (updates.nickname) updateData.nickname = updates.nickname;
      if (updates.avatar !== undefined) updateData.avatar_url = updates.avatar;
      if ((updates as any).avatarUrl !== undefined) updateData.avatar_url = (updates as any).avatarUrl;
      if (updates.bio) updateData.bio = updates.bio;

      const { data, error } = await this.supabase
        .from('flux_users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        username: data.username,
        nickname: data.nickname,
        avatar: data.avatar_url || data.avatar,
        bio: data.bio,
        createdAt: new Date(data.created_at),
        lastSeen: new Date(data.last_seen),
        isOnline: data.is_online,
      };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return null;
    }
  }

  /**
   * Update user (admin function)
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    try {
      const updateData: any = {};
      
      if (updates.nickname !== undefined) updateData.nickname = updates.nickname;
      if (updates.isPro !== undefined) updateData.is_pro = updates.isPro;
      if (updates.isAdmin !== undefined) updateData.is_admin = updates.isAdmin;
      if (updates.bio !== undefined) updateData.bio = updates.bio;
      if (updates.avatar !== undefined) updateData.avatar_url = updates.avatar;
      if ((updates as any).is_banned !== undefined) updateData.is_banned = (updates as any).is_banned;

      const { data, error } = await this.supabase
        .from('flux_users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        username: data.username,
        nickname: data.nickname,
        isPro: data.is_pro || false,
        isAdmin: data.is_admin || false,
        avatar: data.avatar_url,
        bio: data.bio,
        createdAt: new Date(data.created_at),
        lastSeen: new Date(data.last_seen),
      };
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }

  /**
   * Delete user (admin function)
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('flux_users')
        .delete()
        .eq('id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}
