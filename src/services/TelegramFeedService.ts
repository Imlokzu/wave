import { createClient } from '@supabase/supabase-js';

interface FeedChannel {
  id: string;
  user_id: string;
  channel_url: string;
  channel_name: string;
  created_at: string;
}

interface FeedPost {
  message_id: number;
  channel_id: string;
  channel_name: string;
  date: string;
  message: string;
  media_path?: string;
  views?: number;
  forwards?: number;
  sender_id?: number;
  username?: string;
}

let telegramFeedServiceInstance: TelegramFeedService | null = null;

export function initializeTelegramFeedService(supabaseUrl: string, supabaseKey: string) {
  console.log('Telegram Feed Service initialized');
  telegramFeedServiceInstance = new TelegramFeedService(supabaseUrl, supabaseKey);
  return telegramFeedServiceInstance;
}

export function getTelegramFeedService(): TelegramFeedService {
  if (!telegramFeedServiceInstance) {
    throw new Error('Telegram Feed Service not initialized. Call initializeTelegramFeedService first.');
  }
  return telegramFeedServiceInstance;
}

export class TelegramFeedService {
  private supabase;

  constructor(private supabaseUrl: string, private supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getUserChannels(userId: string): Promise<FeedChannel[]> {
    // First get user's channels from our database
    const { data, error } = await this.supabase
      .from('telegram_channels')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user channels:', error);
      return [];
    }

    return data || [];
  }

  async addChannel(userId: string, channelUrl: string): Promise<FeedChannel> {
    // Validate the channel URL first by calling the feed bot
    const feedBotUrl = process.env.FEED_BOT_URL || `http://${process.env.HOST || 'localhost'}:3000`;
    
    try {
      // Check if channel already exists
      const { data: existing } = await this.supabase
        .from('telegram_channels')
        .select('*')
        .eq('user_id', userId)
        .eq('channel_url', channelUrl)
        .single();

      if (existing) {
        console.log('Channel already exists, returning existing channel');
        return existing;
      }

      // First, try to scrape the channel to validate it exists
      const response = await fetch(`${feedBotUrl}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: channelUrl,
          limit: 5
        })
      });

      const result: any = await response.json();
      
      if (result.status !== 'success') {
        throw new Error(result.detail || 'Failed to add channel');
      }

      // Extract channel name from the response
      const channelName = result.channel_id ? result.channel_id.replace('-100', '') : 'Unknown Channel';
      
      // Add to our database
      const { data, error } = await this.supabase
        .from('telegram_channels')
        .insert([{ user_id: userId, channel_url: channelUrl, channel_name: channelName }])
        .select()
        .single();

      if (error) {
        // If it's a duplicate error, fetch and return the existing channel
        if (error.code === '23505') {
          const { data: existingChannel } = await this.supabase
            .from('telegram_channels')
            .select('*')
            .eq('user_id', userId)
            .eq('channel_url', channelUrl)
            .single();
          
          if (existingChannel) {
            return existingChannel;
          }
        }
        
        console.error('Error adding channel to database:', error);
        throw new Error('Failed to save channel to database');
      }

      return data;
    } catch (error) {
      console.error('Error adding channel:', error);
      throw error;
    }
  }

  async removeChannel(userId: string, channelId: string): Promise<void> {
    const { error } = await this.supabase
      .from('telegram_channels')
      .delete()
      .eq('id', channelId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing channel:', error);
      throw new Error('Failed to remove channel');
    }
  }

  async getFeedPosts(userId: string, limit: number = 20): Promise<FeedPost[]> {
    // Get user's channels first
    const channels = await this.getUserChannels(userId);
    
    if (channels.length === 0) {
      return [];
    }

    try {
      const feedBotUrl = process.env.FEED_BOT_URL || `http://${process.env.HOST || 'localhost'}:3000`;
      
      console.log(`Loading feed from bot cache for ${channels.length} channels`);
      
      // Use bot's cached data (fast and reliable!)
      const cachedResponse = await fetch(`${feedBotUrl}/posts?limit=${limit * 2}`, {
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!cachedResponse.ok) {
        throw new Error(`Bot returned ${cachedResponse.status}`);
      }
      
      const cachedResult: any = await cachedResponse.json();
      
      if (cachedResult.status === 'success' && cachedResult.messages) {
        console.log(`✅ Got ${cachedResult.messages.length} cached posts from bot`);
        
        // Filter to only user's channels
        const userChannelIds = new Set(channels.map(c => {
          const id = c.channel_url.split('/').pop();
          return id;
        }));
        
        const posts = cachedResult.messages
          .filter((msg: any) => {
            // Check if this message is from one of user's channels
            const msgChannelId = msg.channel_id?.replace('-100', '') || msg.channel_name;
            const msgChannelName = msg.channel_name?.toLowerCase();
            
            // Match by channel ID or name
            for (const channel of channels) {
              const channelId = channel.channel_url.split('/').pop()?.toLowerCase();
              const channelName = channel.channel_name?.toLowerCase();
              
              if (msgChannelId === channelId || 
                  msgChannelName === channelId ||
                  msgChannelName === channelName ||
                  channel.channel_url.toLowerCase().includes(msgChannelId)) {
                return true;
              }
            }
            return false;
          })
          .map((msg: any) => ({
            message_id: msg.message_id,
            channel_id: msg.channel_id,
            channel_name: msg.channel_name || 'Unknown',
            date: msg.date,
            message: msg.message || '',
            media_path: msg.media_url ? `http://localhost:3000${msg.media_url}` : undefined,
            media_url: msg.media_url ? `http://localhost:3000${msg.media_url}` : undefined,
            views: msg.views || 0,
            forwards: msg.forwards || 0,
            sender_id: msg.sender_id,
            username: msg.username
          }));
        
        console.log(`✅ Filtered to ${posts.length} posts from user's channels`);
        
        // Sort by date and return
        posts.sort((a: FeedPost, b: FeedPost) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return posts.slice(0, limit);
      }
      
      console.log('No cached data available');
      return [];
      
    } catch (error) {
      console.error('Error fetching feed posts:', error);
      return [];
    }
  }
}
