import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class ImageUploadService {
  private supabase: SupabaseClient;
  private bucket: string;
  private bbimgApiKey?: string;
  private maxSizeMB: number;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    bucket: string,
    bbimgApiKey?: string,
    maxSizeMB: number = 10
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.bucket = bucket;
    this.bbimgApiKey = bbimgApiKey;
    this.maxSizeMB = maxSizeMB;
  }

  isAvailable(): boolean {
    return true;
  }

  async uploadImage(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<{ url: string; imageUrl: string; provider: string }> {
    const timestamp = Date.now();
    const ext = filename.split('.').pop();
    const path = `images/${timestamp}_${Math.random().toString(36).substring(7)}.${ext}`;

    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    const { data: urlData } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(path);

    const publicUrl = urlData.publicUrl;

    return { 
      url: publicUrl,
      imageUrl: publicUrl,
      provider: 'supabase'
    };
  }
}
