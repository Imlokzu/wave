import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';
import { config } from './config';
import { InMemoryStorage, RoomManager, MessageManager } from './managers';
import { UserManager } from './managers/UserManager';
import { DMManager } from './managers/DMManager';
import { SupabaseUserManager } from './managers/SupabaseUserManager';
import { SupabaseDMManager } from './managers/SupabaseDMManager';
import { SupabaseRoomManager } from './managers/SupabaseRoomManager';
import { ImageUploadService } from './services';
import { FileUploadService } from './services/FileUploadService';
import { createRoomRouter, createMessageRouter, createActionsRouter, errorHandler, notFoundHandler } from './routes';
import { createUserRouter } from './routes/users';
import { createDMRouter } from './routes/dms';
import { createChatRouter } from './routes/chats';
import { createInvitesRouter } from './routes/invites';
import { createAuthRouter } from './routes/auth';
import { createProfileRouter } from './routes/profile';
import { createAIRouter } from './routes/ai';
import { setupSocketIO } from './socket/socketHandler';
import { initializeEnhancedAIService } from './services/EnhancedAIService';
import { initializeUnifiedAIService } from './services/UnifiedAIService';
import { initializeProfileManager } from './managers/ProfileManager';
import { initializeSubscriptionManager } from './managers/SubscriptionManager';
import { createSubscriptionRouter } from './routes/subscription';
import feedRouter from './routes/feed';
import { initializeTelegramFeedService } from './services/TelegramFeedService';
import { createReportsRouter } from './routes/reports';
import { createSettingsRouter } from './routes/settings';
import { createSearchRouter } from './routes/search';
import { createAIChatRouter } from './routes/ai-chat';
import weatherRouter from './routes/weather';
import versionRouter from './routes/version';

// Initialize storage and managers
const storage = new InMemoryStorage();
const roomStorage = config.supabaseUrl && config.supabaseKey
  ? new SupabaseRoomManager(config.supabaseUrl, config.supabaseKey)
  : storage;
const roomManager = new RoomManager(roomStorage);
const messageManager = new MessageManager(storage, config.messageExpirationMinutes);

// Use Supabase managers if configured, otherwise use in-memory
const userManager = config.supabaseUrl && config.supabaseKey
  ? new SupabaseUserManager(config.supabaseUrl, config.supabaseKey)
  : new UserManager();

const dmManager = config.supabaseUrl && config.supabaseKey
  ? new SupabaseDMManager(config.supabaseUrl, config.supabaseKey)
  : new DMManager();

// Initialize image upload service
const imageUploadService = new ImageUploadService(
  config.supabaseUrl,
  config.supabaseKey,
  config.supabaseBucket,
  config.bbimgApiKey,
  config.maxImageSizeMB
);

// Initialize file upload service with Supabase
const fileUploadService = new FileUploadService(
  config.supabaseUrl,
  config.supabaseKey,
  config.supabaseBucket, // Use same bucket as images or separate 'files' bucket
  10 // 10MB max file size
);

// Initialize Enhanced AI service with OpenRouter API key
const aiService = initializeEnhancedAIService(process.env.OPENAI_API_KEY);
console.log('✅ Enhanced AI Service initialized with multiple models');

// Initialize Unified AI service with OpenRouter API key
if (process.env.OPENAI_API_KEY) {
  try {
    initializeUnifiedAIService(process.env.OPENAI_API_KEY);
    console.log('✅ Unified AI Service initialized with model selection support');
    console.log(`   API Key: ${process.env.OPENAI_API_KEY.substring(0, 20)}...`);
  } catch (error: any) {
    console.error('❌ Failed to initialize Unified AI Service:', error.message);
  }
} else {
  console.warn('⚠️  OPENAI_API_KEY not found - Unified AI Service will not work');
}

// Initialize profile manager
if (config.supabaseUrl && config.supabaseKey) {
  initializeProfileManager(config.supabaseUrl, config.supabaseKey);
}

// Initialize subscription manager
if (config.supabaseUrl && config.supabaseKey) {
  initializeSubscriptionManager(config.supabaseUrl, config.supabaseKey);
}

// Initialize telegram feed service
if (config.supabaseUrl && config.supabaseKey) {
  initializeTelegramFeedService(config.supabaseUrl, config.supabaseKey);
}

// Create Express app
const app = express();
const httpServer = createServer(app);

// Setup Socket.IO
const io = setupSocketIO(httpServer, roomManager, messageManager, imageUploadService, userManager, dmManager, fileUploadService);

