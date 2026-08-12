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
    aliases: ['pestisida', 'pesticide', 'obat tanaman', 'insektisida', 'fungisida'],
    source: 'default',
  },
  {
    id: 'default-expense-saprodi',
    jenis: 'pengeluaran',
    label: 'SAPRODI',
    aliases: [
      'saprodi',
      'dolomit',
      'pembelian dolomit',
      'herbisida',
      'pembelian herbisida',
      'sarana produksi',
      'benih',
      'bibit',
      'biji',
    ],
    source: 'default',
  },
  {
    id: 'default-expense-labor',
    jenis: 'pengeluaran',
    label: 'TENAGA KERJA',
    aliases: [
      'tenaga kerja',
      'labor',
      'gaji',
      'upah',
      'pekerja',
      'buruh',
      'penyulaman',
      'upah penyulaman',
      'olah lahan',
      'tanam',
      'panen',
      'matun',
      'semprot',
    ],
    source: 'default',
  },
  {
    id: 'default-expense-land-rent',
    jenis: 'pengeluaran',
    label: 'SEWA LAHAN',
    aliases: ['sewa lahan', 'sewa', 'lahan', 'sewa tanah', 'biaya tetap'],
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
    aliases: ['alat tani', 'alat', 'peralatan', 'cangkul', 'sprayer', 'sewa alat', 'alsintan', 'jasa alsintan'],
    source: 'default',
  },
  {
    id: 'default-expense-other',
    jenis: 'pengeluaran',
    label: 'Lainnya',
    aliases: ['lainnya', 'other', 'lain-lain'],
    source: 'default',
  },
  {
    id: 'default-income-harvest-sales',
    jenis: 'pendapatan',
    label: 'Penjualan Hasil Panen',
    aliases: ['penjualan', 'jual', 'panen', 'hasil panen', 'penjualan panen', 'penerimaan', 'penjualan cabai', 'penjualan padi'],
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

const GENERIC_CATEGORY_TERMS = new Set(['lainnya', 'other', 'lain-lain', 'pembelian', 'transaksi', 'pengeluaran', 'pemasukan']);
const HIGH_PRIORITY_SAPRODI_LABOR_TERMS = new Set([
  'dolomit',
  'pembelian dolomit',
  'herbisida',
  'pembelian herbisida',
  'penyulaman',
  'upah penyulaman',
]);

function scoreTerm(term: string, normalizedCategory: string, normalizedInput: string) {
  if (!term) return 0;

  const inputWords = normalizedInput.split(' ');
  const isHighPriorityKeyword = HIGH_PRIORITY_SAPRODI_LABOR_TERMS.has(term) && inputWords.includes(term);

  if (isHighPriorityKeyword) {
    return 15_000 + term.length;
  }

  if (normalizedCategory === term) {
    if (GENERIC_CATEGORY_TERMS.has(term)) return 3_000 + term.length;
    return 10_000 + term.length;
  }
  if (normalizedInput === term) return 9_000 + term.length;

  if (inputWords.includes(term)) return 8_800 + term.length;
  if (normalizedInput.startsWith(`${term} `)) return 8_000 + term.length;
  if (normalizedInput.endsWith(` ${term}`)) return 7_000 + term.length;
  if (normalizedInput.includes(` ${term} `)) return 6_000 + term.length;

  const termWords = term.split(' ');
  const matchCount = termWords.filter((w) => w.length >= 3 && inputWords.includes(w)).length;
  if (matchCount > 0) {
    return 4_000 + matchCount * 1_000 + term.length;
  }

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
