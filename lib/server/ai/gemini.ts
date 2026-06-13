import { GoogleGenerativeAI } from '@google/generative-ai';
import type { BmkgWeatherWarning } from '@/lib/server/weather/bmkgTypes';

function getClient() {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}

export const SYSTEM_PROMPTS = {
  ensiklopedia: [
    'Anda adalah Arina AI, asisten pertanian cerdas yang ahli dalam budidaya tanaman cabai di Indonesia.',
    'Tugas utama Anda: membantu petani cabai mengenali penyakit tanaman, hama, teknik budidaya, jadwal pemupukan, dan manajemen lahan.',
    '',
    'Panduan respons:',
    '- Gunakan Bahasa Indonesia yang mudah dipahami oleh petani dengan latar belakang pendidikan beragam.',
    '- Jawaban harus padat dan jelas: maksimal 5 poin atau 6 kalimat pendek.',
    '- Utamakan inti solusi terlebih dulu, hindari pembuka panjang dan pengulangan.',
    '- Berikan jawaban yang praktis, dapat langsung diterapkan di lapangan.',
    '- Jika mendiagnosis penyakit/hama: sebutkan (1) nama penyakit, (2) penyebab, (3) gejala khas, (4) penanganan darurat, (5) pencegahan jangka panjang.',
    '- Jika membahas pupuk/nutrisi: berikan dosis konkret dalam gram/liter atau kg/hektar.',
    '- Jika pertanyaan kurang jelas, tanyakan: lokasi kebun (dataran tinggi/rendah), varietas cabai, umur tanaman, dan gejala yang terlihat.',
    '- Selalu prioritaskan solusi yang terjangkau dan mudah didapat di toko pertanian lokal.',
    '- Gunakan Markdown standar agar jawaban rapi: `### Judul`, `- poin`, `1. langkah`, `**tebal**`, `> catatan`, dan `kode` untuk dosis atau istilah teknis.',
    '- Jangan gunakan bullet manual; gunakan bullet Markdown `-` atau nomor `1.`.',
    '- Jika menyajikan dosis, jadwal, atau perbandingan, gunakan tabel Markdown ringkas dengan maksimal 4 baris.',
    '- Jika menghitung kebutuhan pupuk, larutan, biaya, atau konversi satuan, tampilkan rumus singkat dalam LaTeX memakai `$...$` atau `$$...$$`, lalu jelaskan hasil akhirnya dengan bahasa sederhana.',
    '- Jangan memberikan informasi di luar topik pertanian dan budidaya tanaman.',
    '- Jangan menambahkan info pasar/harga jika pengguna tidak memintanya.',
    '- Akhiri singkat dengan 1 kalimat ajakan klarifikasi jika diperlukan.',
  ].join('\n'),
  keuangan: [
    'Anda adalah Arina Finance AI, konsultan keuangan pertanian untuk petani dan pelaku agribisnis UMKM di Indonesia.',
    'Tugas Anda: menganalisis data keuangan usaha pertanian yang diberikan dan memberikan saran keuangan yang actionable.',
    '',
    'PENTING:',
    '- Awali laporan dengan sapaan personal: "Halo, [Nama Petani]!" (Gunakan nama pemilik akun yang diberikan).',
    '- Gunakan **teks tebal (bold)** dengan format **teks** untuk menekankan angka penting, temuan kritis, dan judul rekomendasi.',
    '- Berikan analisis yang tajam dan berfokus pada efisiensi biaya dan maksimalisasi keuntungan.',
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
    '• Rekomendasi 1: **[Judul]** — [penjelasan spesifik]',
    '• Rekomendasi 2: **[Judul]** — [penjelasan spesifik]',
    '• Rekomendasi 3: **[Judul]** — [penjelasan spesifik]',
    '',
    '⚠️ HAL YANG PERLU DIWASPADAI',
    '(Identifikasi 1-2 risiko atau pola pengeluaran yang perlu dievaluasi)',
    '',
    'Panduan tambahan:',
    '- Gunakan angka nyata dari data yang diberikan dalam saran Anda.',
    '- Gunakan **bold** pada setiap nominal uang yang Anda sebutkan.',
    '- Perbandingan dengan standar industri pertanian cabai Indonesia jika relevan.',
    '- Bahasa harus ramah, tidak menghakimi, dan memotivasi petani.',
    '- Jangan buat laporan fiktif — hanya analisis data yang diberikan.',
  ].join('\n'),
  notificationDecision: [
    'Anda adalah Arina Decision AI untuk notifikasi cuaca petani di Indonesia.',
    'Anda bekerja bersama rule engine. Rule engine sudah menentukan level risiko, alasan, dan aksi utama.',
    '',
    'Tugas Anda:',
    '- Ubah draft pesan menjadi lebih jelas, ringkas, dan mudah dipahami petani.',
    '- Pertahankan keputusan rule engine (jangan ubah level risiko, jangan menambah klaim cuaca baru).',
    '- Gunakan Bahasa Indonesia sederhana, praktis, dan tidak menakut-nakuti.',
    '- Maksimal 120 kata.',
    '- Sertakan 2-3 aksi yang bisa dilakukan hari ini.',
    '- Gunakan format teks polos, tanpa markdown tabel.',
    '',
    'Larangan:',
    '- Jangan memberikan diagnosis medis manusia/hewan.',
    '- Jangan menyarankan tindakan berbahaya.',
    '- Jangan membuat data cuaca fiktif di luar input.',
  ].join('\n'),
};

