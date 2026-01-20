import { Room, Message } from '../models';

/**
 * In-memory storage for rooms and messages
 * No persistence - all data is ephemeral
 */
export class InMemoryStorage {
  private rooms: Map<string, Room>;
  private messages: Map<string, Message[]>; // roomId -> messages
  private roomCodeIndex: Map<string, string>; // code -> roomId

  constructor() {
    this.rooms = new Map();
    this.messages = new Map();
    this.roomCodeIndex = new Map();
  }

  // Room operations
  async saveRoom(room: Room): Promise<void> {
    // Check if room already exists with different code
    const existingRoom = this.rooms.get(room.id);
    if (existingRoom && existingRoom.code !== room.code) {
      // Remove old code from index
      this.roomCodeIndex.delete(existingRoom.code);
    }
    
    this.rooms.set(room.id, room);
    this.roomCodeIndex.set(room.code, room.id);
  }

  async getRoom(roomId: string): Promise<Room | null> {
    return this.rooms.get(roomId) || null;
  }

  async getRoomByCode(code: string): Promise<Room | null> {
    const roomId = this.roomCodeIndex.get(code);
    if (!roomId) return null;
    return this.getRoom(roomId);
  }

  async deleteRoom(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      this.roomCodeIndex.delete(room.code);
      this.rooms.delete(roomId);
      this.messages.delete(roomId);
    }
  }

  // Message operations
  async saveMessage(message: Message): Promise<void> {
    // Don't persist fake messages
    if (message.type === 'fake') {
      return;
    }

    const roomMessages = this.messages.get(message.roomId) || [];
    
    // Check if message already exists (for updates)
    const existingIndex = roomMessages.findIndex(m => m.id === message.id);
    if (existingIndex >= 0) {
      roomMessages[existingIndex] = message;
    } else {
      roomMessages.push(message);
    }
    
    this.messages.set(message.roomId, roomMessages);
  }

  async getAllMessages(): Promise<Message[]> {
    const allMessages: Message[] = [];
    for (const messages of this.messages.values()) {
      allMessages.push(...messages);
    }
    return allMessages;
  }

  async getMessages(roomId: string): Promise<Message[]> {
    return this.messages.get(roomId) || [];
  }

  async deleteMessage(messageId: string): Promise<void> {
    for (const [roomId, messages] of this.messages.entries()) {
      const filtered = messages.filter(m => m.id !== messageId);
      if (filtered.length !== messages.length) {
        this.messages.set(roomId, filtered);
        break;
      }
    }
  }

  async clearRoomMessages(roomId: string, preserveSystem: boolean = false): Promise<void> {
    if (preserveSystem) {
      const messages = this.messages.get(roomId) || [];
      const systemMessages = messages.filter(m => m.type === 'system');
      this.messages.set(roomId, systemMessages);
    } else {
      this.messages.delete(roomId);
    }
  }

  // Utility methods
  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getMessageCount(roomId?: string): number {
    if (roomId) {
      return (this.messages.get(roomId) || []).length;
    }
    let total = 0;
    for (const messages of this.messages.values()) {
      total += messages.length;
    }
    return total;
  }
}
