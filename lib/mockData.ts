// ─── Type Definitions ────────────────────────────────────────────

export interface Transaction {
  id: string;
  jenis: 'pengeluaran' | 'pendapatan';
  kategori: string;
  nominal: number;
  tanggal: string; // ISO date string
  keterangan: string;
}

export interface WeatherData {
  suhu: number;
  kelembapan: number;
  curahHujan: number;
  kecepatanAngin: number;
  kondisi: 'cerah' | 'berawan' | 'hujan' | 'gerimis';
  lokasi: string;
}

export interface WeatherForecast {
  tanggal: string;
  suhuMin: number;
  suhuMax: number;
  kondisi: 'cerah' | 'berawan' | 'hujan' | 'gerimis';
  curahHujan: number;
}

export interface WeatherAlert {
  id: string;
  tanggal: string;
  jenisPeringatan: string;
  pesan: string;
  status: 'terkirim' | 'gagal';
}

export interface CalendarEvent {
  id: string;
  judul: string;
  jenis: 'pemupukan' | 'penyemprotan' | 'irigasi' | 'pemetikan' | 'lainnya';
  tanggal: string;
  waktu?: string;
  catatan?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

// ─── Farmer Profile ───────────────────────────────────────────────

export const farmerProfile = {
  nama: 'Budi Santoso',
  lokasi: 'Desa Wonorejo, Malang',
  komoditas: 'Cabai Rawit',
  luasLahan: '0.5 Ha',
  hariMenujuPanen: 23,
};

// ─── Transactions Mock Data ───────────────────────────────────────

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    jenis: 'pengeluaran',
    kategori: 'Pupuk',
    nominal: 450000,
    tanggal: '2026-04-10',
    keterangan: 'Pupuk NPK Phonska 50kg',
  },
  {
    id: '2',
    jenis: 'pengeluaran',
    kategori: 'Pestisida',
    nominal: 320000,
    tanggal: '2026-04-08',
    keterangan: 'Pestisida Prevathon 250ml',
  },
  {
    id: '3',
    jenis: 'pengeluaran',
    kategori: 'Tenaga Kerja',
    nominal: 750000,
    tanggal: '2026-04-07',
    keterangan: 'Upah panen 3 orang × 2 hari',
  },
  {
    id: '4',
    jenis: 'pengeluaran',
    kategori: 'Irigasi',
    nominal: 180000,
    tanggal: '2026-04-05',
    keterangan: 'Biaya pompa air',
  },
  {
    id: '5',
    jenis: 'pendapatan',
    kategori: 'Penjualan',
    nominal: 3200000,
    tanggal: '2026-04-12',
    keterangan: 'Penjualan cabai rawit 80kg × Rp40.000',
  },
  {
    id: '6',
    jenis: 'pengeluaran',
    kategori: 'Lainnya',
    nominal: 125000,
    tanggal: '2026-04-03',
    keterangan: 'Peralatan tali rafia dan patok',
  },
  {
    id: '7',
    jenis: 'pendapatan',
    kategori: 'Penjualan',
    nominal: 1800000,
    tanggal: '2026-04-01',
    keterangan: 'Penjualan cabai rawit 45kg × Rp40.000',
  },
];

// ─── Chart Data ───────────────────────────────────────────────────

export const trendChartData = [
  { bulan: 'Nov', pengeluaran: 1200000, pendapatan: 2500000 },
  { bulan: 'Des', pengeluaran: 1450000, pendapatan: 3100000 },
  { bulan: 'Jan', pengeluaran: 980000, pendapatan: 2800000 },
  { bulan: 'Feb', pengeluaran: 1600000, pendapatan: 3400000 },
  { bulan: 'Mar', pengeluaran: 1350000, pendapatan: 2900000 },
  { bulan: 'Apr', pengeluaran: 1825000, pendapatan: 5000000 },
];

export const kategoriChartData = [
  { kategori: 'Pupuk', jumlah: 450000 },
  { kategori: 'Pestisida', jumlah: 320000 },
  { kategori: 'Tenaga Kerja', jumlah: 750000 },
  { kategori: 'Irigasi', jumlah: 180000 },
  { kategori: 'Lainnya', jumlah: 125000 },
];

// ─── Weather Mock Data ────────────────────────────────────────────

export const currentWeather: WeatherData = {
  suhu: 24,
  kelembapan: 78,
  curahHujan: 12,
  kecepatanAngin: 8,
  kondisi: 'gerimis',
  lokasi: 'Desa Wonorejo, Malang',
};

export const weatherForecast: WeatherForecast[] = [
  { tanggal: '2026-04-18', suhuMin: 22, suhuMax: 28, kondisi: 'gerimis', curahHujan: 12 },
  { tanggal: '2026-04-19', suhuMin: 21, suhuMax: 27, kondisi: 'hujan', curahHujan: 28 },
  { tanggal: '2026-04-20', suhuMin: 22, suhuMax: 29, kondisi: 'hujan', curahHujan: 18 },
  { tanggal: '2026-04-21', suhuMin: 23, suhuMax: 30, kondisi: 'berawan', curahHujan: 4 },
  { tanggal: '2026-04-22', suhuMin: 24, suhuMax: 31, kondisi: 'cerah', curahHujan: 0 },
  { tanggal: '2026-04-23', suhuMin: 23, suhuMax: 30, kondisi: 'cerah', curahHujan: 0 },
  { tanggal: '2026-04-24', suhuMin: 22, suhuMax: 29, kondisi: 'berawan', curahHujan: 5 },
];

