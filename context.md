Build a full Next.js 16 web application called "Arina Agri" — an AI-powered smart assistant platform for Indonesian farmers and agribusiness (UMKM). Use shadcn/ui as the primary component library, Tailwind CSS for styling, and TypeScript throughout.

---

## TECH STACK

- Framework: Next.js 16 (App Router)
- Backend: Express.js Latest Version (monolith server)
- Database: MongoDB
- Authentication: Firebase Authentication
- AI LLM: Gemini 3.0
- UI Library: Material UI (MUI) v6 — @mui/material, @mui/icons-material
- Styling: Tailwind CSS + MUI sx prop (hybrid approach)
- Language: TypeScript
- Icons: @mui/icons-material (Material Icons)
- Charts: @mui/x-charts (MUI X Charts)
- Forms: react-hook-form + zod (validation)
- Font: Google Fonts — "Plus Jakarta Sans" for body, "Sora" for headings

---

## BRAND & DESIGN SYSTEM

Color Palette (CSS Variables):

- Primary: #16a34a (Arina Green)
- Primary Dark: #15803d
- Primary Light: #dcfce7
- Surface: #f8fafc
- Card: #ffffff
- Text Primary: #0f172a
- Text Muted: #64748b
- Border: #e2e8f0
- Accent: #f59e0b (amber for warnings/alerts)

Design direction: Clean, trustworthy, nature-inspired. Not sterile — warm and approachable. Think "professional agrarian tech." Use subtle green gradients, leaf-inspired decorative elements (SVG), and gentle card shadows.

---

## APP STRUCTURE (Pages & Routes)

### 1. Dashboard `/dashboard`

Main layout with sidebar navigation. Sidebar items:

- Dashboard (home icon)
- Pencatatan Keuangan
- Notifikasi Cuaca
- Ensiklopedia AI
- Smart Calendar
- Manajemen Stok Panen
- Pengaturan

Dashboard home shows:

- Welcome card: "Selamat datang, Pak Budi 👋"
- KPI Cards (using shadcn Card):
  - Total Pengeluaran Bulan Ini
  - Estimasi Laba Bersih
  - Hari Menuju Panen
  - Status Cuaca Hari Ini
- Line chart (Recharts): Tren Pengeluaran vs Pendapatan (6 bulan)
- Bar chart: Kategori Pengeluaran (Pupuk, Pestisida, Tenaga Kerja, Irigasi, Lainnya)
- Recent activity table (shadcn Table)
- Weather alert banner (if exists) using shadcn Alert with amber/destructive variant

### 2. Pencatatan Keuangan `/dashboard/keuangan`

- Form input transaksi (shadcn Form + react-hook-form):
  - Jenis: Pengeluaran / Pendapatan (shadcn Select)
  - Kategori: Pupuk, Pestisida, Tenaga Kerja, Irigasi, Penjualan, Lainnya
  - Nominal (Rupiah, formatted with thousand separator)
  - Tanggal (shadcn DatePicker)
  - Keterangan (textarea)
  - Submit button
- Table of recent transactions with delete option
- Summary card: Laporan Laba Rugi (auto-calculated)
  - Total Pemasukan
  - Total Pengeluaran  
  - Laba Bersih
  - Rasio B/C (Benefit-Cost Ratio)
- "Analisis AI" button that opens a shadcn Dialog/Sheet showing a mock LLM-style analysis paragraph in Indonesian language

### 3. Notifikasi Cuaca `/dashboard/cuaca`

- Current weather card (mock data for Malang, Jawa Timur):
  - Suhu, Kelembapan, Curah Hujan, Kecepatan Angin
  - Kondisi: icons (sun, cloud, rain)
- 7-day forecast row (horizontal scroll on mobile)
- Alert History table: list of past WhatsApp/Telegram notifications sent
  - Columns: Tanggal, Jenis Peringatan, Pesan, Status (Terkirim/Gagal)
  - Use shadcn Badge for status
