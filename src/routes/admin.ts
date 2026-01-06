import { Router, Response } from 'express';
import { IUserManager } from '../managers/IUserManager';
import { AuthService } from '../services/AuthService';
import { requireAdmin, AdminAuthenticatedRequest } from '../middleware/admin-auth';

/**
 * Create admin router
 * Handles admin-only operations
 */
export function createAdminRouter(userManager: IUserManager): Router {
  const router = Router();
  const authService = new AuthService(userManager);

  // Apply admin authentication to all routes
  router.use(requireAdmin(authService, userManager));

  /**
   * GET /api/admin/stats
   * Get system statistics
   */
  router.get('/stats', async (req: AdminAuthenticatedRequest, res: Response) => {
    try {
      const users = await userManager.getAllUsers();
      
      const stats = {
        totalUsers: users.length,
        proUsers: users.filter(u => u.isPro).length,
        adminUsers: users.filter(u => u.isAdmin).length,
        onlineUsers: users.filter(u => u.status === 'online').length,
        timestamp: new Date().toISOString()
      };

      res.json(stats);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      res.status(500).json({
        error: 'Failed to fetch statistics',
        code: 'SERVER_ERROR'
      });
    }
  });

  /**
   * GET /api/admin/users
   * Get all users with pagination
   */
  router.get('/users', async (req: AdminAuthenticatedRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string;

      let users = await userManager.getAllUsers();

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        users = users.filter(u => 
          u.username.toLowerCase().includes(searchLower) ||
          u.nickname.toLowerCase().includes(searchLower)
        );
      }

      // Pagination
      const total = users.length;
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedUsers = users.slice(start, end);

      res.json({
        users: paginatedUsers.map(u => ({
          id: u.id,
          username: u.username,
          nickname: u.nickname,
          status: u.status,
          isPro: u.isPro,
          isAdmin: u.isAdmin,
          createdAt: u.createdAt
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error: any) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        error: 'Failed to fetch users',
        code: 'SERVER_ERROR'
      });
    }
  });

  /**
   * PATCH /api/admin/users/:userId/pro
   * Toggle user pro status
   */
  router.patch('/users/:userId/pro', async (req: AdminAuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { isPro } = req.body;

      const user = await userManager.getUserById(userId);
      
      if (!user) {
        res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      await userManager.updateUser(userId, { isPro });

      res.json({
        message: 'User pro status updated',
        user: {
          id: user.id,
          username: user.username,
          isPro
        }
      });
    } catch (error: any) {
      console.error('Error updating user pro status:', error);
      res.status(500).json({
        error: 'Failed to update user',
        code: 'SERVER_ERROR'
      });
    }
  });

  /**
   * PATCH /api/admin/users/:userId/admin
   * Toggle user admin status
   */
  router.patch('/users/:userId/admin', async (req: AdminAuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { isAdmin } = req.body;

      const user = await userManager.getUserById(userId);
      
      if (!user) {
        res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      // Prevent removing own admin status
      if (userId === req.user?.id && !isAdmin) {
        res.status(400).json({
          error: 'Cannot remove your own admin status',
          code: 'INVALID_OPERATION'
        });
        return;
      }

      await userManager.updateUser(userId, { isAdmin });

      res.json({
        message: 'User admin status updated',
        user: {
          id: user.id,
          username: user.username,
          isAdmin
        }
      });
    } catch (error: any) {
      console.error('Error updating user admin status:', error);
      res.status(500).json({
        error: 'Failed to update user',
        code: 'SERVER_ERROR'
      });
    }
  });

  /**
   * DELETE /api/admin/users/:userId
   * Delete a user
   */
  router.delete('/users/:userId', async (req: AdminAuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;

      // Prevent deleting own account
      if (userId === req.user?.id) {
        res.status(400).json({
          error: 'Cannot delete your own account',
          code: 'INVALID_OPERATION'
        });
        return;
      }

      const user = await userManager.getUserById(userId);
      
      if (!user) {
        res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      await userManager.deleteUser(userId);

      res.json({
        message: 'User deleted successfully',
        userId
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        error: 'Failed to delete user',
        code: 'SERVER_ERROR'
      });
    }
  });

  /**
   * GET /api/admin/reports/bugs
   * Get all bug reports
   */
  router.get('/reports/bugs', async (req: AdminAuthenticatedRequest, res: Response) => {
    try {
      const status = req.query.status as string;
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

      let query = supabase
        .from('bug_reports')
        .select(`
          *,
          user:flux_users!bug_reports_user_id_fkey(id, username, nickname)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      res.json({ reports: data || [] });
    } catch (error: any) {
      console.error('Error fetching bug reports:', error);
      res.status(500).json({ error: 'Failed to fetch bug reports' });
    }
  });

  /**
   * PATCH /api/admin/reports/bugs/:reportId
   * Update bug report status
   */
  router.patch('/reports/bugs/:reportId', async (req: AdminAuthenticatedRequest, res: Response) => {
    try {
      const { reportId } = req.params;
      const { status, priority, adminNotes } = req.body;

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

      const updateData: any = { updated_at: new Date().toISOString() };
      if (status) updateData.status = status;
      if (priority) updateData.priority = priority;
      if (adminNotes !== undefined) updateData.admin_notes = adminNotes;

      const { data, error } = await supabase
        .from('bug_reports')
        .update(updateData)
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;

      res.json({ message: 'Bug report updated', report: data });
    } catch (error: any) {
      console.error('Error updating bug report:', error);
      res.status(500).json({ error: 'Failed to update bug report' });
    }
  });

  /**
   * GET /api/admin/requests/pro
   * Get all pro requests
   */
  router.get('/requests/pro', async (req: AdminAuthenticatedRequest, res: Response) => {
    try {
      const status = req.query.status as string;
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

      let query = supabase
        .from('pro_requests')
        .select(`
          *,
          user:flux_users!pro_requests_user_id_fkey(id, username, nickname, is_pro)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      res.json({ requests: data || [] });
    } catch (error: any) {
      console.error('Error fetching pro requests:', error);
      res.status(500).json({ error: 'Failed to fetch pro requests' });
    }
  });

  /**
   * PATCH /api/admin/requests/pro/:requestId
   * Approve or reject pro request
   */
  router.patch('/requests/pro/:requestId', async (req: AdminAuthenticatedRequest, res: Response) => {
    try {
      const { requestId } = req.params;
      const { status, adminNotes } = req.body;

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

      // Get the request
      const { data: request, error: fetchError } = await supabase
        .from('pro_requests')
        .select('user_id')
        .eq('id', requestId)
        .single();

      if (fetchError || !request) {
        res.status(404).json({ error: 'Request not found' });
        return;
      }

      // Update request status
      const { error: updateError } = await supabase
        .from('pro_requests')
        .update({
          status,
          admin_notes: adminNotes,
          processed_by: req.user?.id,
          processed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // If approved, grant pro status
      if (status === 'approved') {
        await userManager.updateUser(request.user_id, { isPro: true });
      }

      res.json({ message: 'Pro request processed' });
    } catch (error: any) {
      console.error('Error processing pro request:', error);
      res.status(500).json({ error: 'Failed to process pro request' });
    }
  });

  /**
   * GET /api/admin/reports/scam
   * Get all scam reports
   */
  router.get('/reports/scam', async (req: AdminAuthenticatedRequest, res: Response) => {
    try {
      const status = req.query.status as string;
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

      let query = supabase
        .from('scam_reports')
        .select(`
          *,
          reporter:flux_users!scam_reports_reporter_id_fkey(id, username, nickname),
          reported_user:flux_users!scam_reports_reported_user_id_fkey(id, username, nickname, is_banned)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      res.json({ reports: data || [] });
    } catch (error: any) {
      console.error('Error fetching scam reports:', error);
      res.status(500).json({ error: 'Failed to fetch scam reports' });
    }
  });

  /**
   * PATCH /api/admin/reports/scam/:reportId
   * Update scam report status
   */
  router.patch('/reports/scam/:reportId', async (req: AdminAuthenticatedRequest, res: Response) => {
    try {
      const { reportId } = req.params;
      const { status, adminNotes } = req.body;

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

      const { data, error } = await supabase
        .from('scam_reports')
        .update({
          status,
          admin_notes: adminNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;

      res.json({ message: 'Scam report updated', report: data });
    } catch (error: any) {
      console.error('Error updating scam report:', error);
      res.status(500).json({ error: 'Failed to update scam report' });
    }
  });

  /**
   * POST /api/admin/users/:userId/ban
   * Ban a user
   */
  router.post('/users/:userId/ban', async (req: AdminAuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { reason, banType, expiresAt } = req.body;

      if (!reason) {
        res.status(400).json({ error: 'Ban reason is required' });
        return;
      }

      // Prevent banning own account
      if (userId === req.user?.id) {
        res.status(400).json({ error: 'Cannot ban your own account' });
        return;
      }

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

      // Create ban record
      const { error: banError } = await supabase
        .from('user_bans')
        .insert({
          user_id: userId,
          banned_by: req.user?.id,
          reason,
          ban_type: banType || 'permanent',
          expires_at: expiresAt || null,
          is_active: true
        });

      if (banError) throw banError;

      // Update user banned status
      await userManager.updateUser(userId, { is_banned: true } as any);

      res.json({ message: 'User banned successfully' });
    } catch (error: any) {
      console.error('Error banning user:', error);
      res.status(500).json({ error: 'Failed to ban user' });
    }
  });

  /**
   * POST /api/admin/users/:userId/unban
   * Unban a user
   */
  router.post('/users/:userId/unban', async (req: AdminAuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

      // Deactivate all active bans
      const { error: banError } = await supabase
        .from('user_bans')
        .update({
          is_active: false,
          lifted_at: new Date().toISOString(),
          lifted_by: req.user?.id
        })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (banError) throw banError;

      // Update user banned status
      await userManager.updateUser(userId, { is_banned: false } as any);

      res.json({ message: 'User unbanned successfully' });
    } catch (error: any) {
      console.error('Error unbanning user:', error);
      res.status(500).json({ error: 'Failed to unban user' });
    }
  });

  /**
   * GET /api/admin/bans
   * Get all active bans
   */
  router.get('/bans', async (req: AdminAuthenticatedRequest, res: Response) => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

      const { data, error } = await supabase
        .from('user_bans')
        .select(`
          *,
          user:flux_users!user_bans_user_id_fkey(id, username, nickname),
          banned_by_user:flux_users!user_bans_banned_by_fkey(username, nickname)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json({ bans: data || [] });
    } catch (error: any) {
      console.error('Error fetching bans:', error);
      res.status(500).json({ error: 'Failed to fetch bans' });
    }
  });

  return router;
}
