import Parser from 'rss-parser';

export const AGRI_KEYWORDS = [
  'cabai', 'pupuk', 'hama', 'cuaca', 'panen', 'pertanian', 'harga', 
  'komoditas', 'agri', 'petani', 'sawah', 'irigasi', 'holtikultura', 
  'tanaman', 'kebun', 'lahan', 'beras', 'jagung', 'kedelai', 'tomat', 'padi'
];

export function isAgriRelevant(title: string, content?: string): boolean {
  const textToCheck = `${title} ${content || ''}`.toLowerCase();
  return AGRI_KEYWORDS.some((kw) => textToCheck.includes(kw));
}

export function extractSnippet(content?: string | null, summary?: string | null): string | null {
  const raw = content || summary || '';
  const stripped = raw.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (!stripped) return null;
  return stripped.length > 200 ? stripped.substring(0, 200) + '...' : stripped;
}

export function extractImageUrl(item: Parser.Item & { enclosure?: { url?: string } }): string | null {
  const mediaContent = (item as Record<string, unknown>)['media:content'] as
    | { $?: { url?: string } }
    | undefined;
  if (mediaContent?.['$']?.url) return mediaContent['$'].url;

  if (item.enclosure?.url) return item.enclosure.url;

  const contentHtml = (item as Record<string, unknown>)['content:encoded'] as string | undefined;
  if (contentHtml) {
    const match = contentHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (match?.[1]) return match[1];
  }

  return null;
}
