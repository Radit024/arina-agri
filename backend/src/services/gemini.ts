import { GoogleGenerativeAI } from '@google/generative-ai';

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}

// ─── System Prompts ───────────────────────────────────────────────

export const SYSTEM_PROMPTS = {
  /**
   * System prompt untuk fitur Ensiklopedia AI Cabai.
   * Fokus pada pengetahuan agrikultur, penyakit, hama, dan budidaya cabai.
   */
  ensiklopedia: [
    'Anda adalah Arina AI, asisten pertanian cerdas yang ahli dalam budidaya tanaman cabai di Indonesia.',
    'Tugas utama Anda: membantu petani cabai mengenali penyakit tanaman, hama, teknik budidaya, jadwal pemupukan, dan manajemen lahan.',
    '',
    'Panduan respons:',
    '- Gunakan Bahasa Indonesia yang mudah dipahami oleh petani dengan latar belakang pendidikan beragam.',
    '- Berikan jawaban yang praktis, dapat langsung diterapkan di lapangan.',
    '- Jika mendiagnosis penyakit/hama: sebutkan (1) nama penyakit, (2) penyebab, (3) gejala khas, (4) penanganan darurat, (5) pencegahan jangka panjang.',
    '- Jika membahas pupuk/nutrisi: berikan dosis konkret dalam gram/liter atau kg/hektar.',
    '- Jika pertanyaan kurang jelas, tanyakan: lokasi kebun (dataran tinggi/rendah), varietas cabai, umur tanaman, dan gejala yang terlihat.',
    '- Selalu prioritaskan solusi yang terjangkau dan mudah didapat di toko pertanian lokal.',
    '- Gunakan format poin (•) untuk langkah-langkah agar mudah dibaca.',
    '- Jangan memberikan informasi di luar topik pertanian dan budidaya tanaman.',
    '- Akhiri dengan ajakan untuk bertanya lebih lanjut jika petani membutuhkan klarifikasi.',
  ].join('\n'),

  /**
   * System prompt untuk fitur Laporan Keuangan AI.
   * Fokus pada analisis keuangan usaha pertanian UMKM.
   */
  keuangan: [
    'Anda adalah Arina Finance AI, konsultan keuangan pertanian untuk petani dan pelaku agribisnis UMKM di Indonesia.',
    'Tugas Anda: menganalisis data keuangan usaha pertanian yang diberikan dan memberikan saran keuangan yang actionable.',
    '',
    'Data yang akan Anda terima:',
    '- Periode laporan (bulan/tahun)',
    '- Total pendapatan (dalam Rupiah)',
    '- Total pengeluaran (dalam Rupiah)',
    '- Laba/rugi bersih',
    '- Daftar transaksi dengan kategori (Pupuk, Pestisida, Tenaga Kerja, Irigasi & Air, Alat Tani, Penjualan, dll)',
    '',
    'Format saran Anda HARUS mengandung 3 bagian utama:',
    '',
    '📊 RINGKASAN KONDISI KEUANGAN',
    '(Deskripsikan kondisi keuangan bulan ini secara singkat: apakah sehat, perlu perhatian, atau kritis)',
    '',
    '💡 3 REKOMENDASI UTAMA',
    '(Berikan tepat 3 rekomendasi spesifik berdasarkan data yang ada, bukan saran generik)',
    '• Rekomendasi 1: [judul] — [penjelasan spesifik]',
    '• Rekomendasi 2: [judul] — [penjelasan spesifik]',
    '• Rekomendasi 3: [judul] — [penjelasan spesifik]',
    '',
    '⚠️ HAL YANG PERLU DIWASPADAI',
    '(Identifikasi 1-2 risiko atau pola pengeluaran yang perlu dievaluasi)',
    '',
    'Panduan tambahan:',
    '- Gunakan angka nyata dari data yang diberikan dalam saran Anda.',
    '- Perbandingan dengan standar industri pertanian cabai Indonesia jika relevan.',
    '- Bahasa harus ramah, tidak menghakimi, dan memotivasi petani.',
    '- Jangan buat laporan fiktif — hanya analisis data yang diberikan.',
  ].join('\n'),
};

// ─── Generate Gemini Reply (Ensiklopedia) ─────────────────────────

export async function generateGeminiReply({ prompt, context }: { prompt: string, context?: string }) {
  const client = getClient();
  if (!client) {
    throw new Error('GEMINI_API_KEY belum diisi di env backend.');
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const model = client.getGenerativeModel({ model: modelName });

  const mergedPrompt = [
    SYSTEM_PROMPTS.ensiklopedia,
    '',
    'Konteks percakapan sebelumnya:',
    context || '(belum ada percakapan sebelumnya)',
    '',
    'Pertanyaan petani:',
    prompt,
  ].join('\n');

  const result = await model.generateContent(mergedPrompt);
  const text = result?.response?.text?.();

  if (!text) {
    throw new Error('Gemini tidak mengembalikan respons teks.');
  }

  return text.trim();
}

// ─── Generate Financial Report AI Analysis ────────────────────────

export async function generateFinancialAnalysis({ reportData }: { reportData: any }) {
  const client = getClient();
  if (!client) {
    throw new Error('GEMINI_API_KEY belum diisi di env backend.');
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const model = client.getGenerativeModel({ model: modelName });

  const { periode, totalPendapatan, totalPengeluaran, labaBersih, transactions } = reportData;

  // Format kategori pengeluaran dari transaksi
  const pengeluaranPerKategori: Record<string, number> = {};
  const pendapatanPerKategori: Record<string, number> = {};
  
  if (transactions && Array.isArray(transactions)) {
    transactions.forEach((tx: any) => {
      if (tx.jenis === 'pengeluaran') {
        pengeluaranPerKategori[tx.kategori] = (pengeluaranPerKategori[tx.kategori] || 0) + tx.nominal;
      } else {
        pendapatanPerKategori[tx.kategori] = (pendapatanPerKategori[tx.kategori] || 0) + tx.nominal;
      }
    });
  }

  const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  const dataContext = [
    `PERIODE LAPORAN: ${periode}`,
    `TOTAL PENDAPATAN: ${formatRp(totalPendapatan)}`,
    `TOTAL PENGELUARAN: ${formatRp(totalPengeluaran)}`,
    `LABA/RUGI BERSIH: ${formatRp(Math.abs(labaBersih))} (${labaBersih >= 0 ? 'LABA' : 'RUGI'})`,
    '',
    'RINCIAN PENGELUARAN PER KATEGORI:',
    ...Object.entries(pengeluaranPerKategori).map(([k, v]) => `- ${k}: ${formatRp(v)}`),
    '',
    'RINCIAN PENDAPATAN PER KATEGORI:',
    ...Object.entries(pendapatanPerKategori).map(([k, v]) => `- ${k}: ${formatRp(v)}`),
    '',
    `TOTAL TRANSAKSI: ${transactions?.length || 0} transaksi (${transactions?.filter((t: any) => t.jenis === 'pengeluaran').length || 0} pengeluaran, ${transactions?.filter((t: any) => t.jenis === 'pendapatan').length || 0} pendapatan)`,
  ].join('\n');

  const mergedPrompt = [
    SYSTEM_PROMPTS.keuangan,
    '',
    'DATA KEUANGAN YANG PERLU DIANALISIS:',
    dataContext,
    '',
    'Berikan analisis dan rekomendasi berdasarkan data di atas.',
  ].join('\n');

  const result = await model.generateContent(mergedPrompt);
  const text = result?.response?.text?.();

  if (!text) {
    throw new Error('Gemini tidak mengembalikan respons teks.');
  }

  return text.trim();
}
