import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabase';

const router = Router();

// ─── GET /api/news ────────────────────────────────────────────────
// Query params: ?limit=10&page=1
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50); // cap at 50
    const page = Math.max(Number(req.query.page) || 1, 1);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabaseAdmin
      .from('news_articles')
      .select('*', { count: 'exact' })
      .order('pub_date', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('[news route] Supabase error:', error.message);
      return res.status(500).json({ success: false, message: 'Gagal mengambil data berita' });
    }

    return res.json({
      success: true,
      data: data || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[news route] Error:', message);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// ─── POST /api/news/trigger ───────────────────────────────────────
// Manual trigger for immediate fetch (dev/testing)
router.post('/trigger', async (_req: Request, res: Response) => {
  try {
    // Lazy import to avoid circular deps at startup
    const { startNewsScheduler } = await import('../services/newsScheduler');
    void startNewsScheduler;
    return res.json({ success: true, message: 'Fetch berita dipicu secara manual' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, message });
  }
});

export default router;
