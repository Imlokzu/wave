import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { Channel, ChannelPost } from '../models';

export interface IChannelManager {
  listChannels(): Promise<Channel[]>;
  createChannel(name: string, description: string | null, createdBy: string, createdByName: string): Promise<Channel>;
  listPosts(channelId: string, currentUserId?: string): Promise<ChannelPost[]>;
  createPost(channelId: string, content: string, createdBy: string, createdByName: string): Promise<ChannelPost>;
  toggleReaction(postId: string, userId: string, emoji: string): Promise<Record<string, number>>;
}

class InMemoryChannelManager implements IChannelManager {
  private channels = new Map<string, Channel>();
  private posts = new Map<string, ChannelPost[]>();
  private reactions = new Map<string, Map<string, Set<string>>>(); // postId -> userId -> emojis

  async listChannels(): Promise<Channel[]> {
    return Array.from(this.channels.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createChannel(name: string, description: string | null, createdBy: string, createdByName: string): Promise<Channel> {
    const channel: Channel = {
      id: uuidv4(),
      name,
      description,
      createdAt: new Date(),
      createdBy,
      createdByName,
      isActive: true,
    };
    this.channels.set(channel.id, channel);
    return channel;
  }

  async listPosts(channelId: string, currentUserId?: string): Promise<ChannelPost[]> {
    const posts = this.posts.get(channelId) || [];
    return posts.map(p => ({
      ...p,
      reactions: this.getReactionCounts(p.id),
      myReactions: currentUserId ? this.getUserReactions(p.id, currentUserId) : [],
    }));
  }

  async createPost(channelId: string, content: string, createdBy: string, createdByName: string): Promise<ChannelPost> {
    const post: ChannelPost = {
      id: uuidv4(),
      channelId,
      content,
      createdAt: new Date(),
      createdBy,
      createdByName,
    };
    const list = this.posts.get(channelId) || [];
    list.unshift(post);
    this.posts.set(channelId, list);
    return post;
  }

  async toggleReaction(postId: string, userId: string, emoji: string): Promise<Record<string, number>> {
    if (!this.reactions.has(postId)) {
      this.reactions.set(postId, new Map());
    }
    const userMap = this.reactions.get(postId)!;
    if (!userMap.has(userId)) {
      userMap.set(userId, new Set());
    }
    const emojiSet = userMap.get(userId)!;
    if (emojiSet.has(emoji)) {
      emojiSet.delete(emoji);
    } else {
      emojiSet.add(emoji);
    }
    return this.getReactionCounts(postId);
  }

  private getReactionCounts(postId: string): Record<string, number> {
    const counts: Record<string, number> = {};
    const userMap = this.reactions.get(postId);
    if (!userMap) return counts;
    userMap.forEach(emojis => {
      emojis.forEach(e => {
        counts[e] = (counts[e] || 0) + 1;
      });
    });
    return counts;
  }

  private getUserReactions(postId: string, userId: string): string[] {
    const userMap = this.reactions.get(postId);
    if (!userMap) return [];
    const emojis = userMap.get(userId);
    return emojis ? Array.from(emojis) : [];
  }
}

class SupabaseChannelManager implements IChannelManager {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async listChannels(): Promise<Channel[]> {
    const { data, error } = await this.supabase
      .from('channels')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: new Date(row.created_at),
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      isActive: row.is_active,
    }));
  }

  async createChannel(name: string, description: string | null, createdBy: string, createdByName: string): Promise<Channel> {
    const { data, error } = await this.supabase
      .from('channels')
      .insert({
        name,
        description,
        created_by: createdBy,
        created_by_name: createdByName,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      createdAt: new Date(data.created_at),
      createdBy: data.created_by,
      createdByName: data.created_by_name,
      isActive: data.is_active,
    };
  }

  async listPosts(channelId: string, currentUserId?: string): Promise<ChannelPost[]> {
    const { data: posts, error } = await this.supabase
      .from('channel_posts')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const postIds = (posts || []).map(p => p.id);
    let reactions: any[] = [];
    if (postIds.length > 0) {
      const { data: reactionRows, error: reactionsError } = await this.supabase
        .from('channel_reactions')
        .select('post_id, user_id, emoji')
        .in('post_id', postIds);
      if (reactionsError) throw reactionsError;
      reactions = reactionRows || [];
    }

    const reactionCounts: Record<string, Record<string, number>> = {};
    const userReactions: Record<string, string[]> = {};

    reactions.forEach(r => {
      if (!reactionCounts[r.post_id]) reactionCounts[r.post_id] = {};
      reactionCounts[r.post_id][r.emoji] = (reactionCounts[r.post_id][r.emoji] || 0) + 1;
      if (currentUserId && r.user_id === currentUserId) {
        if (!userReactions[r.post_id]) userReactions[r.post_id] = [];
        userReactions[r.post_id].push(r.emoji);
      }
    });

    return (posts || []).map(row => ({
      id: row.id,
      channelId: row.channel_id,
      content: row.content,
      createdAt: new Date(row.created_at),
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      reactions: reactionCounts[row.id] || {},
      myReactions: userReactions[row.id] || [],
    }));
  }

  async createPost(channelId: string, content: string, createdBy: string, createdByName: string): Promise<ChannelPost> {
    const { data, error } = await this.supabase
      .from('channel_posts')
      .insert({
        channel_id: channelId,
        content,
        created_by: createdBy,
        created_by_name: createdByName,
      })
      .select('*')
      .single();

    if (error) throw error;

    return {
      id: data.id,
      channelId: data.channel_id,
      content: data.content,
      createdAt: new Date(data.created_at),
      createdBy: data.created_by,
      createdByName: data.created_by_name,
      reactions: {},
      myReactions: [],
    };
  }

  async toggleReaction(postId: string, userId: string, emoji: string): Promise<Record<string, number>> {
    const { data: existing, error: checkError } = await this.supabase
      .from('channel_reactions')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing?.id) {
      const { error: deleteError } = await this.supabase
        .from('channel_reactions')
        .delete()
        .eq('id', existing.id);
      if (deleteError) throw deleteError;
    } else {
      const { error: insertError } = await this.supabase
        .from('channel_reactions')
        .insert({ post_id: postId, user_id: userId, emoji });
      if (insertError) throw insertError;
    }

    const { data: reactionRows, error: reactionsError } = await this.supabase
      .from('channel_reactions')
      .select('emoji')
      .eq('post_id', postId);
    if (reactionsError) throw reactionsError;

    const counts: Record<string, number> = {};
    (reactionRows || []).forEach(r => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    });
    return counts;
  }
}

export function createChannelManager(supabaseUrl?: string, supabaseKey?: string): IChannelManager {
  if (supabaseUrl && supabaseKey) {
    return new SupabaseChannelManager(supabaseUrl, supabaseKey);
  }
  return new InMemoryChannelManager();
}
