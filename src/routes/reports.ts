import { Router, Response } from 'express';
import { IUserManager } from '../managers/IUserManager';
import { AuthService } from '../services/AuthService';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

/**
 * Create reports router
 * Handles user-submitted bug reports, pro requests, and scam reports
 */
export function createReportsRouter(userManager: IUserManager): Router {
  const router = Router();
  const authService = new AuthService(userManager);

  // Apply authentication to all routes
  router.use(requireAuth(authService));

  /**
   * POST /api/reports/bug
   * Submit a bug report
   */
  router.post('/bug', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { title, description, category } = req.body;

      if (!title || !description) {
        res.status(400).json({
          error: 'Title and description are required',
          code: 'MISSING_FIELDS'
        });
        return;
      }

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

      const { data, error } = await supabase
        .from('bug_reports')
        .insert({
          user_id: req.user?.id,
          title,
          description,
          category: category || 'bug',
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        message: 'Bug report submitted successfully',
        report: data
      });
    } catch (error: any) {
      console.error('Error submitting bug report:', error);
      res.status(500).json({
        error: 'Failed to submit bug report',
        code: 'SERVER_ERROR'
      });
    }
  });

  /**
   * POST /api/reports/pro-request
   * Request pro status
   */
  router.post('/pro-request', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { reason } = req.body;

      if (!reason) {
        res.status(400).json({
          error: 'Reason is required',
          code: 'MISSING_FIELDS'
        });
        return;
      }

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

      // Check if user already has a pending request
      const { data: existing } = await supabase
        .from('pro_requests')
        .select('id')
        .eq('user_id', req.user?.id)
        .eq('status', 'pending')
        .single();

      if (existing) {
        res.status(400).json({
          error: 'You already have a pending pro request',
          code: 'DUPLICATE_REQUEST'
        });
        return;
      }

      const { data, error } = await supabase
        .from('pro_requests')
        .insert({
          user_id: req.user?.id,
          reason,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        message: 'Pro request submitted successfully',
        request: data
      });
    } catch (error: any) {
      console.error('Error submitting pro request:', error);
      res.status(500).json({
        error: 'Failed to submit pro request',
        code: 'SERVER_ERROR'
      });
    }
  });

  /**
   * POST /api/reports/scam
   * Report a user for scam/fraud
   */
  router.post('/scam', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { reportedUserId, reason, evidence } = req.body;

      if (!reportedUserId || !reason) {
        res.status(400).json({
          error: 'Reported user ID and reason are required',
          code: 'MISSING_FIELDS'
        });
        return;
      }

      // Cannot report yourself
      if (reportedUserId === req.user?.id) {
        res.status(400).json({
          error: 'Cannot report yourself',
          code: 'INVALID_OPERATION'
        });
        return;
      }

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

      // Verify reported user exists
      const reportedUser = await userManager.getUserById(reportedUserId);
      if (!reportedUser) {
        res.status(404).json({
          error: 'Reported user not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      const { data, error } = await supabase
        .from('scam_reports')
        .insert({
          reporter_id: req.user?.id,
          reported_user_id: reportedUserId,
          reason,
          evidence: evidence || null,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        message: 'Scam report submitted successfully',
        report: data
      });
    } catch (error: any) {
      console.error('Error submitting scam report:', error);
      res.status(500).json({
        error: 'Failed to submit scam report',
        code: 'SERVER_ERROR'
      });
    }
  });

  /**
   * POST /api/reports/message
   * Report a message
   */
  router.post('/message', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { messageId, reportedUserId, reason, messageContent } = req.body;

      if (!messageId || !reportedUserId || !reason) {
        res.status(400).json({
          error: 'Message ID, reported user ID, and reason are required',
          code: 'MISSING_FIELDS'
        });
        return;
      }

      // Cannot report yourself
      if (reportedUserId === req.user?.id) {
        res.status(400).json({
          error: 'Cannot report your own message',
          code: 'INVALID_OPERATION'
        });
        return;
      }

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

      // Verify reported user exists
      const reportedUser = await userManager.getUserById(reportedUserId);
      if (!reportedUser) {
        res.status(404).json({
          error: 'Reported user not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      const { data, error } = await supabase
        .from('message_reports')
        .insert({
          reporter_id: req.user?.id,
          reported_user_id: reportedUserId,
          message_id: messageId,
          message_content: messageContent || null,
          reason,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        message: 'Message report submitted successfully',
        report: data
      });
    } catch (error: any) {
      console.error('Error submitting message report:', error);
      res.status(500).json({
        error: 'Failed to submit message report',
        code: 'SERVER_ERROR'
      });
    }
  });

  /**
   * GET /api/reports/my-reports
   * Get current user's reports
   */
  router.get('/my-reports', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

      const [bugReports, proRequests, scamReports] = await Promise.all([
        supabase
          .from('bug_reports')
          .select('*')
          .eq('user_id', req.user?.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('pro_requests')
          .select('*')
          .eq('user_id', req.user?.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('scam_reports')
          .select('*')
          .eq('reporter_id', req.user?.id)
          .order('created_at', { ascending: false })
      ]);

      res.json({
        bugReports: bugReports.data || [],
        proRequests: proRequests.data || [],
        scamReports: scamReports.data || []
      });
    } catch (error: any) {
      console.error('Error fetching user reports:', error);
      res.status(500).json({
        error: 'Failed to fetch reports',
        code: 'SERVER_ERROR'
      });
    }
  });

  return router;
}
