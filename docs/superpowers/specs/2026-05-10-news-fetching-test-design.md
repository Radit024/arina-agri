# Design Spec: News Fetching Helper Refactor and Testing

## Overview
To improve the reliability and maintainability of the automatic news fetching feature, we are refactoring the helper functions into a standalone utility file and adding comprehensive unit tests.

## Architecture
- **`backend/src/services/newsHelpers.ts`**:
    - `AGRI_KEYWORDS`: Array of keywords for filtering.
    - `isAgriRelevant(title: string, content?: string)`: Filters articles based on keywords.
    - `extractSnippet(content?: string | null, summary?: string | null)`: Cleans HTML and truncates text.
    - `extractImageUrl(item: any)`: Extracts the best available image URL from RSS items.
- **`backend/src/services/newsScheduler.ts`**:
    - Imports helpers from `newsHelpers.ts`.
    - Manages cron jobs and database upserts.

## Testing Strategy
- **Test Runner**: Vitest (reusing existing project setup).
- **Test File**: `tests/backend/newsHelpers.test.ts`.
- **Test Cases**:
    - **`isAgriRelevant`**:
        - Should return true for titles containing "cabai", "panen", etc.
        - Should return false for unrelated news.
    - **`extractSnippet`**:
        - Should strip `<p>`, `<a>`, etc.
        - Should truncate to 200 chars and add "...".
    - **`extractImageUrl`**:
        - Should prioritize `media:content`.
        - Should fall back to `enclosure`.
        - Should fall back to `img` tags in content.

## Success Criteria
1.  All helper functions are exported from `newsHelpers.ts`.
2.  `newsScheduler.ts` continues to function correctly (verified by manual check/logs).
3.  All unit tests pass with 100% coverage on helper logic.
