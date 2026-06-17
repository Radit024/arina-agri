import type {
  CashFlowComparison,
  CashFlowComparisonRow,
  FinanceTransactionForReport,
  IncomeStatementComparison,
  IncomeStatementComparisonRow,
  RabEntryType,
  RabItem,
  TransactionJenis,
  VarianceStatus,
} from './rabTypes';

const UNLINKED_CATEGORY_ID = 'unlinked';
const UNLINKED_CATEGORY_NAME = 'Belum terhubung';
const VARIANCE_TOLERANCE = 0.01;

function toMonthKey(dateLike: string) {
  return dateLike.slice(0, 7);
}

function normalizePlannedTotal(item: RabItem) {
  const calculated = item.volume * item.unitPrice;
  return Number.isFinite(item.plannedTotal) && item.plannedTotal > 0 ? item.plannedTotal : calculated;
}

function getVariancePercent(planned: number, actual: number) {
  if (planned === 0) return null;
  return (actual - planned) / planned;
}

function monthIndex(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return year * 12 + month - 1;
}

function monthKeyFromIndex(index: number) {
  const year = Math.floor(index / 12);
  const month = index % 12 + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function buildMonthRange(startMonth: string, endMonth: string) {
  const start = monthIndex(startMonth);
  const end = monthIndex(endMonth);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];

  return Array.from({ length: end - start + 1 }, (_, index) => monthKeyFromIndex(start + index));
}

export function sumRabItemsByType(items: RabItem[], type: RabEntryType) {
  return items
    .filter((item) => item.type === type)
    .reduce((total, item) => total + normalizePlannedTotal(item), 0);
}

export function sumTransactionsByJenis(transactions: FinanceTransactionForReport[], jenis: TransactionJenis) {
  return transactions
    .filter((transaction) => transaction.jenis === jenis)
    .reduce((total, transaction) => total + transaction.nominal, 0);
}

export function getVarianceStatus({
  type,
  planned,
  actual,
}: {
  type: RabEntryType;
  planned: number;
  actual: number;
}): VarianceStatus {
  if (actual === 0) return 'belum_ada_realisasi';
  if (planned === 0 || Math.abs(actual - planned) / planned <= VARIANCE_TOLERANCE) return 'sesuai_rencana';

  if (type === 'expense') {
    return actual > planned ? 'over_budget' : 'hemat';
  }

  return actual > planned ? 'di_atas_target' : 'di_bawah_target';
}

export function buildIncomeStatementComparison({
  rabItems,
  transactions,
}: {
  rabItems: RabItem[];
  transactions: FinanceTransactionForReport[];
}): IncomeStatementComparison {
  const actualByItem = new Map<string, number>();
  const unlinkedByKey = new Map<string, IncomeStatementComparisonRow>();

  for (const transaction of transactions) {
    const itemId = transaction.rabItemId ?? null;
    if (itemId) {
      actualByItem.set(itemId, (actualByItem.get(itemId) ?? 0) + transaction.nominal);
      continue;
    }

    const type: RabEntryType = transaction.jenis === 'pendapatan' ? 'income' : 'expense';
    const key = `${type}:${transaction.kategori || UNLINKED_CATEGORY_NAME}`;
    const current = unlinkedByKey.get(key);
    const actual = (current?.actual ?? 0) + transaction.nominal;
    unlinkedByKey.set(key, {
      categoryId: UNLINKED_CATEGORY_ID,
      categoryName: UNLINKED_CATEGORY_NAME,
      itemId: null,
      itemName: transaction.kategori || UNLINKED_CATEGORY_NAME,
      type,
      planned: 0,
      actual,
      variance: actual,
      variancePercent: null,
      status: getVarianceStatus({ type, planned: 0, actual }),
    });
  }

  const rows: IncomeStatementComparisonRow[] = rabItems.map((item) => {
    const planned = normalizePlannedTotal(item);
    const actual = actualByItem.get(item.id) ?? 0;

    return {
      categoryId: item.categoryId,
      categoryName: item.categoryName ?? item.categoryId,
      itemId: item.id,
      itemName: item.name,
      type: item.type,
      planned,
      actual,
      variance: actual - planned,
      variancePercent: getVariancePercent(planned, actual),
      status: getVarianceStatus({ type: item.type, planned, actual }),
    };
  });

  rows.push(...unlinkedByKey.values());

  const plannedIncome = sumRabItemsByType(rabItems, 'income');
  const plannedExpense = sumRabItemsByType(rabItems, 'expense');
  const actualIncome = sumTransactionsByJenis(transactions, 'pendapatan');
  const actualExpense = sumTransactionsByJenis(transactions, 'pengeluaran');
  const plannedProfit = plannedIncome - plannedExpense;
  const actualProfit = actualIncome - actualExpense;

  return {
    rows,
    summary: {
      plannedIncome,
      plannedExpense,
      plannedProfit,
      actualIncome,
      actualExpense,
      actualProfit,
      profitVariance: actualProfit - plannedProfit,
      profitVariancePercent: getVariancePercent(plannedProfit, actualProfit),
    },
  };
}

export function buildCashFlowComparison({
  rabItems,
  transactions,
  startMonth,
  endMonth,
}: {
  rabItems: RabItem[];
  transactions: FinanceTransactionForReport[];
  startMonth: string;
  endMonth: string;
}): CashFlowComparison {
  const months = buildMonthRange(startMonth, endMonth);
  let plannedCumulative = 0;
  let actualCumulative = 0;

  const rows: CashFlowComparisonRow[] = months.map((month) => {
    const plannedInflow = rabItems
      .filter((item) => item.type === 'income' && item.plannedCashMonth === month)
      .reduce((total, item) => total + normalizePlannedTotal(item), 0);
    const plannedOutflow = rabItems
      .filter((item) => item.type === 'expense' && item.plannedCashMonth === month)
      .reduce((total, item) => total + normalizePlannedTotal(item), 0);
    const actualInflow = transactions
      .filter((transaction) => transaction.jenis === 'pendapatan' && toMonthKey(transaction.tanggal) === month)
      .reduce((total, transaction) => total + transaction.nominal, 0);
    const actualOutflow = transactions
      .filter((transaction) => transaction.jenis === 'pengeluaran' && toMonthKey(transaction.tanggal) === month)
      .reduce((total, transaction) => total + transaction.nominal, 0);

    const plannedNet = plannedInflow - plannedOutflow;
    const actualNet = actualInflow - actualOutflow;
    plannedCumulative += plannedNet;
    actualCumulative += actualNet;

    return {
      month,
      plannedInflow,
      actualInflow,
      plannedOutflow,
      actualOutflow,
      plannedNet,
      actualNet,
      plannedCumulative,
      actualCumulative,
      variance: actualNet - plannedNet,
      variancePercent: getVariancePercent(plannedNet, actualNet),
    };
  });

  const plannedInflow = rows.reduce((total, row) => total + row.plannedInflow, 0);
  const actualInflow = rows.reduce((total, row) => total + row.actualInflow, 0);
  const plannedOutflow = rows.reduce((total, row) => total + row.plannedOutflow, 0);
  const actualOutflow = rows.reduce((total, row) => total + row.actualOutflow, 0);
  const plannedNet = plannedInflow - plannedOutflow;
  const actualNet = actualInflow - actualOutflow;

  return {
    rows,
    summary: {
      plannedInflow,
      actualInflow,
      plannedOutflow,
      actualOutflow,
      plannedNet,
      actualNet,
      variance: actualNet - plannedNet,
      variancePercent: getVariancePercent(plannedNet, actualNet),
    },
  };
}
