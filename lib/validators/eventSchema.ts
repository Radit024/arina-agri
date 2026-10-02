import { z } from 'zod';

import { isValidDateInputValue } from '@/lib/formatters';

type CalendarTranslator = (key: string) => string;

export const getEventSchema = (t: CalendarTranslator) => z.object({
  judul: z.string().min(1, t('validation.titleRequired')),
  jenis: z.enum(['pemupukan', 'penyemprotan', 'irigasi', 'pemetikan', 'lainnya']),
  tanggal: z
    .string()
    .min(1, t('validation.dateRequired'))
    .refine((value) => !value || isValidDateInputValue(value), 'Format tanggal harus dd-MM-yyyy'),
  waktu: z.string().optional(),
  catatan: z.string().optional(),
});

export type EventFormData = z.infer<ReturnType<typeof getEventSchema>>;
