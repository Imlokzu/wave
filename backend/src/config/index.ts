import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Application configuration
 */
export interface Config {
  // Server
  port: number;
  nodeEnv: string;

  // Supabase
  supabaseUrl: string;
  supabaseKey: string;
  supabaseBucket: string;

  // BBImg
  bbimgApiKey?: string;

  // AI Service
  aiServiceUrl: string;
  aiModel: string;

  // Message settings
  messageExpirationMinutes: number;
  maxRoomSize: number;
  cleanupIntervalSeconds: number;
  maxMessageLength: number;
  maxImageSizeMB: number;
  rateLimitMessagesPerMinute: number;
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): Config {
  return {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_KEY || '',
    supabaseBucket: process.env.SUPABASE_BUCKET || 'flux-images',

    bbimgApiKey: process.env.BBIMG_API_KEY,

    aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:11434',
    aiModel: process.env.AI_MODEL || 'llama2',

    messageExpirationMinutes: parseInt(process.env.MESSAGE_EXPIRATION_MINUTES || '30', 10),
    maxRoomSize: parseInt(process.env.MAX_ROOM_SIZE || '50', 10),
    cleanupIntervalSeconds: parseInt(process.env.CLEANUP_INTERVAL_SECONDS || '60', 10),
    maxMessageLength: parseInt(process.env.MAX_MESSAGE_LENGTH || '2000', 10),
    maxImageSizeMB: parseInt(process.env.MAX_IMAGE_SIZE_MB || '5', 10),
    rateLimitMessagesPerMinute: parseInt(process.env.RATE_LIMIT_MESSAGES_PER_MINUTE || '30', 10),
  };
}

export const config = loadConfig();
