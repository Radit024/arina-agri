import { beforeEach, describe, expect, it } from 'vitest';
import {
  FINANCIAL_REPORT_MAX_TRANSACTIONS,
  GEMINI_MAX_HISTORY_MESSAGES,
  GEMINI_MAX_PROMPT_LENGTH,
  validateFinancialReportPayload,
  validateGeminiPayload,
} from '@/lib/server/ai/validators';

describe('validateGeminiPayload', () => {
  it('menolak payload bukan objek', () => {
    expect(validateGeminiPayload(null).valid).toBe(false);
    expect(validateGeminiPayload('halo').valid).toBe(false);
    expect(validateGeminiPayload([]).valid).toBe(false);
  });

  it('menolak prompt kosong', () => {
    expect(validateGeminiPayload({ prompt: '' }).valid).toBe(false);
    expect(validateGeminiPayload({ prompt: '   ' }).valid).toBe(false);
    expect(validateGeminiPayload({}).valid).toBe(false);
    expect(validateGeminiPayload({ prompt: 123 }).valid).toBe(false);
  });

it('menerima prompt normal', () => {
    expect(validateGeminiPayload({ prompt: 'Kapan sebaiknya memupuk cabai?' }).valid).toBe(true);
  });

  it('menolak prompt melebihi batas panjang', () => {
    const long = 'a'.repeat(GEMINI_MAX_PROMPT_LENGTH + 1);
    const result = validateGeminiPayload({ prompt: long });
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Prompt maksimal');
  });

  it('menerima prompt tepat di batas panjang', () => {
    expect(validateGeminiPayload({ prompt: 'a'.repeat(GEMINI_MAX_PROMPT_LENGTH) }).valid).toBe(true);
  });

  it('menolak history yang bukan array', () => {
    const result = validateGeminiPayload({ prompt: 'halo', history: 'x' });
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Riwayat percakapan tidak valid.');
  });

  it('menolak history melebihi batas jumlah pesan', () => {
    const history = Array.from({ length: GEMINI_MAX_HISTORY_MESSAGES + 1 }, () => ({
      role: 'user' as const,
      content: 'halo',
    }));
    const result = validateGeminiPayload({ prompt: 'halo', history });
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Riwayat percakapan maksimal');
  });

  it('menolak item history dengan bentuk salah', () => {
    expect(validateGeminiPayload({ prompt: 'halo', history: [{ role: 'sistem' }] }).valid).toBe(false);
    expect(validateGeminiPayload({ prompt: 'halo', history: [{ role: 'user' }] }).valid).toBe(false);
    expect(validateGeminiPayload({ prompt: 'halo', history: ['bukan objek'] }).valid).toBe(false);
  });

  it('menerima history yang valid', () => {
    const result = validateGeminiPayload({
      prompt: 'halo',
      history: [
        { role: 'user', content: 'pertanyaan' },
        { role: 'ai', content: 'jawaban' },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it('menerima history kosong', () => {
    expect(validateGeminiPayload({ prompt: 'Halo', history: [] }).valid).toBe(true);
  });

  it('menolak userName dengan tipe salah', () => {
    expect(validateGeminiPayload({ prompt: 'halo', userName: 123 }).valid).toBe(false);
  });
});

describe('validateFinancialReportPayload', () => {
  it('menolak data laporan tidak lengkap', () => {
    expect(validateFinancialReportPayload({ transactions: [] }).valid).toBe(false);
    expect(validateFinancialReportPayload({ periode: '2026-09' }).valid).toBe(false);
    expect(validateFinancialReportPayload(null).valid).toBe(false);
  });

  it('menolak periode yang terlalu panjang', () => {
    expect(validateFinancialReportPayload({ periode: 'x'.repeat(65), transactions: [] }).valid).toBe(false);
  });

  it('menerima laporan normal', () => {
    expect(validateFinancialReportPayload({ periode: '2026-09', transactions: [] }).valid).toBe(true);
  });

  it('menolak transaksi melebihi batas jumlah', () => {
    const transactions = Array.from({ length: FINANCIAL_REPORT_MAX_TRANSACTIONS + 1 }, () => ({}));
    const result = validateFinancialReportPayload({ periode: '2026-09', transactions });
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Data transaksi terlalu banyak');
  });

  it('menolak rabItems yang bukan array', () => {
    expect(validateFinancialReportPayload({ periode: '2026-09', transactions: [], rabItems: 'x' }).valid).toBe(false);
  });
});

describe('batas ukuran input', () => {
  beforeEach(() => {
    expect(GEMINI_MAX_PROMPT_LENGTH).toBeLessThanOrEqual(2_000);
  });

  it('menolak payload 10 MB seperti temuan audit', () => {
    const history = Array.from({ length: 10_000 }, () => ({ role: 'user' as const, content: 'x'.repeat(1_000) }));
    const result = validateGeminiPayload({ prompt: 'halo', history });
    expect(result.valid).toBe(false);
  });
});