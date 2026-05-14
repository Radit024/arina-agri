import { describe, expect, it } from 'vitest';
import { validateFinancialReportPayload, validateGeminiPayload } from '@/lib/server/ai/validators';

describe('validateGeminiPayload', () => {
  it('rejects empty prompt', () => {
    const result = validateGeminiPayload({ prompt: '' });
    expect(result.valid).toBe(false);
  });

  it('accepts valid payload', () => {
    const result = validateGeminiPayload({ prompt: 'Halo', history: [] });
    expect(result.valid).toBe(true);
  });
});

describe('validateFinancialReportPayload', () => {
  it('rejects missing period', () => {
    const result = validateFinancialReportPayload({ transactions: [] });
    expect(result.valid).toBe(false);
  });

  it('accepts valid payload', () => {
    const result = validateFinancialReportPayload({ periode: 'Mei 2026', transactions: [] });
    expect(result.valid).toBe(true);
  });
});