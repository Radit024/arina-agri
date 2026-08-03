import type {
  FinanceTransactionForReport,
  RabEntryType,
  RabItem,
  TransactionJenis,
} from './rabTypes';

export function toMonthKey(dateLike: string) {
  return dateLike.slice(0, 7);
}

function normalizePlannedTotal(item: RabItem) {
  const calculated = item.volume * item.unitPrice;
  return Number.isFinite(item.plannedTotal) && item.plannedTotal > 0 ? item.plannedTotal : calculated;
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
