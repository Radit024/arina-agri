import { z } from 'zod';

export const batchSchema = z.object({
  tanggalPanen: z.string(),
  grade: z.enum(['A', 'B', 'C']),
  beratMasuk: z.coerce.number(),
  hargaModal: z.coerce.number(),
  hargaJual: z.coerce.number(),
  lokasiPenyimpanan: z.enum(['Gudang Utama', 'Gudang Cadangan']),
  estimasiKadaluarsa: z.string(),
  catatan: z.string().optional(),
});

export const stockOutSchema = z.object({
  batchId: z.string(),
  berat: z.coerce.number(),
  tujuan: z.enum(['Pasar Lokal', 'Distributor', 'Restoran', 'Lainnya']),
  tanggal: z.string(),
  catatan: z.string().optional(),
  namaPembeli: z.string().optional(),
  hargaRealisasi: z.coerce.number().min(0).optional(),
});

export type BatchFormInput = z.input<typeof batchSchema>;
export type BatchFormOutput = z.output<typeof batchSchema>;
export type StockOutFormInput = z.input<typeof stockOutSchema>;
export type StockOutFormOutput = z.output<typeof stockOutSchema>;