export interface GeminiWeatherContext {
  forecastSummary?: string;
  warningSummary?: string;
}

export async function generateGeminiReply({
  prompt,
  context,
  userName,
  weatherContext,
}: {
  prompt: string;
  context?: string;
  userName?: string;
  weatherContext?: GeminiWeatherContext;
}) {
  const client = getClient();
  if (!client) {
    throw new Error('Gemini API key belum diisi. Set salah satu: GEMINI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, atau GOOGLE_API_KEY.');
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const model = client.getGenerativeModel({ model: modelName });

  const farmerName = userName ? userName : 'Petani';

  const mergedPrompt = [
    SYSTEM_PROMPTS.ensiklopedia,
    `\nPENTING: Nama pengguna (petani) yang sedang bertanya adalah: ${farmerName}. Sapa pengguna dengan namanya sesekali agar lebih personal.`,
    '',
    'Konteks cuaca BMKG terbaru:',
    `- Prakiraan: ${weatherContext?.forecastSummary || 'tidak tersedia'}`,
    `- Peringatan dini: ${weatherContext?.warningSummary || 'tidak ada peringatan aktif'}`,
    '',
    'Konteks percakapan sebelumnya:',
    context || '(belum ada percakapan sebelumnya)',
    '',
    `Pertanyaan ${farmerName}:`,
    prompt,
  ].join('\n');

  const result = await model.generateContent(mergedPrompt);
  const text = result?.response?.text?.();

  if (!text) {
    throw new Error('Gemini tidak mengembalikan respons teks.');
  }

  return text.trim();
}

interface FinancialReportTransaction {
  jenis: 'pengeluaran' | 'pendapatan';
  kategori: string;
  nominal: number;
  tanggal: string;
  keterangan?: string;
}

interface FinancialReportData {
  periode: string;
  totalPendapatan: number;
  totalPengeluaran: number;
  labaBersih: number;
  transactions?: FinancialReportTransaction[];
  userName?: string;
}

export async function generateFinancialAnalysis({ reportData }: { reportData: FinancialReportData }) {
  const client = getClient();
  if (!client) {
    throw new Error('Gemini API key belum diisi. Set salah satu: GEMINI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, atau GOOGLE_API_KEY.');
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const model = client.getGenerativeModel({ model: modelName });

  const { periode, totalPendapatan, totalPengeluaran, labaBersih, transactions, userName } = reportData;

  const pengeluaranPerKategori: Record<string, number> = {};
  const pendapatanPerKategori: Record<string, number> = {};

  if (transactions && Array.isArray(transactions)) {
    transactions.forEach((tx) => {
      if (tx.jenis === 'pengeluaran') {
        pengeluaranPerKategori[tx.kategori] = (pengeluaranPerKategori[tx.kategori] || 0) + tx.nominal;
      } else {
        pendapatanPerKategori[tx.kategori] = (pendapatanPerKategori[tx.kategori] || 0) + tx.nominal;
      }
    });
  }

  const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  const farmerName = userName ? userName : 'Petani';

  const dataContext = [
    `NAMA PETANI / PEMILIK AKUN: ${farmerName}`,
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
    `TOTAL TRANSAKSI: ${transactions?.length || 0} transaksi (${transactions?.filter((t) => t.jenis === 'pengeluaran').length || 0} pengeluaran, ${transactions?.filter((t) => t.jenis === 'pendapatan').length || 0} pendapatan)`,
  ].join('\n');

  const mergedPrompt = [
    SYSTEM_PROMPTS.keuangan,
    `\nPENTING: Analisis laporan ini adalah untuk akun milik "${farmerName}". Berikan saran keuangan yang ditujukan langsung kepadanya dengan menyapanya secara profesional namun ramah.`,
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

export async function generateNotificationDecisionMessage({
  farmerName,
  location,
  riskLevel,
  riskScore,
  triggeredRules,
  recommendedActions,
  weatherSummary,
  draftMessage,
  dailyEvents,
  bmkgWarnings,
}: {
  farmerName: string;
  location?: string;
  riskLevel: 'rendah' | 'sedang' | 'tinggi' | 'ekstrem';
  riskScore: number;
  triggeredRules: string[];
  recommendedActions: string[];
  weatherSummary: string;
  draftMessage: string;
  dailyEvents?: Array<{ title: string; time?: string; category?: string; note?: string }>;
  bmkgWarnings?: BmkgWeatherWarning[];
}) {
  const client = getClient();
  if (!client) {
    return draftMessage;
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const model = client.getGenerativeModel({ model: modelName });
  const agendaSummary = dailyEvents?.length
    ? dailyEvents
      .map((event) => `${event.time ? `${event.time} ` : ''}${event.title}${event.category ? ` (${event.category})` : ''}${event.note ? ` - ${event.note}` : ''}`)
      .join(' | ')
    : 'Tidak ada agenda terjadwal.';
  const warningSummary = bmkgWarnings?.length
    ? bmkgWarnings
      .map((warning) => `${warning.headline || warning.event}: ${warning.description || 'tanpa deskripsi'}${warning.affectedAreas?.length ? ` Area: ${warning.affectedAreas.join(', ')}` : ''}`)
      .join(' | ')
    : 'Tidak ada peringatan BMKG aktif.';

  const mergedPrompt = [
    SYSTEM_PROMPTS.notificationDecision,
    '',
    'DATA KEPUTUSAN RULE ENGINE (WAJIB DIIKUTI):',
    `- Nama petani: ${farmerName}`,
    `- Lokasi: ${location || 'tidak diketahui'}`,
    `- Risk level: ${riskLevel}`,
    `- Risk score: ${riskScore}`,
    `- Triggered rules: ${triggeredRules.join(', ') || 'tidak ada'}`,
    `- Recommended actions: ${recommendedActions.join(' | ') || 'tidak ada'}`,
    `- Ringkasan cuaca: ${weatherSummary}`,
    `- Agenda hari ini: ${agendaSummary}`,
    `- Peringatan BMKG: ${warningSummary}`,
    '',
    'ARAHAN SARAN KEGIATAN:',
    '- Sesuaikan 2-3 aksi dengan cuaca, agenda hari ini, dan peringatan BMKG.',
    '- Jika ada hujan/angin/peringatan, sarankan menunda penyemprotan atau kerja lapang berisiko.',
    '- Jika tidak ada risiko berarti, sarankan kegiatan aman seperti monitoring, penyiraman ringan, atau cek kebun.',
    '',
    'DRAFT PESAN SAAT INI:',
    draftMessage,
    '',
    'Keluarkan versi final pesan notifikasi saja.',
  ].join('\n');

  const result = await model.generateContent(mergedPrompt);
  const text = result?.response?.text?.();

  if (!text) {
    return draftMessage;
  }

  return text.trim();
}
