/**
 * Session interface for user authentication
 */
export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Friend invite interface
 */
export interface FriendInvite {
  id: string;
  fromUserId: string;
  fromUsername?: string;
  fromNickname?: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  respondedAt?: Date;
}

/**
 * Friend relationship interface
 */
export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  friendUsername?: string;
  friendNickname?: string;
  isOnline?: boolean;
  lastSeen?: Date;
  acceptedAt: Date;
  createdAt: Date;
}
