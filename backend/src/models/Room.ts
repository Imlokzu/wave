import { Participant } from './Participant';

/**
 * Room interface representing a chat room
 */
export interface Room {
  id: string;
  code: string;
  createdAt: Date;
  maxUsers: number;
  participants: Map<string, Participant>;
  isLocked: boolean;
  moderators: Set<string>;
}
