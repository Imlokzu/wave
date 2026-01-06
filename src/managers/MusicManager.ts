import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { parseFile } from 'music-metadata';
import { v4 as uuidv4 } from 'uuid';

export interface MusicTrack {
  id: string;
  userId: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  fileUrl: string;
  fileSize: number;
  isPublic: boolean;
  downloadCount: number;
  playCount: number;
  createdAt: Date;
}

export interface Playlist {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isPublic: boolean;
  trackCount: number;
  createdAt: Date;
}

export class MusicManager {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Upload a music track (Pro users only)
   */
  async uploadTrack(
    file: File,
    userId: string,
    isPro: boolean,
    isPublic: boolean = false
  ): Promise<MusicTrack> {
    try {
      // Check Pro status
      if (!isPro) {
        throw new Error('Music upload is a Pro feature. Upgrade to Pro to upload tracks.');
      }

      // Validate file type
      if (!file.type.startsWith('audio/')) {
        throw new Error('File must be an audio file');
      }

      // Extract metadata
      const metadata = await this.extractMetadata(file);

      const trackId = uuidv4();
      const fileName = `${trackId}_${file.name}`;
      const filePath = `music/${userId}/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('files')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('files')
        .getPublicUrl(filePath);

      // Save to database
      const { data: dbData, error: dbError } = await this.supabase
        .from('music_tracks')
        .insert({
          id: trackId,
          user_id: userId,
          title: metadata.title,
          artist: metadata.artist,
          album: metadata.album,
          duration: metadata.duration,
          file_url: urlData.publicUrl,
          file_size: file.size,
          is_public: isPublic
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      console.log(`Track uploaded: ${metadata.title} by ${metadata.artist}`);

      return {
        id: dbData.id,
        userId: dbData.user_id,
        title: dbData.title,
        artist: dbData.artist,
        album: dbData.album,
        duration: dbData.duration,
        fileUrl: dbData.file_url,
        fileSize: dbData.file_size,
        isPublic: dbData.is_public,
        downloadCount: dbData.download_count,
        playCount: dbData.play_count,
        createdAt: new Date(dbData.created_at)
      };
    } catch (error) {
      console.error('Failed to upload track:', error);
      throw error;
    }
  }

  /**
   * Extract metadata from audio file
   */
  async extractMetadata(file: File): Promise<{
    title: string;
    artist: string;
    album: string;
    duration: number;
  }> {
    try {
      const metadata = await parseFile(file as any);

      return {
        title: metadata.common.title || file.name.replace(/\.[^/.]+$/, ''),
        artist: metadata.common.artist || 'Unknown Artist',
        album: metadata.common.album || '',
        duration: Math.floor(metadata.format.duration || 0)
      };
    } catch (error) {
      console.error('Failed to extract metadata:', error);
      // Return defaults if extraction fails
      return {
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: 'Unknown Artist',
        album: '',
        duration: 0
      };
    }
  }

  /**
   * Create a playlist
   */
  async createPlaylist(
    userId: string,
    name: string,
    description?: string,
    isPublic: boolean = false
  ): Promise<Playlist> {
    try {
      const playlistId = uuidv4();

      const { data, error } = await this.supabase
        .from('playlists')
        .insert({
          id: playlistId,
          user_id: userId,
          name,
          description: description || '',
          is_public: isPublic
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log(`Playlist created: ${name}`);

      return {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        description: data.description,
        isPublic: data.is_public,
        trackCount: data.track_count,
        createdAt: new Date(data.created_at)
      };
    } catch (error) {
      console.error('Failed to create playlist:', error);
      throw error;
    }
  }

  /**
   * Add track to playlist
   */
  async addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
    try {
      // Get current max position
      const { data: posData } = await this.supabase
        .from('playlist_tracks')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1)
        .single();

      const position = posData ? posData.position + 1 : 0;

      const { error } = await this.supabase
        .from('playlist_tracks')
        .insert({
          playlist_id: playlistId,
          track_id: trackId,
          position
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Track already in playlist');
        }
        throw error;
      }

      console.log(`Track ${trackId} added to playlist ${playlistId}`);
    } catch (error) {
      console.error('Failed to add track to playlist:', error);
      throw error;
    }
  }

  /**
   * Get playlist with tracks
   */
  async getPlaylist(playlistId: string): Promise<Playlist & { tracks: MusicTrack[] }> {
    try {
      // Get playlist info
      const { data: playlistData, error: playlistError } = await this.supabase
        .from('playlists')
        .select('*')
        .eq('id', playlistId)
        .single();

      if (playlistError) {
        throw playlistError;
      }

      // Get tracks
      const { data: tracksData, error: tracksError } = await this.supabase
        .from('playlist_tracks')
        .select(`
          position,
          music_tracks (*)
        `)
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true });

      if (tracksError) {
        throw tracksError;
      }

      const tracks = (tracksData || []).map((item: any) => ({
        id: item.music_tracks.id,
        userId: item.music_tracks.user_id,
        title: item.music_tracks.title,
        artist: item.music_tracks.artist,
        album: item.music_tracks.album,
        duration: item.music_tracks.duration,
        fileUrl: item.music_tracks.file_url,
        fileSize: item.music_tracks.file_size,
        isPublic: item.music_tracks.is_public,
        downloadCount: item.music_tracks.download_count,
        playCount: item.music_tracks.play_count,
        createdAt: new Date(item.music_tracks.created_at)
      }));

      return {
        id: playlistData.id,
        userId: playlistData.user_id,
        name: playlistData.name,
        description: playlistData.description,
        isPublic: playlistData.is_public,
        trackCount: playlistData.track_count,
        createdAt: new Date(playlistData.created_at),
        tracks
      };
    } catch (error) {
      console.error('Failed to get playlist:', error);
      throw error;
    }
  }

  /**
   * Stream track (increment play count)
   */
  async streamTrack(trackId: string): Promise<string> {
    try {
      // Get track
      const { data, error } = await this.supabase
        .from('music_tracks')
        .select('file_url, play_count')
        .eq('id', trackId)
        .single();

      if (error) {
        throw error;
      }

      // Increment play count
      await this.supabase
        .from('music_tracks')
        .update({ play_count: (data.play_count || 0) + 1 })
        .eq('id', trackId);

      return data.file_url;
    } catch (error) {
      console.error('Failed to stream track:', error);
      throw error;
    }
  }

  /**
   * Download track (Pro users only)
   */
  async downloadTrack(trackId: string, userId: string, isPro: boolean): Promise<Blob> {
    try {
      if (!isPro) {
        throw new Error('Offline download is a Pro feature. Upgrade to Pro to download tracks.');
      }

      // Get track
      const { data, error } = await this.supabase
        .from('music_tracks')
        .select('file_url, download_count')
        .eq('id', trackId)
        .single();

      if (error) {
        throw error;
      }

      // Download file
      const response = await fetch(data.file_url);
      const blob = await response.blob();

      // Increment download count
      await this.supabase
        .from('music_tracks')
        .update({ download_count: (data.download_count || 0) + 1 })
        .eq('id', trackId);

      console.log(`Track ${trackId} downloaded by user ${userId}`);
      return blob;
    } catch (error) {
      console.error('Failed to download track:', error);
      throw error;
    }
  }

  /**
   * Delete track from cloud (after download for Pro users)
   */
  async deleteFromCloud(trackId: string, userId: string): Promise<void> {
    try {
      // Verify ownership
      const { data: trackData } = await this.supabase
        .from('music_tracks')
        .select('user_id, file_url')
        .eq('id', trackId)
        .single();

      if (!trackData || trackData.user_id !== userId) {
        throw new Error('Unauthorized');
      }

      // Extract file path from URL
      const url = new URL(trackData.file_url);
      const filePath = url.pathname.split('/').slice(-3).join('/');

      // Delete from storage
      await this.supabase.storage
        .from('files')
        .remove([filePath]);

      // Delete from database
      await this.supabase
        .from('music_tracks')
        .delete()
        .eq('id', trackId);

      console.log(`Track ${trackId} deleted from cloud`);
    } catch (error) {
      console.error('Failed to delete from cloud:', error);
      throw error;
    }
  }

  /**
   * Get user's tracks
   */
  async getUserTracks(userId: string): Promise<MusicTrack[]> {
    try {
      const { data, error } = await this.supabase
        .from('music_tracks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map(track => ({
        id: track.id,
        userId: track.user_id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
        fileUrl: track.file_url,
        fileSize: track.file_size,
        isPublic: track.is_public,
        downloadCount: track.download_count,
        playCount: track.play_count,
        createdAt: new Date(track.created_at)
      }));
    } catch (error) {
      console.error('Failed to get user tracks:', error);
      throw error;
    }
  }

  /**
   * Get user's playlists
   */
  async getUserPlaylists(userId: string): Promise<Playlist[]> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_user_playlists', { p_user_id: userId });

      if (error) {
        throw error;
      }

      return (data || []).map((playlist: any) => ({
        id: playlist.id,
        userId: playlist.user_id,
        name: playlist.name,
        description: playlist.description,
        isPublic: playlist.is_public,
        trackCount: playlist.track_count,
        createdAt: new Date(playlist.created_at)
      }));
    } catch (error) {
      console.error('Failed to get user playlists:', error);
      throw error;
    }
  }
}

// Export singleton instance
let musicManagerInstance: MusicManager | null = null;

export function initializeMusicManager(
  supabaseUrl: string,
  supabaseKey: string
): MusicManager {
  if (!musicManagerInstance) {
    musicManagerInstance = new MusicManager(supabaseUrl, supabaseKey);
  }
  return musicManagerInstance;
}

export function getMusicManager(): MusicManager {
  if (!musicManagerInstance) {
    throw new Error('MusicManager not initialized. Call initializeMusicManager first.');
  }
  return musicManagerInstance;
}
