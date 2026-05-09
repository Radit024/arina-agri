import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { createClient } from '@supabase/supabase-js';
import { isAgriRelevant, extractSnippet, extractImageUrl } from '@/backend/src/services/newsHelpers';
import { processNotifications } from '@/lib/notifications/service';

export const dynamic = 'force-dynamic';

// ─── News Config ──────────────────────────────────────────────────
const RSS_SOURCES = [
  {
    name: 'Berita Pertanian',
    url: 'https://news.google.com/rss/search?q=pertanian+OR+agribisnis+OR+petani+when:7d&hl=id&gl=ID&ceid=ID:id',
  },
  {
    name: 'Info Komoditas',
    url: 'https://news.google.com/rss/search?q=komoditas+pangan+OR+"harga+cabai"+OR+"harga+pupuk"+when:7d&hl=id&gl=ID&ceid=ID:id',
  },
  {
    name: 'Kabar Panen & Cuaca',
    url: 'https://news.google.com/rss/search?q="gagal+panen"+OR+"musim+tanam"+OR+"hama+tanaman"+when:14d&hl=id&gl=ID&ceid=ID:id',
  },
];

const ITEMS_PER_SOURCE = 5;

async function fetchAndUpsertFeed(supabase: any, source: { name: string; url: string }): Promise<number> {
  const parser = new Parser({
    customFields: {
      item: [
        ['media:content', 'media:content', { keepArray: false }],
        ['content:encoded', 'content:encoded'],
      ],
    },
    timeout: 15000,
  });

  const feed = await parser.parseURL(source.url);
  const items = feed.items.slice(0, ITEMS_PER_SOURCE);

  const toInsert = [];

  for (const item of items) {
    if (!item.title || !item.link) continue;

    const isRelevant = isAgriRelevant(item.title, item.contentSnippet || item.summary);
    if (!isRelevant) continue;

    const pubDate = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();

    toInsert.push({
      title: item.title.trim(),
      snippet: extractSnippet(item.contentSnippet, item.summary),
      link: item.link,
      source: source.name,
      image_url: extractImageUrl(item as any),
      pub_date: pubDate,
    });
  }

  if (toInsert.length === 0) return 0;

  const { error } = await supabase
    .from('news_articles')
    .upsert(toInsert, { onConflict: 'link', ignoreDuplicates: true });

  if (error) {
    console.error(`[Daily Cron] Upsert error for ${source.name}:`, error.message);
    return 0;
  }

  return toInsert.length;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  console.log('[Daily Cron] Memulai sinkronisasi harian (Berita & Notifikasi)...');

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ─── TASK 1: Fetch News ───────────────────────────────────────
    let totalInsertedNews = 0;
    for (const source of RSS_SOURCES) {
      try {
        const count = await fetchAndUpsertFeed(supabase, source);
        totalInsertedNews += count;
      } catch (err) {
        console.error(`[Daily Cron] Failed source ${source.name}:`, err);
      }
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await supabase
      .from('news_articles')
      .delete()
      .lt('pub_date', thirtyDaysAgo.toISOString());

    // ─── TASK 2: Send Notifications ───────────────────────────────
    // true indicates we bypass strict time checking
    const notificationResult = await processNotifications(true);

    return NextResponse.json({ 
      success: true, 
      message: 'Sinkronisasi harian selesai',
      news: { inserted: totalInsertedNews },
      notifications: notificationResult
    });
  } catch (err) {
    console.error('[Daily Cron] Fatal error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
