import type { FinanceTransactionForReport, RabItem, TransactionJenis } from './rabTypes';

export interface IncomeStatementWorksheetItem {
  id: string;
  label: string;
  amount: number;
}

export interface IncomeStatementWorksheetGroup {
  id: string;
  label: string;
  subtotal: number;
  items: IncomeStatementWorksheetItem[];
}

export interface IncomeStatementWorksheetData {
  incomeGroups: IncomeStatementWorksheetGroup[];
  expenseGroups: IncomeStatementWorksheetGroup[];
  totalPendapatan: number;
  totalPengeluaran: number;
  labaRugi: number;
}

type MutableWorksheetItem = IncomeStatementWorksheetItem & {
  sortOrder: number;
};

type MutableWorksheetGroup = Omit<IncomeStatementWorksheetGroup, 'items'> & {
  sortOrder: number;
  items: Map<string, MutableWorksheetItem>;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'lain-lain';
}

function getDefaultGroupLabel(jenis: TransactionJenis, kategori: string) {
  if (jenis === 'pendapatan') return 'Pendapatan';
  return kategori.trim() || 'Lain-lain';
}

function getDefaultItemLabel(transaction: FinanceTransactionForReport) {
  return transaction.keterangan?.trim() || transaction.kategori.trim() || 'Tanpa keterangan';
}

function getGroupMap(jenis: TransactionJenis, incomeGroups: Map<string, MutableWorksheetGroup>, expenseGroups: Map<string, MutableWorksheetGroup>) {
  return jenis === 'pendapatan' ? incomeGroups : expenseGroups;
}

function addTransactionToGroups({
  transaction,
  rabItem,
  incomeGroups,
  expenseGroups,
  index,
}: {
  transaction: FinanceTransactionForReport;
  rabItem?: RabItem;
  incomeGroups: Map<string, MutableWorksheetGroup>;
  expenseGroups: Map<string, MutableWorksheetGroup>;
  index: number;
}) {
  const groupLabel = rabItem?.categoryName ?? getDefaultGroupLabel(transaction.jenis, transaction.kategori);
  const groupKey = rabItem?.categoryId ?? slugify(groupLabel);
  const itemLabel = rabItem?.name ?? getDefaultItemLabel(transaction);
  const itemKey = rabItem?.id ?? slugify(itemLabel);
  const groupId = `${transaction.jenis === 'pendapatan' ? 'income' : 'expense'}:${groupKey}`;
  const itemId = `${groupId}:${itemKey}`;
  const groups = getGroupMap(transaction.jenis, incomeGroups, expenseGroups);

  if (!groups.has(groupId)) {
    groups.set(groupId, {
      id: groupId,
      label: groupLabel,
      subtotal: 0,
      sortOrder: rabItem?.sortOrder ?? index,
      items: new Map(),
    });
  }

  const group = groups.get(groupId)!;
  group.subtotal += transaction.nominal;
  group.sortOrder = Math.min(group.sortOrder, rabItem?.sortOrder ?? index);

  if (!group.items.has(itemId)) {
    group.items.set(itemId, {
      id: itemId,
      label: itemLabel,
      amount: 0,
      sortOrder: rabItem?.sortOrder ?? index,
    });
  }

  const item = group.items.get(itemId)!;
  item.amount += transaction.nominal;
  item.sortOrder = Math.min(item.sortOrder, rabItem?.sortOrder ?? index);
}

function finalizeGroups(groups: Map<string, MutableWorksheetGroup>): IncomeStatementWorksheetGroup[] {
  return Array.from(groups.values())
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
    .map((group) => ({
      id: group.id,
      label: group.label,
      subtotal: group.subtotal,
      items: Array.from(group.items.values())
        .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
        .map((item) => ({ id: item.id, label: item.label, amount: item.amount })),
    }));
}

export function buildIncomeStatementWorksheetData({
  transactions,
  rabItems,
}: {
  transactions: FinanceTransactionForReport[];
  rabItems: RabItem[];
}): IncomeStatementWorksheetData {
  const rabItemById = new Map(rabItems.map((item) => [item.id, item]));
  const incomeGroups = new Map<string, MutableWorksheetGroup>();
  const expenseGroups = new Map<string, MutableWorksheetGroup>();

  transactions.forEach((transaction, index) => {
    const rabItem = transaction.rabItemId ? rabItemById.get(transaction.rabItemId) : undefined;
    addTransactionToGroups({ transaction, rabItem, incomeGroups, expenseGroups, index });
  });

  const finalizedIncomeGroups = finalizeGroups(incomeGroups);
  const finalizedExpenseGroups = finalizeGroups(expenseGroups);
  const totalPendapatan = finalizedIncomeGroups.reduce((sum, group) => sum + group.subtotal, 0);
  const totalPengeluaran = finalizedExpenseGroups.reduce((sum, group) => sum + group.subtotal, 0);

  return {
    incomeGroups: finalizedIncomeGroups,
    expenseGroups: finalizedExpenseGroups,
    totalPendapatan,
    totalPengeluaran,
    labaRugi: totalPendapatan - totalPengeluaran,
  };
}
