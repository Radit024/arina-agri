import type { ApiTransaction } from '@/lib/api';

export function findTransactionsLinkedToRabItems(
  transactions: ApiTransaction[],
  rabItemIds: string[],
): ApiTransaction[] {
  const idSet = new Set(rabItemIds);
  return transactions.filter((tx) => Boolean(tx.rabItemId) && idSet.has(tx.rabItemId as string));
}
