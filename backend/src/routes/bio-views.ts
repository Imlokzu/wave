import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export function createBioViewsRouter(): Router {
  const router = Router();

  /**
   * GET /api/bio-views/:username
   * Get view count for a username
   */
  router.get('/:username', async (req: Request, res: Response) => {
    try {
      const { username } = req.params;

      // Get or create view record
      const { data, error } = await supabase
        .from('bio_profile_views')
        .select('views')
        .eq('username', username.toLowerCase())
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const views = data?.views || 0;
      res.json({ views });
    } catch (error: any) {
      console.error('Get views error:', error);
      res.status(500).json({ error: 'Failed to get views' });
    }
  });

  /**
   * POST /api/bio-views/:username/increment
   * Increment view count for a username
   */
  router.post('/:username/increment', async (req: Request, res: Response) => {
    try {
      const { username } = req.params;
      const lowerUsername = username.toLowerCase();

      // Try to increment existing record
      const { data: existing } = await supabase
        .from('bio_profile_views')
        .select('views')
        .eq('username', lowerUsername)
        .single();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('bio_profile_views')
          .update({ views: existing.views + 1 })
          .eq('username', lowerUsername)
          .select()
          .single();

        if (error) throw error;
        res.json({ views: data.views });
      } else {
        // Create new
        const { data, error } = await supabase
          .from('bio_profile_views')
          .insert({ username: lowerUsername, views: 1 })
          .select()
          .single();

        if (error) throw error;
        res.json({ views: data.views });
      }
    } catch (error: any) {
      console.error('Increment views error:', error);
      res.status(500).json({ error: 'Failed to increment views' });
    }
  });

  return router;
}
