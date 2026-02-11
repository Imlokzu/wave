/**
 * Participant interface representing a user in a room
 */
export interface Participant {
  id: string;
  nickname: string;
  username?: string; // Unique @username for DMs
  joinedAt: Date;
  socketId: string;
  isAway?: boolean; // True if user has switched to another tab
  avatar?: string; // Avatar URL
  isModerator?: boolean; // Whether this participant is a room moderator
}

/**
 * User interface for global user registry
 */
export interface User {
  id: string;
  username: string; // Unique @username
  nickname: string;
  passwordHash?: string; // Optional for authentication
  clerkId?: string; // Clerk user ID for authentication
  email?: string; // Optional email
  avatar?: string; // Optional avatar URL
  bio?: string; // Optional bio
  isOnline?: boolean; // Online status
  isPro?: boolean; // Pro subscription status
  isAdmin?: boolean; // Admin status
  status?: string; // User status (online, offline, away, etc.)
  createdAt: Date;
  lastSeen: Date;
}
