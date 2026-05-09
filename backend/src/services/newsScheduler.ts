import cron from 'node-cron';
import Parser from 'rss-parser';
import { supabaseAdmin } from './supabase';
import { isAgriRelevant, extractSnippet, extractImageUrl } from './newsHelpers';

// ─── Types ────────────────────────────────────────────────────────
interface NewsArticleInsert {
  title: string;
  snippet: string | null;
  link: string;
  source: string;
  image_url: string | null;
  pub_date: string;
}

// ─── Config ───────────────────────────────────────────────────────
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

// ─── Core Fetch Logic ─────────────────────────────────────────────
async function fetchAndUpsertFeed(source: { name: string; url: string }): Promise<number> {
  const parser = new Parser({
    customFields: {
      item: [
        ['media:content', 'media:content', { keepArray: false }],
        ['content:encoded', 'content:encoded'],
      ],
    },
    timeout: 10000, // 10 second timeout
  });

  const feed = await parser.parseURL(source.url);
  const items = feed.items.slice(0, ITEMS_PER_SOURCE);

  const toInsert: NewsArticleInsert[] = [];

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
      image_url: extractImageUrl(item as Parameters<typeof extractImageUrl>[0]),
      pub_date: pubDate,
    });
  }

  if (toInsert.length === 0) return 0;

  const { error } = await supabaseAdmin
    .from('news_articles')
    .upsert(toInsert, { onConflict: 'link', ignoreDuplicates: true });

  if (error) {
    console.error(`[newsScheduler] Upsert error for ${source.name}:`, error.message);
    return 0;
  }

  return toInsert.length;
}

// ─── Main Runner ──────────────────────────────────────────────────
export async function runNewsFetch(): Promise<void> {
  console.log('[newsScheduler] Mulai fetch berita RSS...');
  let totalInserted = 0;

  for (const source of RSS_SOURCES) {
    try {
      const count = await fetchAndUpsertFeed(source);
      console.log(`[newsScheduler] ${source.name}: ${count} artikel diproses`);
      totalInserted += count;
    } catch (err) {
      // Isolate per-feed errors — don't let one failure stop others
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[newsScheduler] Gagal fetch dari ${source.name}: ${message}`);
    }
  }

  console.log(`[newsScheduler] Selesai. Total artikel: ${totalInserted}`);
}

// ─── Cleanup Logic ────────────────────────────────────────────────
async function runCleanup(): Promise<void> {
  console.log('[newsScheduler] Menjalankan cleanup berita lama...');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { error, count } = await supabaseAdmin
    .from('news_articles')
    .delete({ count: 'exact' })
    .lt('pub_date', thirtyDaysAgo.toISOString());

  if (error) {
    console.error('[newsScheduler] Cleanup error:', error.message);
  } else {
    console.log(`[newsScheduler] Cleanup selesai. ${count ?? 0} artikel dihapus.`);
  }
}

// ─── Scheduler Entry Point ────────────────────────────────────────
export function startNewsScheduler(): void {
  // Fetch berita 4x sehari: 06:00, 12:00, 18:00, 00:00
  cron.schedule('0 6,12,18,0 * * *', () => {
    runNewsFetch().catch((err) => {
      console.error('[newsScheduler] Unexpected error:', err);
    });
  });

  // Cleanup bulanan: tanggal 1, jam 02:00
  cron.schedule('0 2 1 * *', () => {
    runCleanup().catch((err) => {
      console.error('[newsScheduler] Cleanup error:', err);
    });
  });

  // Jalankan sekali saat startup untuk populate awal
  runNewsFetch().catch((err) => {
    console.error('[newsScheduler] Initial fetch error:', err);
  });

  console.log('[newsScheduler] Scheduler berita aktif (fetch: 4x sehari, cleanup: bulanan)');
}
