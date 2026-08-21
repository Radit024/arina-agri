import { describe, expect, it } from 'vitest';
import { extractImageUrl, extractSnippet, isAgriRelevant } from '@/lib/server/news/helpers';

describe('newsHelpers', () => {
  describe('isAgriRelevant', () => {
    it('matches agriculture keywords in title', () => {
      expect(isAgriRelevant('Harga Cabai Melonjak')).toBe(true);
      expect(isAgriRelevant('Tips Menanam Padi')).toBe(true);
    });

    it('returns true if content contains keywords but title does not', () => {
      expect(isAgriRelevant('Berita Hari Ini', 'Petani merayakan panen raya')).toBe(true);
    });

    it('returns false when no keyword is present', () => {
      expect(isAgriRelevant('Teknologi startup terbaru')).toBe(false);
      expect(isAgriRelevant('Artis Menikah', 'Berita hiburan terkini')).toBe(false);
    });
  });

  describe('extractSnippet', () => {
    it('strips html tags and trims output', () => {
      expect(extractSnippet('<p>Hello <b>World</b></p>', null)).toBe('Hello World');
    });

    it('truncates long text to 200 chars', () => {
      const longText = 'A'.repeat(250);
      const result = extractSnippet(longText);
      expect(result?.length).toBe(203); // 200 + '...'
      expect(result?.endsWith('...')).toBe(true);
    });

    it('returns null for empty content', () => {
      expect(extractSnippet('', '')).toBe(null);
      expect(extractSnippet(null, null)).toBe(null);
    });
  });

  describe('extractImageUrl', () => {
    it('should extract from media:content', () => {
      const item = { 'media:content': { $: { url: 'https://img.com/1.jpg' } } };
      expect(extractImageUrl(item as Parameters<typeof extractImageUrl>[0])).toBe('https://img.com/1.jpg');
    });

    it('should extract from enclosure', () => {
      const item = { enclosure: { url: 'https://img.com/2.jpg' } };
      expect(extractImageUrl(item as Parameters<typeof extractImageUrl>[0])).toBe('https://img.com/2.jpg');
    });

    it('should extract from content:encoded img tag', () => {
      const item = { 'content:encoded': '<div><img src="https://img.com/3.jpg" /></div>' };
      expect(extractImageUrl(item as Parameters<typeof extractImageUrl>[0])).toBe('https://img.com/3.jpg');
    });

    it('should return null if no image found', () => {
      expect(extractImageUrl({})).toBe(null);
    });
  });
});
