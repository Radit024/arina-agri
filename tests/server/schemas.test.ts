import { describe, expect, it } from 'vitest';
import {
  financeTransactionSchema,
  financialReportSchema,
  geminiChatSchema,
  notificationScheduleSchema,
} from '@/lib/server/validators/schemas';

describe('Zod Request Validation Schemas', () => {
  describe('geminiChatSchema', () => {
    it('validates a correct chat prompt', () => {
      const result = geminiChatSchema.safeParse({
        prompt: 'Halo AI, apa pupuk terbaik untuk padi?',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty prompt', () => {
      const result = geminiChatSchema.safeParse({
        prompt: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects prompt exceeding max length', () => {
      const result = geminiChatSchema.safeParse({
        prompt: 'a'.repeat(4001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('financialReportSchema', () => {
    it('validates a valid financial report payload', () => {
      const result = financialReportSchema.safeParse({
        projectName: 'Proyek Padi Musim 1',
        commodity: 'Padi',
        landArea: 2.5,
        summary: {
          totalPemasukan: 10000000,
          totalPengeluaran: 4000000,
          saldoAkhir: 6000000,
        },
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing project name', () => {
      const result = financialReportSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('financeTransactionSchema', () => {
    it('validates a valid transaction', () => {
      const result = financeTransactionSchema.safeParse({
        jenis: 'pengeluaran',
        kategori: 'Pupuk Urea',
        nominal: 250000,
        tanggal: '2026-08-21',
        keterangan: 'Beli 10 sak',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid transaction type and non-positive nominal', () => {
      const result = financeTransactionSchema.safeParse({
        jenis: 'transfer',
        kategori: 'Pupuk',
        nominal: -5000,
        tanggal: '2026-08-21',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid date format', () => {
      const result = financeTransactionSchema.safeParse({
        jenis: 'pemasukan',
        kategori: 'Panen',
        nominal: 1000000,
        tanggal: '21/08/2026',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('notificationScheduleSchema', () => {
    it('validates valid notification schedule', () => {
      const result = notificationScheduleSchema.safeParse({
        channel: 'telegram',
        time: '07:30',
        categories: ['cuaca', 'harga'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid time format', () => {
      const result = notificationScheduleSchema.safeParse({
        channel: 'telegram',
        time: '7:30',
        categories: ['cuaca'],
      });
      expect(result.success).toBe(false);
    });
  });
});
