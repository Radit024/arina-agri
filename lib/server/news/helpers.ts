import Parser from 'rss-parser';
import * as cheerio from 'cheerio';

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

/**
 * Decodes a Google News RSS article URL to its original source URL.
 */
async function decodeGoogleNewsUrl(sourceUrl: string): Promise<string | null> {
  try {
    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return null;
    }

    const responseText = await response.text();
    const $ = cheerio.load(responseText);
    const dataP = $('c-wiz[data-p]').attr('data-p');
    if (!dataP) {
      return null;
    }

    const obj = JSON.parse(dataP.replace('%.@.', '["garturlreq",'));
    const payload = {
      'f.req': JSON.stringify([
        [
          ['Fbv4je', JSON.stringify([...obj.slice(0, -6), ...obj.slice(-2)]), null, 'generic']
        ]
      ])
    };

    const postResponse = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
      method: 'POST',
      body: new URLSearchParams(payload).toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
      },
    });

    if (!postResponse.ok) {
      return null;
    }

    const cleanData = (await postResponse.text()).replace(")]}'\n\n", "");
    const outerArray = JSON.parse(cleanData);
    const innerArrayString = outerArray[0][2];
    const finalUrl = JSON.parse(innerArrayString)[1];

    return finalUrl;
  } catch (error) {
    console.error('[newsHelpers] Decoding Google News URL failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Extracts Open Graph image from a URL. 
 * Supports Google News URLs by first decoding them.
 */
export async function scrapeOgImage(url: string): Promise<string | null> {
  try {
    let targetUrl = url;
    if (url.includes('news.google.com/rss/articles/')) {
      const decodedUrl = await decodeGoogleNewsUrl(url);
      if (decodedUrl) {
        targetUrl = decodedUrl;
      } else {
        return null;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      return null;
    }

    const responseText = await response.text();
    const $ = cheerio.load(responseText);
    const ogImage = $('meta[property="og:image"]').attr('content') || $('meta[name="og:image"]').attr('content');
    return ogImage || null;
  } catch (err) {
    console.error(`[newsHelpers] scrapeOgImage failed for ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}
