import Parser from 'rss-parser';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { extractImageUrl, extractSnippet, isAgriRelevant } from './helpers';

interface NewsArticleInsert {
  title: string;
  snippet: string | null;
  link: string;
  source: string;
  image_url: string | null;
  pub_date: string;
}

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

async function fetchSource(parser: Parser, source: { name: string; url: string }) {
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
      image_url: extractImageUrl(item as Parser.Item & { enclosure?: { url?: string } }),
      pub_date: pubDate,
    });
  }

  return toInsert;
}

export async function fetchNewsAndUpsert(): Promise<number> {
  const supabase = getSupabaseAdmin();
  const parser = new Parser({
    customFields: {
      item: [
        ['media:content', 'media:content', { keepArray: false }],
        ['content:encoded', 'content:encoded'],
      ],
    },
    timeout: 15000,
  });

  const batches = await Promise.all(RSS_SOURCES.map((source) => fetchSource(parser, source)));
  const toInsert = batches.flat();

  if (toInsert.length === 0) return 0;

  const { error } = await supabase
    .from('news_articles')
    .upsert(toInsert, { onConflict: 'link', ignoreDuplicates: true });

  if (error) {
    throw new Error(`Supabase upsert error: ${error.message}`);
  }

  return toInsert.length;
}

export async function cleanupOldNews(days: number = 30): Promise<number> {
  const supabase = getSupabaseAdmin();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const { error, count } = await supabase
    .from('news_articles')
    .delete({ count: 'exact' })
    .lt('pub_date', cutoff.toISOString());

  if (error) {
    throw new Error(`Supabase cleanup error: ${error.message}`);
  }

  return count ?? 0;
}
