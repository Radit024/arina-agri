# News Fetching Helper Refactor and Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor news fetching helper functions into a separate utility file and add unit tests to ensure reliability.

**Architecture:** 
- Extract `AGRI_KEYWORDS`, `isAgriRelevant`, `extractSnippet`, and `extractImageUrl` from `backend/src/services/newsScheduler.ts` to `backend/src/services/newsHelpers.ts`.
- Update `newsScheduler.ts` to import these helpers.
- Implement unit tests in `tests/backend/newsHelpers.test.ts` using Vitest.

**Tech Stack:** TypeScript, Vitest, RSS-Parser (types)

---

### Task 1: Create newsHelpers.ts

**Files:**
- Create: `backend/src/services/newsHelpers.ts`

- [ ] **Step 1: Create the file with extracted logic**

```typescript
import Parser from 'rss-parser';

export const AGRI_KEYWORDS = [
  'cabai', 'pupuk', 'hama', 'cuaca', 'panen', 'pertanian', 'harga', 
  'komoditas', 'agri', 'petani', 'sawah', 'irigasi', 'holtikultura', 
  'tanaman', 'kebun', 'lahan', 'beras', 'jagung', 'kedelai', 'tomat'
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
```

- [ ] **Step 2: Verify file creation**
Run: `ls backend/src/services/newsHelpers.ts`

- [ ] **Step 3: Commit**
```bash
git add backend/src/services/newsHelpers.ts
git commit -m "feat(news): extract helper functions to newsHelpers.ts"
```

---

### Task 2: Update newsScheduler.ts

**Files:**
- Modify: `backend/src/services/newsScheduler.ts`

- [ ] **Step 1: Replace local helpers with imports**

Remove `AGRI_KEYWORDS`, `isAgriRelevant`, `extractSnippet`, and `extractImageUrl` from `newsScheduler.ts`.
Add import at the top:
```typescript
import { isAgriRelevant, extractSnippet, extractImageUrl } from './newsHelpers';
```

- [ ] **Step 2: Verify build**
Run: `cd backend && npx tsc` (or equivalent build command)

- [ ] **Step 3: Commit**
```bash
git add backend/src/services/newsScheduler.ts
git commit -m "refactor(news): use imported helpers in newsScheduler"
```

---

### Task 3: Create Unit Tests

**Files:**
- Create: `tests/backend/newsHelpers.test.ts`

- [ ] **Step 1: Write tests for isAgriRelevant**

```typescript
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
});
```

- [ ] **Step 2: Run tests and verify failure (if logic was missing, but here it should pass)**
Run: `npx vitest tests/backend/newsHelpers.test.ts`

- [ ] **Step 3: Add tests for extractSnippet**

```typescript
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
```

- [ ] **Step 4: Add tests for extractImageUrl**

```typescript
  describe('extractImageUrl', () => {
    it('should extract from media:content', () => {
      const item = { 'media:content': { '$': { url: 'https://img.com/1.jpg' } } };
      expect(extractImageUrl(item as any)).toBe('https://img.com/1.jpg');
    });

    it('should extract from enclosure', () => {
      const item = { enclosure: { url: 'https://img.com/2.jpg' } };
      expect(extractImageUrl(item as any)).toBe('https://img.com/2.jpg');
    });

    it('should extract from content:encoded img tag', () => {
      const item = { 'content:encoded': '<div><img src="https://img.com/3.jpg" /></div>' };
      expect(extractImageUrl(item as any)).toBe('https://img.com/3.jpg');
    });

    it('should return null if no image found', () => {
      expect(extractImageUrl({})).toBe(null);
    });
  });
```

- [ ] **Step 5: Run all tests**
Run: `npm test`

- [ ] **Step 6: Commit**
```bash
git add tests/backend/newsHelpers.test.ts
git commit -m "test(news): add unit tests for news helpers"
```