// Middleware - CORS configuration
const corsOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'https://metrocraft.eu',
  'https://www.metrocraft.eu',
  'https://app.metrocraft.eu',
  'https://api.metrocraft.eu',
  'https://admin.metrocraft.eu'
];

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

// Handle OPTIONS requests explicitly for CORS preflight
app.options('*', cors({
  origin: corsOrigins,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (for the client UI)
// In development, public folder is at root level (../../public from dist/)
// In production (Passenger), it's also at root level
const publicPath = path.join(__dirname, '../../public');
app.use(express.static(publicPath));

// Note: Files are now served from Supabase Storage, not local uploads folder

// Redirect root to login page
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'login.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      imageUpload: imageUploadService.isAvailable(),
      fileUpload: true,
    },
  });
});

// API Routes
import { initializeDeepSeekService } from './services/DeepSeekAIService';
import { createAdminRouter } from './routes/admin';

// Initialize DeepSeek AI service with OpenRouter API key
if (process.env.OPENAI_API_KEY) {
  initializeDeepSeekService(process.env.OPENAI_API_KEY);
  console.log('✅ DeepSeek AI Service initialized with web search support');
} else {
  console.warn('⚠️  OPENAI_API_KEY not found - AI chat with search will not work');
}

app.use('/api/auth', createAuthRouter(userManager));
app.use('/api/rooms', createRoomRouter(roomManager));
app.use('/api/rooms', createMessageRouter(messageManager, imageUploadService, fileUploadService));
app.use('/api/rooms', createActionsRouter(messageManager, roomManager));
app.use('/api/users', createUserRouter(userManager));
app.use('/api/dms', createDMRouter(dmManager, userManager));
app.use('/api/chats', createChatRouter(userManager, dmManager, roomManager, messageManager));
app.use('/api/invites', createInvitesRouter());
app.use('/api/profile', createProfileRouter(userManager));
app.use('/api/ai', createAIRouter(userManager));
app.use('/api/subscription', createSubscriptionRouter(userManager));
app.use('/api/feed', feedRouter);
app.use('/api/settings', createSettingsRouter(userManager));
app.use('/api/search', createSearchRouter());
app.use('/api/ai-chat', createAIChatRouter());
app.use('/api/reports', createReportsRouter(userManager));
app.use('/api/admin', createAdminRouter(userManager));
app.use('/api/weather', weatherRouter);
app.use('/api/version', versionRouter);

// Serve admin panel static files
app.use('/admin', express.static(path.join(__dirname, '../../admin/public')));

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server - Passenger will provide the port via environment
const PORT = process.env.PORT || config.port;
const isDevelopment = process.env.NODE_ENV === 'development';
const isPassenger = process.env.PASSENGER_APP_ENV === 'true' || typeof (global as any).PhusionPassenger !== 'undefined';

// Check if running under Passenger (production only)
if (isPassenger && !isDevelopment) {
  console.log('🚀 WaveChat Server starting in Passenger mode');
  console.log('🔌 Passenger will provide port binding');
  console.log(`🖼️  Image upload: ${imageUploadService.isAvailable() ? 'Enabled' : 'Disabled'}`);
  console.log(`📎 File upload: ${fileUploadService.isAvailable() ? 'Enabled' : 'Disabled'}`);
  
  // For Passenger, we need to listen but Passenger controls the port
  // Listen on port 0 to let Passenger assign the port, or use Passenger's port
  const passengerPort = process.env.PASSENGER_PORT || 0;
  httpServer.listen(passengerPort, () => {
    console.log('✅ Server ready for Passenger');
    
    // Schedule cleanup of expired rooms every 5 minutes
    setInterval(() => {
      roomManager.cleanupExpiredRooms().catch(console.error);
    }, 5 * 60 * 1000);
  });
} else {
  // Development mode - bind to specified port
  httpServer.listen(PORT, () => {
    console.log('🚀 WaveChat Server running in DEVELOPMENT mode');
    console.log(`🌐 Server: http://localhost:${PORT}`);
    console.log(`🖼️  Image upload: ${imageUploadService.isAvailable() ? 'Enabled' : 'Disabled'}`);
    console.log(`📎 File upload: ${fileUploadService.isAvailable() ? 'Enabled' : 'Disabled'}`);
    console.log('');
    console.log('📝 Frontend should use: http://localhost:' + PORT);
    
    // Schedule cleanup of expired rooms every 5 minutes
    setInterval(() => {
      roomManager.cleanupExpiredRooms().catch(console.error);
    }, 5 * 60 * 1000);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  messageManager.cleanup();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  messageManager.cleanup();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, httpServer, io, storage, roomManager, messageManager, imageUploadService, fileUploadService, userManager, dmManager };
