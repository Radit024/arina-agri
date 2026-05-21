const NEWS_CATEGORY_KEYWORDS: Record<string, string[]> = {
  harga: ['harga', 'komoditas', 'pangan', 'cabai', 'pupuk', 'beras', 'jagung', 'kedelai'],
  cuaca: ['cuaca', 'banjir', 'hujan', 'kemarau', 'iklim', 'gagal panen', 'musim tanam'],
  kebijakan: ['kebijakan', 'pemerintah', 'kementan', 'mentan', 'subsidi', 'impor', 'ekspor', 'regulasi'],
  tips: ['tips', 'cara', 'panduan', 'budidaya', 'tanam', 'perawatan', 'hama', 'pupuk'],
  pasar: ['pasar', 'harga', 'komoditas', 'permintaan', 'pasokan', 'distribusi', 'ekonomi'],
};

const SEARCH_COLUMNS = ['title', 'snippet', 'source'];

function escapeIlikeValue(value: string) {
  return value.replace(/[%_,]/g, (char) => `\\${char}`);
}

export function normalizeNewsCategory(category: string | null) {
  const normalized = (category || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(NEWS_CATEGORY_KEYWORDS, normalized) ? normalized : '';
}

export function getNewsCategoryKeywords(category: string | null) {
  return NEWS_CATEGORY_KEYWORDS[normalizeNewsCategory(category)] || [];
}

export function buildNewsCategoryFilter(category: string | null) {
  const keywords = getNewsCategoryKeywords(category);
  if (keywords.length === 0) return null;

  return keywords
    .flatMap((keyword) => {
      const pattern = `%${escapeIlikeValue(keyword)}%`;
      return SEARCH_COLUMNS.map((column) => `${column}.ilike.${pattern}`);
    })
    .join(',');
}
