import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';
import { config } from './config';
import { SupabaseUserManager } from './managers/SupabaseUserManager';
import { createAdminRouter } from './routes/admin';
import { createAuthRouter } from './routes/auth';

// Initialize user manager
const userManager = new SupabaseUserManager(config.supabaseUrl!, config.supabaseKey!);

// Create Express app
const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from admin public folder
app.use(express.static(path.join(__dirname, '../admin/public')));

// Redirect root to admin login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/public/login.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'admin-panel',
    timestamp: new Date().toISOString()
  });
});

// API Routes
import { AuthService } from './services/AuthService';
const authService = new AuthService(userManager);

app.use('/api/auth', createAuthRouter(userManager));
app.use('/api/admin', createAdminRouter(authService));

// Error handlers
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = 3004;

httpServer.listen(PORT, () => {
  console.log(`🔐 Wave Admin Panel running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`👨‍💼 Admin UI: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down admin server...');
  httpServer.close(() => {
    console.log('Admin server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down admin server...');
  httpServer.close(() => {
    console.log('Admin server closed');
    process.exit(0);
  });
});

export { app, httpServer };
