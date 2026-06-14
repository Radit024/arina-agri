import { describe, it, expect } from 'vitest';
import { isAgriRelevant, extractSnippet, extractImageUrl } from '@/backend/src/services/newsHelpers';

describe('newsHelpers', () => {
  describe('isAgriRelevant', () => {
    it('should return true for titles containing agri keywords', () => {
      expect(isAgriRelevant('Harga Cabai Melonjak')).toBe(true);
      expect(isAgriRelevant('Tips Menanam Padi')).toBe(true);
    });

    it('should return true if content contains keywords but title does not', () => {
      expect(isAgriRelevant('Berita Hari Ini', 'Petani merayakan panen raya')).toBe(true);
    });

    it('should return false for unrelated news', () => {
      expect(isAgriRelevant('Skor Pertandingan Bola')).toBe(false);
      expect(isAgriRelevant('Artis Menikah', 'Berita hiburan terkini')).toBe(false);
    });
  });

  describe('extractSnippet', () => {
    it('should strip HTML tags', () => {
      const input = '<p>Halo <b>Petani</b>!</p>';
      expect(extractSnippet(input)).toBe('Halo Petani!');
    });

    it('should truncate long text to 200 chars', () => {
      const longText = 'A'.repeat(250);
      const result = extractSnippet(longText);
      expect(result?.length).toBe(203); // 200 + '...'
      expect(result?.endsWith('...')).toBe(true);
    });

    it('should return null for empty input', () => {
      expect(extractSnippet('')).toBe(null);
      expect(extractSnippet(null)).toBe(null);
    });
  });

  describe('extractImageUrl', () => {
    it('should extract from media:content', () => {
      const item = { 'media:content': { '$': { url: 'https://img.com/1.jpg' } } };
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
