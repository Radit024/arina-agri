import {
  formatCustomFinanceCategoryLabel,
  resolveFinanceCategory,
  type FinanceCategoryDefinition,
} from '@/lib/finance/categories';

interface FinanceChartTransaction {
  jenis: 'pengeluaran' | 'pendapatan';
  kategori: string;
  keterangan?: string;
  nominal: number;
  rabCategoryId?: string | null;
}

interface FinanceChartCategory extends FinanceCategoryDefinition {
  color: string;
}

interface BuildFinanceExpensePieDataInput {
  transactions: FinanceChartTransaction[];
  categories: FinanceChartCategory[];
  customColors: string[];
  emptyLabel?: string;
  /** Nama kategori RAB berdasarkan id, dipakai sebagai sumber pengelompokan utama. */
  rabCategoryNameById?: Map<string, string>;
}

export interface FinanceExpensePiePoint {
  id: string;
  value: number;
  label: string;
  color: string;
  percentage: number;
}

export function buildFinanceExpensePieData({
  transactions,
  categories,
  customColors,
  emptyLabel = 'Kosong',
  rabCategoryNameById,
}: BuildFinanceExpensePieDataInput): { data: FinanceExpensePiePoint[]; colors: string[] } {
  const totals = new Map<string, FinanceExpensePiePoint>();
  let customColorIndex = 0;

  for (const transaction of transactions) {
    if (transaction.jenis !== 'pengeluaran') continue;

    // Transaksi yang tertaut ke RAB memakai kategori RAB sebagai kelompok utama supaya
    // angkanya identik dengan tab RAB dan Laba Rugi. Kalau tidak, fuzzy-matching ke
    // daftar kategori bawaan memecah satu kategori RAB menjadi beberapa label berbeda
    // (mis. "SAPRODI" terbagi menjadi "Pupuk" dan "Pestisida") sehingga total per
    // label tidak akan pernah cocok dengan subtotal di tab lain.
    const rabCategoryName = transaction.rabCategoryId
      ? rabCategoryNameById?.get(transaction.rabCategoryId)
      : undefined;

    let label: string;
    let color: string;
    let matched: FinanceCategoryDefinition | null = null;

    if (rabCategoryName) {
      label = rabCategoryName;
      color = customColors[customColorIndex % customColors.length] ?? '#0f766e';
      if (!totals.has(rabCategoryName.toLowerCase())) customColorIndex += 1;
    } else {
      matched = resolveFinanceCategory({
        jenis: 'pengeluaran',
        kategori: transaction.kategori,
        keterangan: transaction.keterangan,
        categories,
      });
      label = matched?.label ?? formatCustomFinanceCategoryLabel(transaction.kategori);
      color = matched?.color ?? customColors[customColorIndex % customColors.length] ?? '#0f766e';
      if (!matched && !totals.has(label)) {
        customColorIndex += 1;
      }
    }

    const key = label.toLowerCase();
    const existing = totals.get(key);
    totals.set(key, {
      id: label,
      value: (existing?.value ?? 0) + transaction.nominal,
      label: existing?.label ?? label,
      color: existing?.color ?? color,
      percentage: 0,
    });
  }

  const data = Array.from(totals.values()).filter((item) => item.value > 0);
  if (data.length === 0) {
    return {
      data: [{ id: emptyLabel, value: 1, label: emptyLabel, color: '#e2e8f0', percentage: 0 }],
      colors: ['#e2e8f0'],
    };
  }

  const totalExpense = data.reduce((sum, item) => sum + item.value, 0);
  const dataWithPercentages = data.map((item) => ({
    ...item,
    percentage: totalExpense > 0 ? (item.value / totalExpense) * 100 : 0,
  }));

  return {
    data: dataWithPercentages,
    colors: dataWithPercentages.map((item) => item.color),
  };
}
