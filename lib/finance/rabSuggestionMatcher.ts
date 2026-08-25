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

const AGRICULTURAL_CATEGORY_SYNONYMS: Record<string, string[]> = {
  saprodi: ['saprodi', 'pupuk', 'pestisida', 'benih', 'bibit', 'obat', 'herbisida', 'fungisida', 'insektisida', 'dolomit'],
  pupuk: ['pupuk', 'saprodi', 'urea', 'npk', 'pemupukan'],
  pestisida: ['pestisida', 'saprodi', 'opt', 'pengendalian opt', 'herbisida', 'fungisida', 'insektisida'],
  benih: ['benih', 'bibit', 'saprodi', 'persemaian'],
  bibit: ['bibit', 'benih', 'saprodi', 'persemaian'],
  'tenaga kerja': ['tenaga kerja', 'upah', 'gaji', 'borongan', 'hok', 'pekerja'],
  upah: ['upah', 'tenaga kerja', 'gaji', 'borongan', 'hok', 'pekerja'],
  alsintan: ['jasa alsintan', 'alsintan', 'traktor', 'combine', 'harvester', 'alat mesin', 'sewa traktor', 'bajak'],
  'jasa alsintan': ['jasa alsintan', 'alsintan', 'traktor', 'combine', 'harvester', 'alat mesin', 'sewa traktor', 'bajak'],
  irigasi: ['irigasi & air', 'irigasi', 'pengairan', 'pompa air', 'pompa', 'iuran air'],
  'irigasi & air': ['irigasi & air', 'irigasi', 'pengairan', 'pompa air', 'pompa', 'iuran air'],
  'alat tani': ['alat tani', 'cangkul', 'sprayer', 'semprot', 'alat semprot', 'gembor', 'terpal', 'karung'],
  operasional: ['operasional', 'transport', 'bbm', 'bensin', 'solar', 'sewa lahan', 'konsumsi'],
  'penjualan hasil panen': ['penjualan hasil panen', 'penjualan', 'panen', 'gabah', 'gkp', 'hasil panen'],
};

function expandAgriculturalSynonyms(text: string): string[] {
  const norm = normalizeText(text);
  const synonyms = new Set<string>([norm]);
  if (norm.includes('sulam') || norm.includes('penyulaman')) {
    synonyms.add('sulam');
    synonyms.add('penyulaman');
  }
  if (norm.includes('penerimaan') || norm.includes('penjualan') || norm.includes('panen') || norm.includes('gabah')) {
    synonyms.add('penerimaan');
    synonyms.add('penjualan');
    synonyms.add('panen');
    synonyms.add('gabah');
    synonyms.add('gkp');
  }

  for (const [key, mapping] of Object.entries(AGRICULTURAL_CATEGORY_SYNONYMS)) {
    if (norm === key || norm.includes(key)) {
      mapping.forEach((s) => synonyms.add(s));
    }
  }

  return Array.from(synonyms);
}

export function suggestRabItemsForTransaction({
  items,
  transaction,
  limit = 5,
}: RabSuggestionInput): RabItemSuggestion[] {
  const targetType = transactionTypeToRabType(transaction.jenis);
  const rawSourceString = `${transaction.kategori ?? ''} ${transaction.keterangan ?? ''}`;
  const cleanedSourceString = stripSpecificationNoise(rawSourceString);
  const rawNorm = normalizeText(rawSourceString);
  const cleanNorm = normalizeText(cleanedSourceString);
  const sourceText = `${rawNorm} ${cleanNorm}`;
  const sourceTokens = new Set(tokenize(sourceText));

  return items
    .filter((item) => item.type === targetType)
    .map((item): RabItemSuggestion => {
      const baseCandidates = [item.name, item.categoryName ?? '', ...item.aliases]
        .flatMap((val) => {
          const strippedRaw = stripSpecificationNoise(val);
          const norm = normalizeText(val);
          const stripped = normalizeText(strippedRaw);
          return stripped !== norm ? [norm, stripped] : [norm];
        })
        .filter(Boolean);
      const candidates = Array.from(new Set(baseCandidates.flatMap(expandAgriculturalSynonyms)));
      const normalizedItemName = normalizeText(item.name);
      const strippedItemName = normalizeText(stripSpecificationNoise(item.name));
      
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

        if (rawNorm.includes(candidate) || cleanNorm.includes(candidate)) {
          currentScore += candidate.includes(' ') ? 10 : 7;
          
          const candidateTokens = tokenize(candidate);
          const coreNounsCount = candidateTokens.filter(t => CORE_AGRICULTURAL_NOUNS.has(t)).length;
          currentScore += coreNounsCount * 5;
          
          if (isExactName) {
            currentScore += 15;
          }
          currentReasons.push(candidate);
        } else {
          const candidateTokens = tokenize(candidate);
          const matches = candidateTokens.filter((token) => sourceTokens.has(token));
          const matchedCoreNounsCount = matches.filter(t => CORE_AGRICULTURAL_NOUNS.has(t)).length;
          const hasCoreNoun = matchedCoreNounsCount > 0;
          const minRequired = hasCoreNoun
            ? 1
            : candidateTokens.length <= 1
            ? 1
            : Math.max(2, Math.floor(candidateTokens.length * 0.6));

          if (matches.length >= minRequired) {
            currentScore += matches.length * 2;
            currentScore += matchedCoreNounsCount * 5;
            if (isExactName && matches.length === candidateTokens.length) {
              currentScore += 10;
            }
            currentReasons.push(...matches);
          }
        }

        // --- CONTEXTUAL PRIORITY BOOST ---
        // If the transaction starts with the candidate (e.g. "transport hasil panen"), 
        // the candidate ("transport") is the primary subject, not a modifier ("panen").
        if (cleanNorm.startsWith(candidate) && isExactName) {
           currentScore += 20;
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
