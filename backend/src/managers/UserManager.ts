import { User } from '../models/Participant';
import { v4 as uuidv4 } from 'uuid';
import { IUserManager } from './IUserManager';

/**
 * UserManager handles user registration and lookup
 */
export class UserManager implements IUserManager {
  private users: Map<string, User> = new Map(); // username -> User
  private userIds: Map<string, User> = new Map(); // userId -> User

  /**
   * Register a new user with unique username
   */
  async registerUser(username: string, nickname: string, passwordHash?: string, clerkId?: string): Promise<User | null> {
    // Validate username format (@username)
    if (!username.startsWith('@')) {
      username = '@' + username;
    }

    // Check if username is already taken
    if (this.users.has(username.toLowerCase())) {
      return null;
    }

    const user: User = {
      id: uuidv4(),
      username: username.toLowerCase(),
      nickname,
      passwordHash,
      clerkId,
      createdAt: new Date(),
      lastSeen: new Date(),
      isOnline: false,
    };

    this.users.set(user.username, user);
    this.userIds.set(user.id, user);

    return user;
  }

  /**
   * Get user by Clerk ID
   */
  async getUserByClerkId(clerkId: string): Promise<User | null> {
    // Search through all users to find one with matching Clerk ID
    for (const user of this.users.values()) {
      if (user.clerkId === clerkId) {
        return user;
      }
    }
    return null;
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User | null> {
    if (!username.startsWith('@')) {
      username = '@' + username;
    }
    return this.users.get(username.toLowerCase()) || null;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.userIds.get(userId) || null;
  }

  /**
   * Get user by ID (alias for consistency)
   */
  async getUser(userId: string): Promise<User | null> {
    return this.getUserById(userId);
  }

  /**
   * Update user online status
   */
  async setUserOnline(userId: string, isOnline: boolean): Promise<void> {
    const user = this.userIds.get(userId);
    if (user) {
      user.isOnline = isOnline;
      if (!isOnline) {
        user.lastSeen = new Date();
      }
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User | null> {
    const user = this.userIds.get(userId);
    if (!user) {
      return null;
    }

    // Update allowed fields
    if (updates.nickname) user.nickname = updates.nickname;
    if (updates.avatar !== undefined) user.avatar = updates.avatar;
    if (updates.bio !== undefined) user.bio = updates.bio;
    if (updates.email !== undefined) user.email = updates.email;

    return user;
  }

  /**
   * Check if username is available
   */
  async isUsernameAvailable(username: string): Promise<boolean> {
    if (!username.startsWith('@')) {
      username = '@' + username;
    }
    return !this.users.has(username.toLowerCase());
  }

  /**
   * Search users by username or nickname
   */
  async searchUsers(query: string): Promise<User[]> {
    const results: User[] = [];
    const lowerQuery = query.toLowerCase();

    for (const user of this.users.values()) {
      if (
        user.username.includes(lowerQuery) ||
        user.nickname.toLowerCase().includes(lowerQuery)
      ) {
        results.push(user);
      }
    }

    return results.slice(0, 10); // Limit to 10 results
  }

  /**
   * Update user's last seen
   */
  async updateLastSeen(userId: string): Promise<void> {
    const user = this.userIds.get(userId);
    if (user) {
      user.lastSeen = new Date();
    }
  }

  /**
   * Get all users (for directory)
   */
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  /**
   * Update user (admin function)
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const user = this.userIds.get(userId);
    if (!user) {
      return null;
    }

    // Update allowed fields
    if (updates.nickname !== undefined) user.nickname = updates.nickname;
    if (updates.isPro !== undefined) user.isPro = updates.isPro;
    if (updates.isAdmin !== undefined) user.isAdmin = updates.isAdmin;
    if (updates.bio !== undefined) user.bio = updates.bio;
    if (updates.avatar !== undefined) user.avatar = updates.avatar;
    if ((updates as any).is_banned !== undefined) (user as any).is_banned = (updates as any).is_banned;

    return user;
  }

  /**
   * Delete user (admin function)
   */
  async deleteUser(userId: string): Promise<void> {
    const user = this.userIds.get(userId);
    if (user) {
      this.users.delete(user.username);
      this.userIds.delete(userId);
    }
  }
}
