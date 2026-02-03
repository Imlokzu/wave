import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Room, Participant } from '../models';
import { InMemoryStorage } from './InMemoryStorage';
import { validateUUID } from '../utils';

/**
 * Interface for room storage operations
 */
export interface IRoomStorage {
  saveRoom(room: Room): Promise<void>;
  getRoom(roomId: string): Promise<Room | null>;
  getRoomByCode(code: string): Promise<Room | null>;
  deleteRoom(roomId: string): Promise<void>;
  getAllRooms(): Promise<Room[]>;
}

/**
 * SupabaseRoomManager handles persistent room storage with Supabase
 */
export class SupabaseRoomManager implements IRoomStorage {
  private supabase: SupabaseClient;
  private inMemoryStorage: InMemoryStorage; // Fallback for non-persistent rooms

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.inMemoryStorage = new InMemoryStorage();
  }

  /**
   * Save a room to database if persistent, otherwise use in-memory
   */
  async saveRoom(room: Room): Promise<void> {
    if (room.isPersistent) {
      // Save to Supabase
      const moderators = Array.from(room.moderators);
      
      // Build the data object matching the database schema
      const roomData: any = {
        id: room.id,
        code: room.code,
        name: room.name || null,
        created_at: room.createdAt.toISOString(),
        max_users: room.maxUsers,
        is_locked: room.isLocked,
        is_persistent: true,
        expires_at: room.expiresAt ? room.expiresAt.toISOString() : null,
        settings: room.settings || {}
      };
      
      // Use creator_id instead of created_by to match database schema (only if valid UUID)
      if (room.createdBy && validateUUID(room.createdBy)) {
        roomData.creator_id = room.createdBy;
      } else if (room.createdBy) {
        console.warn('SupabaseRoomManager: invalid creator id, skipping creator_id for room', room.id);
      }
      
      const { error } = await this.supabase
        .from('rooms')
        .upsert(roomData);

      if (error) {
        console.error('Error saving persistent room:', error);
        throw error;
      }

      // Save participants
      const participants = Array.from(room.participants.values());
      for (const participant of participants) {
        await this.supabase
          .from('room_participants')
          .upsert({
            room_id: room.id,
            user_id: participant.id,
            role: room.moderators.has(participant.id) ? 'moderator' : 'member'
          });
      }
    } else {
      // Use in-memory for temporary rooms
      await this.inMemoryStorage.saveRoom(room);
    }
  }

  /**
   * Get a room by ID
   */
  async getRoom(roomId: string): Promise<Room | null> {
    // First check in-memory
    const memoryRoom = await this.inMemoryStorage.getRoom(roomId);
    if (memoryRoom) return memoryRoom;

    // Check database
    const { data, error } = await this.supabase
      .from('rooms')
      .select(`
        *,
        room_participants (
          user_id,
          role,
          joined_at,
          flux_users (
            id,
            username,
            nickname,
            avatar_url
          )
        )
      `)
      .eq('id', roomId)
      .single();

    if (error || !data) return null;

    // Reconstruct room object
    const participants = new Map<string, Participant>();
    if (data.room_participants) {
      for (const p of data.room_participants) {
        participants.set(p.user_id, {
          id: p.user_id,
          username: p.flux_users?.username || 'Unknown',
          nickname: p.flux_users?.nickname || 'Unknown',
          avatar: p.flux_users?.avatar_url || null,
          isModerator: p.role === 'moderator',
          joinedAt: new Date(p.joined_at),
          socketId: '', // Will be set when they join
        });
      }
    }

    return {
      id: data.id,
      code: data.code,
      name: data.name,
      createdAt: new Date(data.created_at),
      maxUsers: data.max_users,
      participants,
      isLocked: data.is_locked,
      moderators: new Set(data.moderators || []),
      isPersistent: data.is_persistent,
      createdBy: data.creator_id,
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
      settings: data.settings || {}
    };
  }

  /**
   * Get a room by code
   */
  async getRoomByCode(code: string): Promise<Room | null> {
    // First check in-memory
    const memoryRoom = await this.inMemoryStorage.getRoomByCode(code);
    if (memoryRoom) return memoryRoom;

    // Check database
    const { data, error } = await this.supabase
      .from('rooms')
      .select(`
        *,
        room_participants (
          user_id,
          role,
          joined_at,
          flux_users (
            id,
            username,
            nickname,
            avatar_url
          )
        )
      `)
      .eq('code', code.toUpperCase())
      .single();

    if (error || !data) return null;

    // Reconstruct room object
    const participants = new Map<string, Participant>();
    if (data.room_participants) {
      for (const p of data.room_participants) {
        participants.set(p.user_id, {
          id: p.user_id,
          username: p.flux_users?.username || 'Unknown',
          nickname: p.flux_users?.nickname || 'Unknown',
          avatar: p.flux_users?.avatar_url || null,
          isModerator: p.role === 'moderator',
          joinedAt: new Date(p.joined_at),
          socketId: '', // Will be set when they join
        });
      }
    }

    return {
      id: data.id,
      code: data.code,
      name: data.name,
      createdAt: new Date(data.created_at),
      maxUsers: data.max_users,
      participants,
      isLocked: data.is_locked,
      moderators: new Set(data.moderators || []),
      isPersistent: data.is_persistent,
      createdBy: data.creator_id,
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
      settings: data.settings || {}
    };
  }

  /**
   * Delete a room
   */
  async deleteRoom(roomId: string): Promise<void> {
    // Try in-memory first
    await this.inMemoryStorage.deleteRoom(roomId);

    // Also delete from database
    const { error } = await this.supabase
      .from('rooms')
      .delete()
      .eq('id', roomId);

    if (error) {
      console.error('Error deleting room from database:', error);
    }
  }

  /**
   * Get all persistent rooms
   */
  async getAllRooms(): Promise<Room[]> {
    const { data, error } = await this.supabase
      .from('rooms')
      .select(`
        *,
        room_participants (
          user_id,
          role,
          joined_at,
          flux_users (
            id,
            username,
            nickname,
            avatar_url
          )
        )
      `)
      .eq('is_persistent', true);

    if (error) return [];

    const rooms: Room[] = [];
    for (const roomData of data || []) {
      const participants = new Map<string, Participant>();
      if (roomData.room_participants) {
        for (const p of roomData.room_participants) {
          participants.set(p.user_id, {
            id: p.user_id,
            username: p.flux_users?.username || 'Unknown',
            nickname: p.flux_users?.nickname || 'Unknown',
            avatar: p.flux_users?.avatar_url || null,
            isModerator: p.role === 'moderator',
            joinedAt: new Date(p.joined_at),
            socketId: '', // Will be set when they join
          });
        }
      }

      rooms.push({
        id: roomData.id,
        code: roomData.code,
        name: roomData.name,
        createdAt: new Date(roomData.created_at),
        maxUsers: roomData.max_users,
        participants,
        isLocked: roomData.is_locked,
        moderators: new Set(roomData.moderators || []),
        isPersistent: roomData.is_persistent,
        createdBy: roomData.creator_id,
        expiresAt: roomData.expires_at ? new Date(roomData.expires_at) : undefined,
        settings: roomData.settings || {}
      });
    }

    return rooms;
  }
}