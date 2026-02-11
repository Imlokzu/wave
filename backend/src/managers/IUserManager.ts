import { User } from '../models/Participant';

/**
 * Interface for user management
 */
export interface IUserManager {
  registerUser(username: string, nickname: string, passwordHash?: string, clerkId?: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  getUserById(userId: string): Promise<User | null>;
  getUserByClerkId(clerkId: string): Promise<User | null>;
  getUser(userId: string): Promise<User | null>;
  isUsernameAvailable(username: string): Promise<boolean>;
  searchUsers(query: string): Promise<User[]>;
  updateLastSeen(userId: string): Promise<void>;
  setUserOnline(userId: string, isOnline: boolean): Promise<void>;
  updateUserProfile(userId: string, updates: Partial<User>): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  updateUser(userId: string, updates: Partial<User>): Promise<User | null>;
  deleteUser(userId: string): Promise<void>;
}
