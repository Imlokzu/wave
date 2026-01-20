/**
 * Message types supported by the system
 */
export type MessageType = 'normal' | 'system' | 'fake' | 'image' | 'ai' | 'poll' | 'file' | 'voice';

/**
 * Poll option interface
 */
export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // Array of user IDs who voted
}

/**
 * Poll data interface
 */
export interface PollData {
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
  isClosed: boolean;
  closedAt?: Date;
}

/**
 * Reaction interface
 */
export interface Reaction {
  emoji: string;
  userIds: string[]; // Array of user IDs who reacted
}

/**
 * Read receipt interface
 */
export interface ReadReceipt {
  userId: string;
  nickname: string;
  readAt: Date;
}

/**
 * Message interface representing a chat message
 */
export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderNickname: string;
  content: string;
  type: MessageType;
  timestamp: Date;
  expiresAt: Date | null;
  imageUrl?: string; // Supabase or BBImg URL for image messages
  fileUrl?: string; // URL for file uploads
  fileName?: string; // Original filename
  fileSize?: number; // File size in bytes
  voiceUrl?: string; // URL for voice messages
  duration?: number; // Duration in seconds for voice messages
  spoofSource?: string; // For fake messages: 'Google', 'Wikipedia', etc.
  isEdited?: boolean; // Whether message has been edited
  editedAt?: Date; // Timestamp of last edit
  isDeleted?: boolean; // Whether message has been deleted
  deletedAt?: Date; // Timestamp of deletion
  isPinned?: boolean; // Whether message is pinned
  pinnedAt?: Date; // Timestamp when pinned
  reactions?: Reaction[]; // Array of reactions
  pollData?: PollData; // Poll-specific data
  delivered?: boolean; // Whether message was delivered to server
  readBy?: ReadReceipt[]; // Array of users who have read the message
}

/**
 * Typing indicator interface
 */
export interface TypingIndicator {
  userId: string;
  nickname: string;
  roomId: string;
  timestamp: Date;
}

/**
 * User status interface for online/offline tracking
 */
export interface UserStatus {
  userId: string;
  isOnline: boolean;
  lastSeen: Date;
  socketId?: string;
}

/**
 * WebRTC call signal data
 */
export interface CallSignal {
  userToCall: string;
  signalData: any;
  from: string;
  name: string;
  callerSocketId?: string;
}
