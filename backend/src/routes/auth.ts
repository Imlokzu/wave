import { Router, Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { IUserManager } from '../managers/IUserManager';

/**
 * Create authentication router
 * Handles signup, login, logout, and session validation
 */
export function createAuthRouter(userManager: IUserManager): Router {
  const router = Router();
  const authService = new AuthService(userManager);

  /**
   * POST /api/auth/signup
   * Register a new user
   */
  router.post('/signup', async (req: Request, res: Response) => {
    try {
      const { username, nickname, password } = req.body;

      // Validate required fields
      if (!username || !password) {
        res.status(400).json({
          error: 'Username and password are required',
          code: 'MISSING_FIELDS'
        });
        return;
      }

      // Validate password strength (min 8 chars)
      if (password.length < 8) {
        res.status(400).json({
          error: 'Password must be at least 8 characters long',
          code: 'WEAK_PASSWORD'
        });
        return;
      }

      // Signup user
      const result = await authService.signup(
        username,
        nickname || username,
        password
      );

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: result.user.id,
          username: result.user.username,
          nickname: result.user.nickname
        },
        token: result.token
      });
    } catch (error: any) {
      console.error('Signup error:', error);
      
      if (error.message === 'Username is already taken') {
        res.status(409).json({
          error: error.message,
          code: 'USERNAME_EXISTS'
        });
        return;
      }

      res.status(500).json({
        error: 'Signup failed',
        code: 'SERVER_ERROR',
        message: error.message
      });
    }
  });

  /**
   * POST /api/auth/login
   * Login with username and password
   */
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      // Validate required fields
      if (!username || !password) {
        res.status(400).json({
          error: 'Username and password are required',
          code: 'MISSING_FIELDS'
        });
        return;
      }

      // Login user
      const result = await authService.login(username, password);

      res.json({
        message: 'Login successful',
        user: {
          id: result.user.id,
          username: result.user.username,
          nickname: result.user.nickname
        },
        token: result.token
      });
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.message === 'Invalid username or password' || error.message === 'User has no password set') {
        res.status(401).json({
          error: 'Invalid username or password',
          code: 'INVALID_CREDENTIALS'
        });
        return;
      }

      res.status(500).json({
        error: 'Login failed',
        code: 'SERVER_ERROR',
        message: error.message
      });
    }
  });

  /**
   * POST /api/auth/logout
   * Logout and destroy session
   */
  router.post('/logout', async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        res.status(400).json({
          error: 'No token provided',
          code: 'NO_TOKEN'
        });
        return;
      }

      // Destroy session
      await authService.destroySession(token);

      res.json({
        message: 'Logged out successfully'
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({
        error: 'Logout failed',
        code: 'SERVER_ERROR'
      });
    }
  });

  /**
   * GET /api/auth/session
   * Validate session and get current user
   */
  router.get('/session', async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        res.status(401).json({
          error: 'No token provided',
          code: 'NO_TOKEN'
        });
        return;
      }

      // Validate session
      const user = await authService.validateSession(token);

      if (!user) {
        res.status(401).json({
          error: 'Invalid or expired session',
          code: 'INVALID_SESSION'
        });
        return;
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname
        }
      });
    } catch (error: any) {
      console.error('Session validation error:', error);
      res.status(500).json({
        error: 'Session validation failed',
        code: 'SERVER_ERROR'
      });
    }
  });

  return router;
}
