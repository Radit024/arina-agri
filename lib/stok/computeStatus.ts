export type StockBatchStatus = 'aman' | 'menipis' | 'hampir_kadaluarsa' | 'habis';

export function computeStockBatchStatus(
  stokTersisa: number,
  beratMasuk: number,
  estimasiKadaluarsa: string,
): StockBatchStatus {
  const now = new Date();
  const kadaluarsa = new Date(estimasiKadaluarsa);
  const daysLeft = Math.ceil((kadaluarsa.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (stokTersisa === 0) return 'habis';
  if (daysLeft <= 3) return 'hampir_kadaluarsa';
  if (stokTersisa < beratMasuk * 0.2) return 'menipis';
  return 'aman';
}
