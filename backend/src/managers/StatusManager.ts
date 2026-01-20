import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface UserStatus {
  userId: string;
  statusType: 'online' | 'idle' | 'dnd' | 'offline';
  customStatus?: string;
  activityType?: 'playing' | 'listening' | 'watching';
  activityName?: string;
  autoStatus: boolean;
  lastActive: Date;
  updatedAt: Date;
}

export class StatusManager {
  private supabase: SupabaseClient;
  private idleTimers: Map<string, NodeJS.Timeout> = new Map();
  private socketIO: any;
  private readonly IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  constructor(supabaseUrl: string, supabaseKey: string, socketIO?: any) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.socketIO = socketIO;
  }

  /**
   * Set Socket.IO instance for real-time updates
   */
  setSocketIO(socketIO: any): void {
    this.socketIO = socketIO;
  }

  /**
   * Set user status
   */
  async setStatus(userId: string, status: Partial<UserStatus>): Promise<void> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (status.statusType) {
        updateData.status_type = status.statusType;
      }

      if (status.customStatus !== undefined) {
        updateData.custom_status = status.customStatus;
      }

      if (status.activityType !== undefined) {
        updateData.activity_type = status.activityType;
      }

      if (status.activityName !== undefined) {
        updateData.activity_name = status.activityName;
      }

      if (status.autoStatus !== undefined) {
        updateData.auto_status = status.autoStatus;
      }

      // Update last_active if going online
      if (status.statusType === 'online') {
        updateData.last_active = new Date().toISOString();
      }

      const { error } = await this.supabase
        .from('user_status')
        .upsert({
          user_id: userId,
          ...updateData
        });

      if (error) {
        throw error;
      }

      // Broadcast status change
      const fullStatus = await this.getStatus(userId);
      if (fullStatus) {
        this.broadcastStatus(userId, fullStatus);
      }

      // Reset idle timer if going online
      if (status.statusType === 'online' && status.autoStatus !== false) {
        this.setAutoIdle(userId, 5);
      }

      console.log(`Status updated for user ${userId}: ${status.statusType}`);
    } catch (error) {
      console.error('Failed to set status:', error);
      throw error;
    }
  }

  /**
   * Get user status
   */
  async getStatus(userId: string): Promise<UserStatus | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_status')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        userId: data.user_id,
        statusType: data.status_type,
        customStatus: data.custom_status,
        activityType: data.activity_type,
        activityName: data.activity_name,
        autoStatus: data.auto_status,
        lastActive: new Date(data.last_active),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Failed to get status:', error);
      return null;
    }
  }

  /**
   * Set auto-idle timer
   */
  setAutoIdle(userId: string, minutes: number): void {
    // Clear existing timer
    const existingTimer = this.idleTimers.get(userId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(async () => {
      try {
        // Check if auto status is still enabled
        const status = await this.getStatus(userId);
        if (status && status.autoStatus && status.statusType === 'online') {
          await this.setStatus(userId, { statusType: 'idle' });
          console.log(`User ${userId} auto-set to idle after ${minutes} minutes`);
        }
      } catch (error) {
        console.error('Failed to set auto-idle:', error);
      }
    }, minutes * 60 * 1000);

    this.idleTimers.set(userId, timer);
  }

  /**
   * Detect activity (placeholder - would integrate with actual activity detection)
   */
  async detectActivity(userId: string): Promise<{ type: string; name: string } | null> {
    // This would integrate with actual activity detection
    // For now, return null
    return null;
  }

  /**
   * Broadcast status to all connected clients
   */
  broadcastStatus(userId: string, status: UserStatus): void {
    if (this.socketIO) {
      this.socketIO.emit('status:update', {
        userId,
        status: {
          type: status.statusType,
          customStatus: status.customStatus,
          activityType: status.activityType,
          activityName: status.activityName,
          lastActive: status.lastActive
        }
      });
    }
  }

  /**
   * Set user online
   */
  async setOnline(userId: string): Promise<void> {
    await this.setStatus(userId, {
      statusType: 'online',
      autoStatus: true
    });
  }

  /**
   * Set user offline
   */
  async setOffline(userId: string): Promise<void> {
    // Clear idle timer
    const timer = this.idleTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.idleTimers.delete(userId);
    }

    await this.setStatus(userId, {
      statusType: 'offline'
    });
  }

  /**
   * Update activity (e.g., listening to music)
   */
  async updateActivity(
    userId: string,
    activityType: 'playing' | 'listening' | 'watching',
    activityName: string
  ): Promise<void> {
    await this.setStatus(userId, {
      activityType,
      activityName
    });
  }

  /**
   * Clear activity
   */
  async clearActivity(userId: string): Promise<void> {
    await this.setStatus(userId, {
      activityType: undefined,
      activityName: undefined
    });
  }

  /**
   * Get all online users
   */
  async getOnlineUsers(): Promise<UserStatus[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_status')
        .select('*')
        .in('status_type', ['online', 'idle', 'dnd'])
        .order('last_active', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map(status => ({
        userId: status.user_id,
        statusType: status.status_type,
        customStatus: status.custom_status,
        activityType: status.activity_type,
        activityName: status.activity_name,
        autoStatus: status.auto_status,
        lastActive: new Date(status.last_active),
        updatedAt: new Date(status.updated_at)
      }));
    } catch (error) {
      console.error('Failed to get online users:', error);
      return [];
    }
  }

  /**
   * Update last active timestamp
   */
  async updateLastActive(userId: string): Promise<void> {
    try {
      await this.supabase
        .from('user_status')
        .update({
          last_active: new Date().toISOString()
        })
        .eq('user_id', userId);

      // Reset idle timer
      const status = await this.getStatus(userId);
      if (status && status.autoStatus && status.statusType === 'online') {
        this.setAutoIdle(userId, 5);
      }
    } catch (error) {
      console.error('Failed to update last active:', error);
    }
  }

  /**
   * Cleanup idle timers
   */
  cleanup(): void {
    this.idleTimers.forEach(timer => clearTimeout(timer));
    this.idleTimers.clear();
  }
}

// Export singleton instance
let statusManagerInstance: StatusManager | null = null;

export function initializeStatusManager(
  supabaseUrl: string,
  supabaseKey: string,
  socketIO?: any
): StatusManager {
  if (!statusManagerInstance) {
    statusManagerInstance = new StatusManager(supabaseUrl, supabaseKey, socketIO);
  }
  return statusManagerInstance;
}

export function getStatusManager(): StatusManager {
  if (!statusManagerInstance) {
    throw new Error('StatusManager not initialized. Call initializeStatusManager first.');
  }
  return statusManagerInstance;
}
