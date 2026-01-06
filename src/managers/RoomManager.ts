import { Room, Participant } from '../models';
import { InMemoryStorage } from './InMemoryStorage';
import { v4 as uuidv4 } from 'uuid';

/**
 * RoomManager handles room lifecycle and participant management
 */
export class RoomManager {
  private storage: InMemoryStorage;
  private typingIndicators: Map<string, Map<string, NodeJS.Timeout>>; // roomId -> userId -> timeout

  constructor(storage: InMemoryStorage) {
    this.storage = storage;
    this.typingIndicators = new Map();
  }

  /**
   * Generate a unique 6-character alphanumeric room code
   */
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Create a new room with unique code
   */
  async createRoom(maxUsers: number = 50): Promise<Room> {
    let code = this.generateRoomCode();
    
    // Ensure code uniqueness
    let attempts = 0;
    while (await this.storage.getRoomByCode(code) !== null && attempts < 10) {
      code = this.generateRoomCode();
      attempts++;
    }

    const room: Room = {
      id: uuidv4(),
      code,
      createdAt: new Date(),
      maxUsers,
      participants: new Map(),
      isLocked: false,
      moderators: new Set(),
    };

    await this.storage.saveRoom(room);
    return room;
  }

  /**
   * Get room by ID
   */
  async getRoom(roomId: string): Promise<Room | null> {
    return this.storage.getRoom(roomId);
  }

  /**
   * Get room by code
   */
  async getRoomByCode(code: string): Promise<Room | null> {
    return this.storage.getRoomByCode(code);
  }

  /**
   * Get all rooms
   */
  async getAllRooms(): Promise<Room[]> {
    return this.storage.getAllRooms();
  }

  /**
   * Add participant to room
   * Returns true if successful, false if room is full
   * If participant already exists with same ID, updates their info (handles reconnection)
   */
  async addParticipant(roomId: string, participant: Participant): Promise<boolean> {
    const room = await this.storage.getRoom(roomId);
    if (!room) {
      return false;
    }

    // Check if room is full (only if this is a new participant)
    if (!room.participants.has(participant.id) && room.participants.size >= room.maxUsers) {
      return false;
    }

    // Add or update participant (upsert)
    room.participants.set(participant.id, participant);
    await this.storage.saveRoom(room);
    return true;
  }

  /**
   * Remove participant from room
   */
  async removeParticipant(roomId: string, participantId: string): Promise<void> {
    const room = await this.storage.getRoom(roomId);
    if (!room) {
      return;
    }

    room.participants.delete(participantId);
    await this.storage.saveRoom(room);
  }

  /**
   * Set participant's away status
   */
  async setParticipantAway(roomId: string, participantId: string, isAway: boolean): Promise<void> {
    const room = await this.storage.getRoom(roomId);
    if (!room) {
      return;
    }

    const participant = room.participants.get(participantId);
    if (participant) {
      participant.isAway = isAway;
      room.participants.set(participantId, participant);
      await this.storage.saveRoom(room);
    }
  }

  /**
   * Lock room (set to read-only)
   */
  async lockRoom(roomId: string): Promise<void> {
    const room = await this.storage.getRoom(roomId);
    if (!room) {
      return;
    }

    room.isLocked = true;
    await this.storage.saveRoom(room);
  }

  /**
   * Unlock room (restore normal messaging)
   */
  async unlockRoom(roomId: string): Promise<void> {
    const room = await this.storage.getRoom(roomId);
    if (!room) {
      return;
    }

    room.isLocked = false;
    await this.storage.saveRoom(room);
  }

  /**
   * Check if room is full
   */
  async isRoomFull(roomId: string): Promise<boolean> {
    const room = await this.storage.getRoom(roomId);
    if (!room) {
      return false;
    }

    return room.participants.size >= room.maxUsers;
  }

  /**
   * Get participant count
   */
  async getParticipantCount(roomId: string): Promise<number> {
    const room = await this.storage.getRoom(roomId);
    if (!room) {
      return 0;
    }

    return room.participants.size;
  }

  /**
   * Get all participants in a room
   */
  async getParticipants(roomId: string): Promise<Participant[]> {
    const room = await this.storage.getRoom(roomId);
    if (!room) {
      return [];
    }

    return Array.from(room.participants.values());
  }

  /**
   * Check if user is moderator
   */
  async isModerator(roomId: string, userId: string): Promise<boolean> {
    const room = await this.storage.getRoom(roomId);
    if (!room) {
      return false;
    }

    return room.moderators.has(userId);
  }

  /**
   * Add moderator to room
   */
  async addModerator(roomId: string, userId: string): Promise<void> {
    const room = await this.storage.getRoom(roomId);
    if (!room) {
      return;
    }

    room.moderators.add(userId);
    await this.storage.saveRoom(room);
  }

  /**
   * Regenerate room code (moderator only)
   */
  async regenerateRoomCode(roomId: string, userId: string): Promise<string | null> {
    const room = await this.storage.getRoom(roomId);
    if (!room) {
      return null;
    }

    // Check if user is moderator
    if (!room.moderators.has(userId)) {
      throw new Error('Unauthorized: Only moderators can regenerate room code');
    }

    // Generate new unique code
    let newCode = this.generateRoomCode();
    let attempts = 0;
    while (await this.storage.getRoomByCode(newCode) !== null && attempts < 10) {
      newCode = this.generateRoomCode();
      attempts++;
    }

    // Update room code
    const oldCode = room.code;
    room.code = newCode;
    
    // Update storage (need to handle code index)
    await this.storage.saveRoom(room);
    
    return newCode;
  }

  /**
   * Set typing indicator for a user
   */
  setTyping(roomId: string, userId: string, nickname: string): void {
    if (!this.typingIndicators.has(roomId)) {
      this.typingIndicators.set(roomId, new Map());
    }

    const roomTyping = this.typingIndicators.get(roomId)!;
    
    // Clear existing timeout
    const existingTimeout = roomTyping.get(userId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout (3 seconds)
    const timeout = setTimeout(() => {
      this.clearTyping(roomId, userId);
    }, 3000);

    roomTyping.set(userId, timeout);
  }

  /**
   * Clear typing indicator for a user
   */
  clearTyping(roomId: string, userId: string): void {
    const roomTyping = this.typingIndicators.get(roomId);
    if (!roomTyping) return;

    const timeout = roomTyping.get(userId);
    if (timeout) {
      clearTimeout(timeout);
      roomTyping.delete(userId);
    }

    // Clean up empty room maps
    if (roomTyping.size === 0) {
      this.typingIndicators.delete(roomId);
    }
  }

  /**
   * Get all users currently typing in a room
   */
  async getTypingUsers(roomId: string): Promise<import('../models').TypingIndicator[]> {
    const room = await this.storage.getRoom(roomId);
    if (!room) return [];

    const roomTyping = this.typingIndicators.get(roomId);
    if (!roomTyping) return [];

    const indicators: import('../models').TypingIndicator[] = [];
    for (const userId of roomTyping.keys()) {
      const participant = room.participants.get(userId);
      if (participant) {
        indicators.push({
          userId,
          nickname: participant.nickname,
          roomId,
          timestamp: new Date()
        });
      }
    }

    return indicators;
  }

  /**
   * Cleanup all typing timers (for graceful shutdown)
   */
  cleanup(): void {
    for (const roomTyping of this.typingIndicators.values()) {
      for (const timeout of roomTyping.values()) {
        clearTimeout(timeout);
      }
    }
    this.typingIndicators.clear();
  }
}
