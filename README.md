<div align="center">
  <img src="public/logo arina.svg" width="100" height="100" alt="Arina Agri Logo"/>

  <h1 align="center">Arina Agri</h1>

  <p align="center">
    <strong>Asisten digital untuk petani dan pelaku agribisnis UMKM</strong><br>
    <em>Bantu aktivitas tani harian jadi lebih rapi lewat panduan AI, info cuaca real-time, dan pencatatan keuangan yang praktis.</em>
  </p>

  <p align="center">
    <a href="#fitur-utama">Fitur Utama</a> |
    <a href="#teknologi-yang-digunakan">Teknologi</a> |
    <a href="#panduan-instalasi">Mulai Jalankan</a>
  </p>

  <div align="center">
    <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/Material_UI-007FFF?style=for-the-badge&logo=mui&logoColor=white" alt="MUI" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  </div>
</div>

<br>
<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%" />

## Sekilas Tentang Arina Agri

**Arina Agri** adalah aplikasi dashboard buat petani dan pelaku agribisnis UMKM.
Tujuannya sederhana: bantu ngatur aktivitas harian biar lebih terarah, dari catatan keuangan sampai pengingat cuaca dan jadwal kerja di lahan.

Pengalaman bertani di lapangan dipadukan dengan bantuan AI supaya pengambilan keputusan jadi lebih cepat dan tidak ribet.

## Fitur Utama

- **Pencatatan Keuangan Digital**
  Catat pemasukan dan pengeluaran harian dengan cepat. Ada ringkasan visual lewat pie chart dan bisa ekspor laporan ke file `.csv`.

- **Ensiklopedia Edukasi AI**
  Lagi bingung soal hama, penyakit tanaman, atau strategi budidaya? Tinggal tanya, AI bantu kasih arahan awal yang relevan.

- **Cuaca dan Kalender Tani**
  Cek prakiraan cuaca dan atur agenda tani (panen, pemupukan, dll.) dalam satu tempat.
  Integrasi BMKG Open Data mendukung prakiraan 3 hari, peringatan dini cuaca, notifikasi risiko, dan tombol GPS untuk menetapkan lokasi pengguna saat prototipe.

- **Bilingual Indonesia dan English**
  Bahasa antarmuka bisa diganti lewat pengaturan sesuai kebutuhan pengguna.

- **Responsif di Mobile dan Desktop**
  Tampilan tetap nyaman dipakai di berbagai ukuran layar, termasuk mode terang dan gelap.

<br>
<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%" />

## Teknologi Yang Digunakan

Project ini dibangun dengan stack modern yang fokus ke performa dan kemudahan pengembangan.

| Bagian | Technologies | Deskripsi Singkat |
| :--- | :--- | :--- |
| **Kerangka Inti** | ![Next.js](https://img.shields.io/badge/Next.js-white?logo=next.js&logoColor=black&style=flat-square) ![React](https://img.shields.io/badge/React-%2320232a.svg?logo=react&logoColor=%2361DAFB&style=flat-square) | Fondasi utama aplikasi berbasis App Router. |
| **UI dan Komponen** | ![MUI](https://img.shields.io/badge/MUI-%230081CB.svg?logo=mui&logoColor=white&style=flat-square) ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-%2338B2AC.svg?logo=tailwind-css&logoColor=white&style=flat-square) | Untuk tampilan antarmuka yang konsisten dan responsif. |
| **Validasi Data** | ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white&style=flat-square) `Zod` `React Hook Form` | Menjaga input dan tipe data tetap aman. |
| **Pendukung** | `next-intl` `@mui/x-charts` | Multibahasa dan visualisasi data. |

<br>

## Panduan Instalasi

Kalau mau coba jalanin project ini secara lokal, ikuti langkah berikut:

1. **Clone repository**
   ```bash
   git clone https://github.com/Radit024/arina-agri.git
   cd arina-agri
   ```

2. **Install dependencies**
   ```bash
   npm install
   # Kalau pakai Yarn/Pnpm, silakan sesuaikan
   ```

3. **Install dependencies backend**
  ```bash
  cd backend
  npm install
  cd ..
  ```

4. **Jalankan development (frontend + backend)**
   ```bash
   npm run dev
   ```

5. **Buka aplikasi di browser**
   Akses <kbd>http://localhost:3000</kbd>

Tambahan perintah monorepo:

```bash
# Build frontend saja
npm run build:web

# Build backend saja
npm run build:api

# Build keduanya
npm run build:all
```

<br>
<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/grass.png" width="100%" />

<p align="center"><em>Copyright (c) 2026 Arina Agri</em></p>
