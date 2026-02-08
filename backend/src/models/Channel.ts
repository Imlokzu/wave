export interface Channel {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  createdBy?: string | null;
  createdByName?: string | null;
  isActive: boolean;
}

export interface ChannelPost {
  id: string;
  channelId: string;
  content: string;
  createdAt: Date;
  createdBy?: string | null;
  createdByName?: string | null;
  reactions?: Record<string, number>;
  myReactions?: string[];
}

export interface ChannelReaction {
  id: string;
  postId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
}
