import { z } from 'zod';

export const geminiChatSchema = z.object({
  prompt: z.string().min(1, 'Prompt tidak boleh kosong').max(4000, 'Prompt maksimal 4000 karakter'),
  systemPrompt: z.string().max(4000, 'System prompt maksimal 4000 karakter').optional(),
  featureContext: z.string().max(2000, 'Feature context maksimal 2000 karakter').optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'model', 'system']),
        parts: z.string().max(4000),
      })
    )
    .max(50, 'Maksimal 50 riwayat percakapan')
    .optional(),
  options: z
    .object({
      temperature: z.number().min(0).max(2).optional(),
      maxOutputTokens: z.number().positive().max(8192).optional(),
    })
    .optional(),
});

export type GeminiChatInput = z.infer<typeof geminiChatSchema>;

export const financialReportSchema = z.object({
  projectName: z.string().min(1, 'Nama proyek tidak boleh kosong').max(200),
  commodity: z.string().max(100).optional(),
  landArea: z.number().positive().optional(),
  landAreaUnit: z.string().max(50).optional(),
  seasonLabel: z.string().max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  summary: z
    .object({
      totalPemasukan: z.number().default(0),
      totalPengeluaran: z.number().default(0),
      saldoAkhir: z.number().default(0),
    })
    .optional(),
  transactions: z.array(z.record(z.string(), z.unknown())).max(500, 'Maksimal 500 transaksi').optional(),
  rabItems: z.array(z.record(z.string(), z.unknown())).max(500, 'Maksimal 500 item RAB').optional(),
  analysisType: z.enum(['ringkasan', 'lengkap', 'rekomendasi']).optional().default('ringkasan'),
});

export type FinancialReportInput = z.infer<typeof financialReportSchema>;

export const financeTransactionSchema = z.object({
  jenis: z.enum(['pemasukan', 'pengeluaran'], {
    message: 'Jenis transaksi harus berupa pemasukan atau pengeluaran',
  }),
  kategori: z.string().min(1, 'Kategori tidak boleh kosong').max(100),
  nominal: z.number().positive('Nominal harus lebih besar dari 0'),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  keterangan: z.string().max(500, 'Keterangan maksimal 500 karakter').optional().default(''),
  project_id: z.string().uuid().optional().nullable(),
  rab_item_id: z.string().uuid().optional().nullable(),
  volume: z.number().positive().optional().nullable(),
  satuan: z.string().max(50).optional().nullable(),
  harga_satuan: z.number().positive().optional().nullable(),
});

export type FinanceTransactionInput = z.infer<typeof financeTransactionSchema>;

export const notificationScheduleSchema = z.object({
  channel: z.enum(['telegram', 'whatsapp', 'in_app', 'all']),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format waktu harus HH:MM'),
  categories: z.array(z.string()).min(1, 'Minimal pilih satu kategori'),
  enabled: z.boolean().default(true),
});

export type NotificationScheduleInput = z.infer<typeof notificationScheduleSchema>;
