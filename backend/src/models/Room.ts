import { Participant } from './Participant';

/**
 * Room settings interface
 */
export interface RoomSettings {
  allowPolls?: boolean;
  allowVoice?: boolean;
  allowFiles?: boolean;
  allowImages?: boolean;
  allowStickers?: boolean;
  maxMessageLength?: number;
  slowMode?: number; // seconds between messages
  isPrivate?: boolean;
  password?: string;
}

/**
 * Room interface representing a chat room
 */
export interface Room {
  id: string;
  code: string;
  name?: string;
  createdAt: Date;
  maxUsers: number;
  participants: Map<string, Participant>;
  isLocked: boolean;
  moderators: Set<string>;
  isPersistent?: boolean;
  createdBy?: string;
  expiresAt?: Date;
  settings?: RoomSettings;
}