- WhatsApp Integration Card:
  - Input nomor HP
  - Toggle aktifkan notifikasi
  - shadcn Switch component
  - Note: "Notifikasi dikirim otomatis via WhatsApp menggunakan n8n workflow"

### 4. Ensiklopedia AI Cabai `/dashboard/ensiklopedia`

- Split layout: left = chat interface, right = quick reference cards
- Chat interface (shadcn ScrollArea):
  - Message bubbles (user = right, AI = left with green accent)
  - Input bar at bottom with Send button
  - Placeholder messages showing example Q&A about cabai diseases
  - Example diseases shown: Antraknosa (Patek), Virus Gemini, Ulat Grayak, Kutu Kebul
- Quick Reference Cards (right panel):
  - 4 cards for common diseases
  - Each card: disease name, cause, loss % (e.g., "Losses: 20-30%"), quick treatment tag
  - Use shadcn Card with colored left border (red for severe, yellow for moderate)
- Note banner: "AI ini dilatih khusus untuk komoditas cabai. Untuk tanaman lain, akurasi bisa berbeda."

### 5. Smart Calendar `/dashboard/kalender`

- Monthly calendar view (build a simple custom calendar grid with Tailwind)
- Events/tasks shown on calendar dates as small colored dots/badges
- Right sidebar:
  - "Tambah Jadwal" button → opens shadcn Dialog with form:
    - Judul Kegiatan (input)
    - Jenis: Pemupukan / Penyemprotan / Irigasi / Pemetikan / Lainnya (shadcn Select)
    - Tanggal & Waktu
    - Catatan (textarea)
  - Upcoming tasks list (next 7 days) using shadcn Card
- Color coding:
  - Green: Pemupukan
  - Blue: Irigasi
  - Red: Penyemprotan Pestisida
  - Amber: Pemetikan/Panen
- Empty state with illustration placeholder and CTA if no events

### 6. Manajemen Stok Hasil Panen Cabai `/dashboard/stok`

- Summary cards:
  - Total Stok Siap Jual (kg)
  - Stok Terjual Minggu Ini (kg)
  - Estimasi Nilai Stok (Rupiah)
  - Batch Mendekati Kadaluarsa
- Form input batch panen (shadcn Form + react-hook-form):
  - Tanggal Panen
  - Grade Cabai: A / B / C
  - Berat Masuk (kg)
  - Harga Modal per kg (Rupiah)
  - Estimasi Harga Jual per kg (Rupiah)
  - Lokasi Penyimpanan (Gudang Utama / Gudang Cadangan)
  - Estimasi Kadaluarsa (tanggal)
  - Catatan
  - Submit button
- Tabel stok per batch:
  - Columns: ID Batch, Tanggal Panen, Grade, Berat Awal, Stok Tersisa, Harga Jual, Status
  - Status badge: Aman / Menipis / Hampir Kadaluarsa / Habis
  - Row actions: Detail, Edit, Hapus
- Form catat keluar stok (stok out):
  - Pilih batch
  - Berat keluar (kg)
  - Tujuan (Pasar Lokal / Distributor / Restoran / Lainnya)
  - Tanggal transaksi
  - Catatan
- Riwayat mutasi stok (in/out) dengan filter tanggal dan grade
- Alert card untuk rekomendasi restock atau percepat penjualan saat ada batch hampir kadaluarsa

---

## COMPONENTS TO BUILD

Use shadcn/ui for all of these:

- Button (variants: default, outline, ghost, destructive)
- Card, CardHeader, CardContent, CardFooter
- Input, Textarea, Label
- Select, SelectTrigger, SelectContent, SelectItem
- Dialog, DialogContent, DialogHeader, DialogTitle
- Sheet (for mobile sidebar)
- Table, TableHeader, TableBody, TableRow, TableCell
- Badge (variants: default, secondary, destructive, outline)
- Alert, AlertTitle, AlertDescription
- Switch
- Tabs, TabsList, TabsTrigger, TabsContent
- ScrollArea
- Separator
- Avatar (for user profile in sidebar)
- Skeleton (for loading states)
- Tooltip
- DataGrid/Table untuk stok batch dan mutasi

