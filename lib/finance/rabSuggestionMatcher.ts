import type { RabEntryType, RabItem, TransactionJenis } from './rabTypes';

export interface RabSuggestionInput {
  items: RabItem[];
  transaction: {
    jenis: TransactionJenis;
    kategori?: string;
    keterangan?: string;
  };
  limit?: number;
}

export interface RabItemSuggestion {
  item: RabItem;
  score: number;
  reason: string;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function transactionTypeToRabType(jenis: TransactionJenis): RabEntryType {
  return jenis === 'pendapatan' ? 'income' : 'expense';
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

export function suggestRabItemsForTransaction({
  items,
  transaction,
  limit = 5,
}: RabSuggestionInput): RabItemSuggestion[] {
  const targetType = transactionTypeToRabType(transaction.jenis);
  const sourceText = normalizeText(`${transaction.kategori ?? ''} ${transaction.keterangan ?? ''}`);
  const sourceTokens = new Set(tokenize(sourceText));

  return items
    .filter((item) => item.type === targetType)
    .map((item): RabItemSuggestion => {
      const candidates = [item.name, item.categoryName ?? '', ...item.aliases]
        .map(normalizeText)
        .filter(Boolean);
      let score = 0;
      const reasons: string[] = [];

      for (const candidate of candidates) {
        if (sourceText.includes(candidate)) {
          score += candidate.includes(' ') ? 10 : 7;
          reasons.push(candidate);
          continue;
        }

        const candidateTokens = tokenize(candidate);
        const matches = candidateTokens.filter((token) => sourceTokens.has(token));
        if (matches.length > 0) {
          score += matches.length * 2;
          reasons.push(...matches);
        }
      }

      return {
        item,
        score,
        reason: Array.from(new Set(reasons)).join(', '),
      };
    })
    .filter((suggestion) => suggestion.score > 0)
    .sort((a, b) => b.score - a.score || a.item.sortOrder - b.item.sortOrder)
    .slice(0, limit);
}
