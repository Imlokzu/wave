import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';

/**
 * Extended Request interface with user data
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    nickname: string;
  };
}

/**
 * Authentication middleware
 * Verifies session token and attaches user data to request
 */
export function requireAuth(authService: AuthService) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        res.status(401).json({
          error: 'Access token required',
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

      // Attach user data to request
      req.user = {
        id: user.id,
        username: user.username,
        nickname: user.nickname
      };
      
      next();
    } catch (error: any) {
      console.error('Authentication error:', error);
      res.status(500).json({
        error: 'Authentication failed',
        code: 'AUTH_ERROR'
      });
    }
  };
}
