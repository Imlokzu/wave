import { Request, Response, NextFunction } from 'express';
import { IUserManager } from '../managers/IUserManager';
import { AuthService } from '../services/AuthService';

/**
 * Extended Request interface with admin user data
 */
export interface AdminAuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    nickname: string;
    isAdmin: boolean;
  };
}

/**
 * Admin authentication middleware
 * Verifies session token and checks admin status
 */
export function requireAdmin(authService: AuthService) {
  return async (
    req: AdminAuthenticatedRequest,
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
      const user = await authService.validateToken(token);

      if (!user) {
        res.status(401).json({
          error: 'Invalid or expired session',
          code: 'INVALID_SESSION'
        });
        return;
      }

      // Check admin status
      if (!user.isAdmin) {
        res.status(403).json({
          error: 'Admin access required',
          code: 'FORBIDDEN'
        });
        return;
      }

      // Attach user data to request
      req.user = {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        isAdmin: true
      };
      
      next();
    } catch (error: any) {
      console.error('Admin authentication error:', error);
      res.status(500).json({
        error: 'Authentication failed',
        code: 'AUTH_ERROR'
      });
    }
  };
}
