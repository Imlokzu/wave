import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

/**
 * GET /api/feed
 * Get telegram feed messages
 * Query params:
 *   - limit: number of messages (default: 50, max: 100)
 *   - channel: filter by channel_id (optional)
 *   - offset: pagination offset (default: 0)
 */
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const channel = req.query.channel as string;

    let query = supabase
      .from('telegram_messages')
      .select('*')
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by channel if specified
    if (channel) {
      query = query.eq('channel_id', channel);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Feed] Error fetching messages:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch feed messages'
      });
    }

    res.json({
      success: true,
      data: data || [],
      pagination: {
        limit,
        offset,
        count: data?.length || 0
      }
    });
  } catch (error) {
    console.error('[Feed] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/feed/channels
 * Get list of available channels
 */
router.get('/channels', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('telegram_messages')
      .select('channel_id, channel_name')
      .order('channel_name');

    if (error) {
      console.error('[Feed] Error fetching channels:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch channels'
      });
    }

    // Deduplicate channels
    const channelsMap = new Map();
    data?.forEach(row => {
      if (!channelsMap.has(row.channel_id)) {
        channelsMap.set(row.channel_id, {
          id: row.channel_id,
          name: row.channel_name || row.channel_id
        });
      }
    });

    const channels = Array.from(channelsMap.values());

    res.json({
      success: true,
      data: channels
    });
  } catch (error) {
    console.error('[Feed] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/feed/:messageId
 * Get a specific message by ID
 */
router.get('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    const { data, error } = await supabase
      .from('telegram_messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[Feed] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
