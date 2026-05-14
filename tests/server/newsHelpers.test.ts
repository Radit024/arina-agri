import { describe, expect, it } from 'vitest';
import { extractSnippet, isAgriRelevant } from '@/lib/server/news/helpers';

describe('isAgriRelevant', () => {
  it('matches agriculture keywords in title', () => {
    expect(isAgriRelevant('Harga cabai naik tajam')).toBe(true);
  });

  it('returns false when no keyword is present', () => {
    expect(isAgriRelevant('Teknologi startup terbaru')).toBe(false);
  });
});

describe('extractSnippet', () => {
  it('strips html tags and trims output', () => {
    expect(extractSnippet('<p>Hello <b>World</b></p>', null)).toBe('Hello World');
  });

  it('returns null for empty content', () => {
    expect(extractSnippet('', '')).toBe(null);
  });
});
