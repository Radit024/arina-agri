import { describe, expect, test } from 'vitest';
import {
  buildNewsCategoryFilter,
  getNewsCategoryKeywords,
  normalizeNewsCategory,
} from '@/lib/server/news/categories';

describe('news category filters', () => {
  test('normalizes known categories', () => {
    expect(normalizeNewsCategory(' Harga ')).toBe('harga');
    expect(normalizeNewsCategory('cuaca')).toBe('cuaca');
  });

  test('ignores unknown categories', () => {
    expect(normalizeNewsCategory('semua')).toBe('');
    expect(normalizeNewsCategory(null)).toBe('');
    expect(getNewsCategoryKeywords('semua')).toEqual([]);
  });

  test('builds a PostgREST OR filter across searchable news columns', () => {
    const filter = buildNewsCategoryFilter('kebijakan');

    expect(filter).toContain('title.ilike.%kebijakan%');
    expect(filter).toContain('snippet.ilike.%pemerintah%');
    expect(filter).toContain('source.ilike.%kementan%');
  });

  test('returns null when no backend filter should be applied', () => {
    expect(buildNewsCategoryFilter('')).toBeNull();
    expect(buildNewsCategoryFilter('unknown')).toBeNull();
  });
});
