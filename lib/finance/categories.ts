export type FinanceCategoryKind = 'pengeluaran' | 'pendapatan';
export type FinanceCategorySource = 'default' | 'custom';

export interface FinanceCategoryDefinition {
  id?: string;
  jenis: FinanceCategoryKind;
  label: string;
  aliases: string[];
  color?: string;
  source?: FinanceCategorySource;
}

export interface ResolveFinanceCategoryInput {
  jenis: FinanceCategoryKind;
  kategori: string;
  keterangan?: string;
  categories: FinanceCategoryDefinition[];
}

export const DEFAULT_FINANCE_CATEGORIES: FinanceCategoryDefinition[] = [
  {
    id: 'default-expense-fertilizer',
    jenis: 'pengeluaran',
    label: 'Pupuk',
    aliases: ['pupuk', 'fertilizer', 'npk', 'urea', 'kompos', 'beli pupuk', 'pembelian pupuk'],
    source: 'default',
  },
  {
    id: 'default-expense-pesticide',
    jenis: 'pengeluaran',
    label: 'Pestisida',
    aliases: ['pestisida', 'pesticide', 'obat tanaman', 'insektisida', 'fungisida', 'herbisida'],
    source: 'default',
  },
  {
    id: 'default-expense-labor',
    jenis: 'pengeluaran',
    label: 'Tenaga Kerja',
    aliases: ['tenaga kerja', 'labor', 'gaji', 'upah', 'pekerja', 'buruh'],
    source: 'default',
  },
  {
    id: 'default-expense-irrigation',
    jenis: 'pengeluaran',
    label: 'Irigasi & Air',
    aliases: ['irigasi', 'air', 'irigasi air', 'pompa air', 'listrik pompa'],
    source: 'default',
  },
  {
    id: 'default-expense-tools',
    jenis: 'pengeluaran',
    label: 'Alat Tani',
    aliases: ['alat tani', 'alat', 'peralatan', 'cangkul', 'sprayer', 'sewa alat'],
    source: 'default',
  },
  {
    id: 'default-expense-other',
    jenis: 'pengeluaran',
    label: 'Lainnya',
    aliases: ['lainnya', 'other'],
    source: 'default',
  },
  {
    id: 'default-income-harvest-sales',
    jenis: 'pendapatan',
    label: 'Penjualan Hasil Panen',
    aliases: ['penjualan', 'jual', 'panen', 'hasil panen', 'penjualan panen', 'penjualan cabai'],
    source: 'default',
  },
  {
    id: 'default-income-service',
    jenis: 'pendapatan',
    label: 'Layanan Jasa',
    aliases: ['layanan jasa', 'jasa', 'service'],
    source: 'default',
  },
  {
    id: 'default-income-other',
    jenis: 'pendapatan',
    label: 'Lainnya',
    aliases: ['lainnya', 'other'],
    source: 'default',
  },
];

export function normalizeFinanceCategoryText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatCustomFinanceCategoryLabel(value: string): string {
  const normalized = normalizeFinanceCategoryText(value);
  if (!normalized) return 'Lainnya';

  return normalized
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function categoryTerms(category: FinanceCategoryDefinition) {
  return [category.label, ...category.aliases]
    .map(normalizeFinanceCategoryText)
    .filter(Boolean);
}

function scoreTerm(term: string, normalizedCategory: string, normalizedInput: string) {
  if (!term) return 0;
  if (normalizedCategory === term) return 10_000 + term.length;
  if (normalizedInput === term) return 9_000 + term.length;
  if (normalizedInput.startsWith(`${term} `)) return 8_000 + term.length;
  if (normalizedInput.endsWith(` ${term}`)) return 7_000 + term.length;
  if (normalizedInput.includes(` ${term} `)) return 6_000 + term.length;
  return 0;
}

export function resolveFinanceCategory({
  jenis,
  kategori,
  keterangan = '',
  categories,
}: ResolveFinanceCategoryInput): FinanceCategoryDefinition | null {
  const normalizedCategory = normalizeFinanceCategoryText(kategori);
  const normalizedInput = normalizeFinanceCategoryText([kategori, keterangan].filter(Boolean).join(' '));

  let best: { category: FinanceCategoryDefinition; score: number } | null = null;

  for (const category of categories) {
    if (category.jenis !== jenis) continue;

    for (const term of categoryTerms(category)) {
      const score = scoreTerm(term, normalizedCategory, normalizedInput);
      if (score > (best?.score ?? 0)) {
        best = { category, score };
      }
    }
  }

  return best?.category ?? null;
}
