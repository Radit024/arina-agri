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

function stripSpecificationNoise(text: string): string {
  return text
    .replace(/@\s*\d+\s*k?g\b/gi, '')
    .replace(/\b\d+\s*k?g\b/gi, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\b\d+\s*-\s*\d+\s*jam\b/gi, '')
    .replace(/\b(pembelian|pembayaran|biaya|ongkos|jasa)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const CORE_AGRICULTURAL_NOUNS = new Set([
  'dolomit',
  'herbisida',
  'pestisida',
  'urea',
  'npk',
  'pupuk',
  'benih',
  'bibit',
  'sulam',
  'penyulaman',
  'karung',
  'tanah',
  'tanaman',
  'panen',
  'pompa',
  'sewa',
  'iuran',
  'transport',
  'persemaian',
  'dapog',
  'pengapuran',
  'penyiangan',
  'pemupukan',
  'pengendalian',
  'opt',
  'pengairan',
]);

function transactionTypeToRabType(jenis: TransactionJenis): RabEntryType {
  return jenis === 'pendapatan' ? 'income' : 'expense';
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function expandAgriculturalSynonyms(text: string): string[] {
  const norm = normalizeText(text);
  const synonyms = [norm];
  const stripped = stripSpecificationNoise(norm);
  if (stripped && stripped !== norm) {
    synonyms.push(stripped);
  }
  if (norm.includes('sulam') || norm.includes('penyulaman')) {
    synonyms.push('sulam', 'penyulaman');
  }
  if (norm.includes('penerimaan') || norm.includes('penjualan') || norm.includes('panen') || norm.includes('gabah')) {
    synonyms.push('penerimaan', 'penjualan', 'panen', 'gabah', 'gkp');
  }
  return synonyms;
}

export function suggestRabItemsForTransaction({
  items,
  transaction,
  limit = 5,
}: RabSuggestionInput): RabItemSuggestion[] {
  const targetType = transactionTypeToRabType(transaction.jenis);
  const rawSourceText = normalizeText(`${transaction.kategori ?? ''} ${transaction.keterangan ?? ''}`);
  const cleanedSourceText = stripSpecificationNoise(rawSourceText);
  const sourceText = `${rawSourceText} ${cleanedSourceText}`.trim();
  const sourceTokens = new Set(tokenize(sourceText));

  return items
    .filter((item) => item.type === targetType)
    .map((item): RabItemSuggestion => {
      const baseCandidates = [item.name, item.categoryName ?? '', ...item.aliases]
        .flatMap((val) => {
          const norm = normalizeText(val);
          const stripped = stripSpecificationNoise(norm);
          return stripped ? [norm, stripped] : [norm];
        })
        .filter(Boolean);
      const candidates = Array.from(new Set(baseCandidates.flatMap(expandAgriculturalSynonyms)));
      const normalizedItemName = normalizeText(item.name);
      const strippedItemName = stripSpecificationNoise(normalizedItemName);
      
      let maxScore = 0;
      const reasons: string[] = [];

      // For income entries, if both item and transaction are income, match them strongly
      if (targetType === 'income' && item.type === 'income') {
        maxScore = Math.max(maxScore, 10);
        reasons.push('penerimaan');
      }

      for (const candidate of candidates) {
        let currentScore = 0;
        const currentReasons: string[] = [];
        const isExactName = candidate === normalizedItemName || (strippedItemName && candidate === strippedItemName);

        if (sourceText.includes(candidate)) {
          currentScore += candidate.includes(' ') ? 10 : 7;
          if (CORE_AGRICULTURAL_NOUNS.has(candidate)) {
            currentScore += 5;
          }
          if (isExactName) {
            currentScore += 15;
          }
          currentReasons.push(candidate);
        } else {
          const candidateTokens = tokenize(candidate);
          const matches = candidateTokens.filter((token) => sourceTokens.has(token));
          const hasCoreNoun = candidateTokens.some((t) => CORE_AGRICULTURAL_NOUNS.has(t) && sourceTokens.has(t));
          const minRequired = hasCoreNoun
            ? 1
            : candidateTokens.length <= 1
            ? 1
            : Math.max(2, Math.floor(candidateTokens.length * 0.6));

          if (matches.length >= minRequired) {
            currentScore += matches.length * 2;
            if (hasCoreNoun) currentScore += 5;
            if (isExactName && matches.length === candidateTokens.length) {
              currentScore += 10;
            }
            currentReasons.push(...matches);
          }
        }

        if (currentScore > maxScore) {
          maxScore = currentScore;
          reasons.push(...currentReasons);
        }
      }

      return {
        item,
        score: maxScore,
        reason: Array.from(new Set(reasons)).join(', '),
      };
    })
    .filter((suggestion) => suggestion.score > 0)
    .sort((a, b) => b.score - a.score || a.item.sortOrder - b.item.sortOrder)
    .slice(0, limit);
}
