import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface BioProfile {
  id: string;
  userId: string;
  username?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  backgroundVideoUrl?: string;
  backgroundMusicUrl?: string;
  customCursorUrl?: string;
  theme: string;
  customCursorEnabled: boolean;
  autoPlayMusic: boolean;
  badges: { name: string; icon: string }[];
  socialLinks: { platform: string; name: string; url: string }[];
  skills: string[];
  views: number;
  visits: number;
  createdAt: Date;
  updatedAt: Date;
}

export class BioProfileManager {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get bio profile by user ID
   */
  async getProfileByUserId(userId: string): Promise<BioProfile | null> {
    try {
      const { data, error } = await this.supabase
        .from('bio_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapToBioProfile(data);
    } catch (error) {
      console.error('Failed to get bio profile by user ID:', error);
      return null;
    }
  }

  /**
   * Get bio profile by username
   */
  async getProfileByUsername(username: string): Promise<BioProfile | null> {
    try {
      // Remove @ if present
      const cleanUsername = username.startsWith('@') ? username.substring(1) : username;

      const { data, error } = await this.supabase
        .from('bio_profiles')
        .select('*')
        .eq('username', cleanUsername.toLowerCase())
        .single();

      if (error || !data) {
        return null;
      }

      // Increment views
      await this.incrementViews(data.id);

      return this.mapToBioProfile(data);
    } catch (error) {
      console.error('Failed to get bio profile by username:', error);
      return null;
    }
  }

  /**
   * Get bio profile by ID
   */
  async getProfileById(profileId: string): Promise<BioProfile | null> {
    try {
      const { data, error } = await this.supabase
        .from('bio_profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapToBioProfile(data);
    } catch (error) {
      console.error('Failed to get bio profile by ID:', error);
      return null;
    }
  }

  /**
   * Create or update bio profile
   */
  async upsertProfile(profile: Partial<BioProfile> & { userId: string }): Promise<BioProfile> {
    try {
      const upsertData: any = {
        user_id: profile.userId,
        updated_at: new Date().toISOString()
      };

      // Map fields
      if (profile.username !== undefined) upsertData.username = profile.username;
      if (profile.displayName !== undefined) upsertData.display_name = profile.displayName;
      if (profile.bio !== undefined) upsertData.bio = profile.bio;
      if (profile.avatarUrl !== undefined) upsertData.avatar_url = profile.avatarUrl;
      if (profile.backgroundVideoUrl !== undefined) upsertData.background_video_url = profile.backgroundVideoUrl;
      if (profile.backgroundMusicUrl !== undefined) upsertData.background_music_url = profile.backgroundMusicUrl;
      if (profile.customCursorUrl !== undefined) upsertData.custom_cursor_url = profile.customCursorUrl;
      if (profile.theme !== undefined) upsertData.theme = profile.theme;
      if (profile.customCursorEnabled !== undefined) upsertData.custom_cursor_enabled = profile.customCursorEnabled;
      if (profile.autoPlayMusic !== undefined) upsertData.auto_play_music = profile.autoPlayMusic;
      if (profile.badges !== undefined) upsertData.badges = profile.badges;
      if (profile.socialLinks !== undefined) upsertData.social_links = profile.socialLinks;
      if (profile.skills !== undefined) upsertData.skills = profile.skills;

      const { data, error } = await this.supabase
        .from('bio_profiles')
        .upsert(upsertData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return this.mapToBioProfile(data);
    } catch (error) {
      console.error('Failed to upsert bio profile:', error);
      throw error;
    }
  }

  /**
   * Create default bio profile
   */
  async createDefaultProfile(userId: string, username: string): Promise<BioProfile> {
    try {
      const { data, error } = await this.supabase
        .from('bio_profiles')
        .insert({
          user_id: userId,
          username: username.toLowerCase(),
          display_name: username,
          bio: 'Welcome to my profile!',
          theme: 'default',
          custom_cursor_enabled: true,
          auto_play_music: false,
          badges: [],
          social_links: [],
          skills: []
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return this.mapToBioProfile(data);
    } catch (error) {
      console.error('Failed to create default bio profile:', error);
      throw error;
    }
  }

  /**
   * Upload file to Supabase Storage
   */
  async uploadFile(
    bucket: string,
    file: Buffer,
    fileName: string,
    contentType: string
  ): Promise<string> {
    try {
      const fileExt = fileName.split('.').pop();
      const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${uniqueFileName}`;

      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          contentType,
          upsert: true
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw error;
    }
  }

  /**
   * Delete file from Supabase Storage
   */
  async deleteFile(bucket: string, fileUrl: string): Promise<void> {
    try {
      // Extract file path from URL
      const urlParts = fileUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];

      await this.supabase.storage
        .from(bucket)
        .remove([fileName]);
    } catch (error) {
      console.error('Failed to delete file:', error);
      // Don't throw - deletion failure shouldn't block the operation
    }
  }

  /**
   * Increment view count
   */
  async incrementViews(profileId: string): Promise<void> {
    try {
      await this.supabase.rpc('increment_bio_profile_views', { profile_id: profileId });
    } catch (error) {
      console.error('Failed to increment views:', error);
    }
  }

  /**
   * Increment visit count
   */
  async incrementVisits(profileId: string): Promise<void> {
    try {
      await this.supabase.rpc('increment_bio_profile_visits', { profile_id: profileId });
    } catch (error) {
      console.error('Failed to increment visits:', error);
    }
  }

  /**
   * Delete bio profile
   */
  async deleteProfile(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('bio_profiles')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to delete bio profile:', error);
      throw error;
    }
  }

  /**
   * Map database row to BioProfile
   */
  private mapToBioProfile(data: any): BioProfile {
    return {
      id: data.id,
      userId: data.user_id,
      username: data.username,
      displayName: data.display_name,
      bio: data.bio,
      avatarUrl: data.avatar_url,
      backgroundVideoUrl: data.background_video_url,
      backgroundMusicUrl: data.background_music_url,
      customCursorUrl: data.custom_cursor_url,
      theme: data.theme || 'default',
      customCursorEnabled: data.custom_cursor_enabled ?? true,
      autoPlayMusic: data.auto_play_music ?? false,
      badges: data.badges || [],
      socialLinks: data.social_links || [],
      skills: data.skills || [],
      views: data.views || 0,
      visits: data.visits || 0,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}

// Export singleton instance
let bioProfileManagerInstance: BioProfileManager | null = null;

export function initializeBioProfileManager(
  supabaseUrl: string,
  supabaseKey: string
): BioProfileManager {
  if (!bioProfileManagerInstance) {
    bioProfileManagerInstance = new BioProfileManager(supabaseUrl, supabaseKey);
  }
  return bioProfileManagerInstance;
}

export function getBioProfileManager(): BioProfileManager {
  if (!bioProfileManagerInstance) {
    throw new Error('BioProfileManager not initialized. Call initializeBioProfileManager first.');
  }
  return bioProfileManagerInstance;
}