---

# Rules

Saat membantu develop project ini, ikuti aturan berikut:
Bahasa & Teks

Semua label, placeholder, teks UI, pesan error → Bahasa Indonesia
Semua kode, variable, fungsi, komentar → Bahasa Inggris
Format uang: gunakan formatRupiah() dari lib/formatters.ts
Format tanggal: gunakan formatDateLong() atau formatDateShort()

MUI Usage

SELALU gunakan MUI components — jangan gunakan shadcn, Radix, atau HTML native untuk UI
SELALU terapkan theme via sx prop atau styled() — jangan hardcode warna inline
Gunakan theme.palette.primary.main bukan '#3A6B1A' di dalam komponen
Icons: import dari @mui/icons-material bukan dari lucide-react atau heroicons
Charts: gunakan @mui/x-charts bukan recharts atau chart.js

Styling

Tailwind hanya untuk layout utility (flex, grid, gap, padding, margin)
MUI sx prop untuk warna, border, shadow, dan component-specific styling
Jangan mixing: jangan gunakan Tailwind untuk mengubah warna MUI components

TypeScript

Semua file harus TypeScript (.tsx / .ts)
Definisikan interface/type untuk semua props dan data
Gunakan zod schema untuk semua form validation
Hindari penggunaan any

State Management

Gunakan React useState dan useReducer untuk local state
Gunakan localStorage untuk cache/UI state, dan simpan data utama ke backend Express + MongoDB
Buat custom hooks di folder hooks/ untuk logic yang reusable

Komponen

Setiap halaman harus dipecah menjadi komponen-komponen kecil di components/
Komponen shared (dipakai di lebih dari 1 halaman) masuk ke components/shared/
Semua komponen harus responsive: gunakan MUI Grid + breakpoints xs/sm/md

Performance

Gunakan 'use client' hanya pada komponen yang membutuhkan interaktivitas
Gunakan dynamic() import untuk komponen berat (chart, calendar)
Semua halaman harus bisa di-render sebagai static export (output: 'export')

## MOCK DATA

Use realistic Indonesian agri data:

- Farmer name: "Budi Santoso", lokasi: "Desa Wonorejo, Malang"
- Komoditas: Cabai Rawit
- Luas lahan: 0.5 Ha
- Transactions: mix of pengeluaran (pupuk Rp450.000, pestisida Rp320.000, tenaga kerja Rp750.000) and pendapatan (penjualan cabai Rp3.200.000)
- Weather: Malang, suhu 24°C, kelembapan 78%, prakiraan hujan ringan 2 hari ke depan
- Calendar events: jadwal pemupukan, penyemprotan, irigasi minggu ini
- Stok panen: 4 batch cabai rawit aktif (grade A/B/C) dengan total stok 1.250 kg
- Mutasi stok: data masuk panen pagi dan pengeluaran ke pasar lokal/distributor selama 14 hari terakhir

---

## MOBILE RESPONSIVENESS

- Sidebar collapses to bottom tab bar on mobile (sm breakpoint)
- All cards stack vertically on mobile
- Calendar switches to week view on mobile
- Chat interface takes full screen on mobile
- Tabel stok mendukung horizontal scroll pada mobile dan filter dipindahkan ke drawer/sheet

---

## ADDITIONAL NOTES

- All text/labels in Bahasa Indonesia
- Currency format: "Rp 1.250.000" (Indonesian Rupiah)
- Date format: "12 April 2026" (Indonesian locale)
- Add subtle Arina green gradient on sidebar header
- Logo: text-based "ARINA" in bold with "Agri" subscript in muted color, with a leaf icon (Lucide `Leaf` icon)
- Favicon: use Leaf icon

Generate all pages, components, and mock data. Make sure the app runs without errors on first build.