export const weatherAlerts: WeatherAlert[] = [
  {
    id: '1',
    tanggal: '2026-04-17',
    jenisPeringatan: 'Hujan Lebat',
    pesan: '⚠️ Prakiraan hujan lebat di Malang. Tunda pemupukan dan penyemprotan pestisida.',
    status: 'terkirim',
  },
  {
    id: '2',
    tanggal: '2026-04-15',
    jenisPeringatan: 'Angin Kencang',
    pesan: '💨 Kecepatan angin 15 km/jam. Pastikan tiang bambu dan paranet sudah diperkuat.',
    status: 'terkirim',
  },
  {
    id: '3',
    tanggal: '2026-04-13',
    jenisPeringatan: 'Suhu Tinggi',
    pesan: '🌡️ Suhu mencapai 33°C. Intensifkan penyiraman pagi dan sore hari.',
    status: 'gagal',
  },
];

// ─── Calendar Events Mock Data ────────────────────────────────────

export const mockCalendarEvents: CalendarEvent[] = [
  {
    id: '1',
    judul: 'Pemupukan Susulan NPK',
    jenis: 'pemupukan',
    tanggal: '2026-04-18',
    waktu: '07:00',
    catatan: 'Gunakan NPK Phonska dosis 5 gram/tanaman',
  },
  {
    id: '2',
    judul: 'Penyemprotan Fungisida',
    jenis: 'penyemprotan',
    tanggal: '2026-04-20',
    waktu: '06:30',
    catatan: 'Gunakan Dithane M-45, fokus pada bagian bawah daun',
  },
  {
    id: '3',
    judul: 'Irigasi Tetes',
    jenis: 'irigasi',
    tanggal: '2026-04-21',
    waktu: '16:00',
    catatan: 'Cek pompa dan selang sebelum mulai',
  },
  {
    id: '4',
    judul: 'Pemetikan Perdana',
    jenis: 'pemetikan',
    tanggal: '2026-04-25',
    waktu: '07:00',
    catatan: 'Target 80kg cabai rawit merah',
  },
  {
    id: '5',
    judul: 'Pemupukan Akar',
    jenis: 'pemupukan',
    tanggal: '2026-04-28',
    waktu: '08:00',
    catatan: 'KCl + ZA untuk perkuatan buah',
  },
];

// ─── Encyclopedia / Chat Mock Data ───────────────────────────────

export const initialChatMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'ai',
    content:
      'Halo, Pak Budi! 👋 Saya Arina, asisten AI khusus budidaya cabai. Silakan tanyakan apa saja — mulai dari pengendalian hama, penyakit, pemupukan, hingga teknik panen. Saya siap membantu!',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    role: 'user',
    content: 'Cabai saya banyak yang busuk di bagian ujung buah, itu penyakit apa?',
    timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    role: 'ai',
    content:
      'Gejala busuk di ujung buah (ujung buah berwarna coklat kehitaman dan mengering) kemungkinan besar adalah **Blossom End Rot (BER)** atau kekurangan kalsium (Ca). Ini bukan penyakit infeksi, melainkan gangguan fisiologis.\n\n**Penyebab:** Penyerapan kalsium terganggu akibat penyiraman tidak teratur, kadar nitrogen terlalu tinggi, atau pH tanah terlalu rendah.\n\n**Solusi:**\n1. Semprot daun dengan kalsium boron (Ca-B) dosis 2 ml/liter\n2. Atur jadwal penyiraman agar konsisten\n3. Tambahkan kapur dolomit jika pH < 6.0\n\nApakah busuknya mulai dari dalam atau dari permukaan buah, Pak?',
    timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  },
];

export const diseaseCards = [
  {
    id: '1',
    nama: 'Antraknosa (Patek)',
    penyebab: 'Jamur Colletotrichum capsici',
    kehilangan: '20–40%',
    gejala: 'Bercak coklat pada buah, membusuk dari ujung atau tengah',
    penanganan: 'Fungisida Mankozeb, buang buah terinfeksi',
    tingkatSeveritas: 'tinggi' as const,
  },
  {
    id: '2',
    nama: 'Virus Gemini (Kuning)',
    penyebab: 'Begomovirus via kutu kebul',
    kehilangan: '30–50%',
    gejala: 'Daun menguning, mengkerut, pertumbuhan kerdil',
    penanganan: 'Kendalikan kutu kebul, cabut tanaman terinfeksi berat',
    tingkatSeveritas: 'tinggi' as const,
  },
  {
    id: '3',
    nama: 'Ulat Grayak',
    penyebab: 'Spodoptera litura/frugiperda',
    kehilangan: '15–25%',
    gejala: 'Daun berlubang, ulat coklat bergaris aktif malam hari',
    penanganan: 'Insektisida Emamektin, perangkap lampu UV',
    tingkatSeveritas: 'sedang' as const,
  },
  {
    id: '4',
    nama: 'Kutu Kebul',
    penyebab: 'Bemisia tabaci',
    kehilangan: '10–20%',
    gejala: 'Tanda jelaga pada daun, vektor virus kuning',
    penanganan: 'Insektisida Imidakloprid, mulsa plastik perak',
    tingkatSeveritas: 'sedang' as const,
  },
];
