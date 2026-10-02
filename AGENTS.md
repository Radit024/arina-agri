<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:architecture-rules -->
# Strict UI and Controller Separation
Semua fitur dan halaman dalam project ini HARUS dipisahkan secara tegas antara UI (View) dan Controller (Logika). 
Aturan:
1. Komponen UI (`_components/XxxView.tsx`) HANYA bertanggung jawab untuk rendering dan styling (menerima props, menampilkan data).
2. Controller (`controllers/<fitur>/useXxxController.ts` atau `controllers/<fitur>/XxxController.tsx`) bertanggung jawab menangani semua logika bisnis, state management, dan pemanggilan API.
3. Halaman utama (`page.tsx`) bertugas menghubungkan Controller dengan komponen UI View.
<!-- END:architecture-rules -->

<!-- BEGIN:folder-structure -->
# Struktur Folder

Peta ini sudah final. Jangan membuat folder di luar daftar ini.

```text
app/          App Router. Private folder yang diizinkan HANYA _components.
components/   View presentational-only (ui/, shared/, dashboard/, news/, auth/)
controllers/  Semua logika per fitur. Dipakai lewat @/controllers/<fitur>/...
hooks/        Hook data client. Calls @/lib/api, tidak pernah supabase langsung.
lib/
  api/        Akses data per domain. Impor lewat barrel @/lib/api.
  server/     Server-only: AI, BMKG, cron, news, notifikasi, supabase admin.
  validators/ Skema zod untuk form. Dipakai View dan Controller.
  finance/    Kalkulasi RAB, cashflow, Excel, PDF.
messages/     Terjemahan id/en untuk next-intl.
supabase/migrations/  Sumber SQL schema yang SATU-SATUNYA.
tests/        Folder mencerminkan lokasi source (lihat bagian Testing).
docs/         specs/ plans/ reports/ deployment/ diagrams/
```

Aturan private folder: Next.js hanya mengenali `_components` sebagai private. Folder seperti `app/**/_lib`, `_hooks`, `_utils` TIDAK dilindungi dari routing dan tidak pernah dipakai di project ini. Skema validasi dan domain logic selalu di `lib/`.
<!-- END:folder-structure -->

<!-- BEGIN:view-rules -->
# Aturan View (`_components/*View.tsx`, `components/**`)

View HANYA merender. Larangan keras di dalam View:

- `fetch(...)` atau panggilan `xxxApi.*` — ambil data dari props
- `useState` untuk data domain (state UI sementara seperti sheet/tab terbuka boleh)
- `useEffect` yang melakukan side effect ke server (menyimpan, menghapus, mengirim)
- Menghitung nilai turunan yang butuh konteks bisnis — terima sudah jadi dari props

Batas pemecahan: kalau satu View punya lebih dari satu alasan untuk berubah, itu harus dipecah. Pecah pada batas yang sudah ada di domain — tab, section, atau mode — bukan pada angka baris.

Pola yang benar untuk View bertab: View menjadi shell (header + tab bar + slot), tiap tab menjadi View sibling di folder yang sama. Lihat `app/dashboard/keuangan/_components/` yang sudah memisahkan `FinanceCashFlowView`, `FinanceComparisonView`, `RabPlanningView`, `TransactionConfirmView`.

Men suspiciously banyak props (mis. > 25) adalah sinyal logika masih di sisi yang salah — naikkan ke controller, jangan diteruskan lewat props.
<!-- END:view-rules -->

<!-- BEGIN:controller-rules -->
# Aturan Controller (`controllers/<fitur>/`)

WAJIB memakai pola stub. Dua file per fitur:

```text
controllers/<fitur>/<Fitur>Controller.tsx   stub tipis, tanpa logika
controllers/<fitur>/use<Fitur>Controller.ts semua hook, state, handler, API
```

Stub tidak boleh melebihi 15 baris dan bentuknya selalu sama:

```tsx
'use client';

import XxxView from '@/app/dashboard/xxx/_components/XxxView';
import { useXxxController } from './useXxxController';

export default function XxxController() {
  const controller = useXxxController();

  return <XxxView {...controller} />;
}
```

Semua `*Controller.tsx` sekarang 7 baris. Jangan menebalkan stub — itu regresi yang sudah pernah terjadi tiga kali (`stok`, `kalender`, `kabar-pasar`).

Arah import: Controller boleh meng-import View. View tidak boleh meng-import controller, kecuali tipe saja (`import type`). Hook logika boleh berada di `controllers/<fitur>/useXxx*.ts` sebagai helper kecil (mis. `useRabController`, `useScenarioOutput`) — pemecahan per concern lebih baik daripada satu file 700 baris.
<!-- END:controller-rules -->

<!-- BEGIN:data-access -->
# Akses Data

- Klien tidak pernah memanggil `supabase.from(...)` langsung. Selalu lewat `@/lib/api` yang diekspor per domain: `stokApi`, `rabApi`, `transactionApi`, `eventApi`, `weatherApi`, dan seterusnya.
- Import memakai barrel: `import { stokApi } from '@/lib/api'`. Jangan pernah `import ... from '@/lib/api/stok'` di luar folder `lib/api`.
- Semua yang menyentuh kredensial, Supabase service role, atau API pihak ketiga masuk `lib/server/`.
- Tambah API baru → buat domain file baru di `lib/api/`, lalu daftarkan di `lib/api/index.ts`.
- Path `typedRoutes` aktif. `router.push('/dashboard/keuangan')` diawasi TypeScript. Jangan pakai `as Route` untuk memaksa lolos kecuali memang memang dinamis.
<!-- END:data-access -->

<!-- BEGIN:design-system -->
# Design System (`components/ui/`)

Sebuah komponen di `components/ui/` itu primitive yang sah HANYA bila:

1. Dipakai di **minimal 2 tempat**, dan
2. **Mengunci** token atau perilaku (mis. tinggi sentuh 44px, status palette, auto-disable saat loading), bukan sekadar meneruskan props ke MUI.

Kalau hanya 1 pemakai → itu helper lokal. Pindahkan ke folder fitur atau hapus; jangan simpan sebagai design system.
Kalau mengunci hal yang sama dengan komponen lain → gabungkan. Contoh nyata yang sudah diselesaikan: `Badge` dan `StatusBadge` sama-sama badge status, jadi semuanya diarahkan ke `StatusBadge` yang lebih lengkap (intent, mode, touch target 44px) dan `Badge` dihapus.
Wrapper yang hanya meneruskan props tanpa mengunci apa pun → jangan dibuat. Pakai MUI langsung + theme.

Token default jangan di-hardcode di `sx` wrapper. Pindahkan ke `MuiXxx.styleOverrides` di `lib/theme.ts` supaya theme jadi satu-satunya sumber.
<!-- END:design-system -->

<!-- BEGIN:testing-rules -->
# Aturan Testing

Lokasi test mengikuti lokasi source:

```text
tests/api/         app/api/**
tests/app/         app/**/page.tsx, app/layout.tsx, app/globals.css
tests/components/  components/** dan app/**/_components/**
tests/controllers/ controllers/**
tests/hooks/       hooks/**
tests/context/     context/**
tests/lib/         lib/** (subfolder: analytics, api, finance, stok, ui)
tests/server/      lib/server/**
tests/middleware/  proxy.ts
tests/scripts/     scripts/** dan konfigurasi CI
```

- Fixture selalu lewat alias: `import('@/tests/fixtures/bmkgForecast.json')`. Jangan pakai path relatif `../fixtures/...` — path itu pecah setiap kali folder test dipindah.
- Satu subjek = satu file test. Kalau dua file menguji hal sama, gabungkan dan pastikan kasus uniknya ikut ter-cover.
- Memecah View besar berarti memecah test-nya di saat yang sama. Jangan menunda.
- Test yang gagal saat full run tapi lolos saat dijalankan sendiri hampir selalu **test pollution**: cek `mockImplementation` yang bocor ke test berikutnya (gunakan `mockImplementationOnce`), dan state modul yang belum di-reset.
<!-- END:testing-rules -->

<!-- BEGIN:database-rules -->
# Database dan SQL

- `supabase/migrations/` adalah satu-satunya sumber schema. **Jangan** menyalin file SQL ke `docs/`.
- Kalau sebuah tabel belum punya migrasi, buat migrasi baru — jangan arahkan pengguna ke file SQL yang tidak ada.
- Komentar header migrasi tidak boleh menunjuk path di luar `supabase/migrations/`.
- `.env.example` adalah daftar env var yang dipakai kode. Jangan tambah env var ke `.env.example` kalau tidak ada yang membacanya, dan sebaliknya.
- Jangan tambah dependency ke `package.json` tanpa minimal satu importer nyata.
<!-- END:database-rules -->

<!-- BEGIN:housekeeping -->
# Kebersihan Repository

- Root hanya boleh berisi `README.md` dan `AGENTS.md`. Dokumen fitur masuk ke `docs/specs/` (sudah diimplementasikan), `docs/plans/` (belum), `docs/reports/` (audit).
- Setiap file di `public/` harus punya minimal satu importer. Asset sisa template yang tidak dipakai harus dihapus.
- Sebelum menghapus file, pastikan nol importer dengan `git grep`, dan cek apakah masih dirujuk README/test/CI.
- Kalau `docs/` di-ignore tapi isinya sudah tracked, `.gitignore` sudah salah: file baru diam-diam tidak akan ter-commit. RULES ini berlaku untuk `.gitignore` juga.
- Jangan pernah menambahkan kode mati "siapa tahu dipakai nanti". Kalau tidak ada importer, ia tidak dipakai.
<!-- END:housekeeping -->

<!-- BEGIN:verification -->
# Verifikasi

`npm run ci` harus hijau sebelum menyatakan selesai. Urutan gate:

```bash
npm run lint        # 0 error, 0 warning
npm run typecheck   # next typegen && tsc --noEmit
npm test            # seluruh file harus lulus dalam full run
npm run i18n:check  # jumlah key id harus sama dengan en
npm run build       # harus compile
```

Catatan operasional:

- Kalau `typecheck` melapor error dari dalam `.next/`, jalankan `Remove-Item -Recurse -Force .next` lalu ulangi. File `.next/dev/types/` bisa korup setelah config berubah.
- `npm` harus dipanggil lewat `cmd /c "npm ..."` di PowerShell, karena `ExecutionPolicy` memblokir `npm.ps1`.
- `package.json` yang berubah harus ikut di-commit beserta `package-lock.json`.
- Warning di `stderr` saat test (mis. `[rateLimit] Store bermasalah`, `POST Error: { message: 'insert failed' })` adalah output yang disengaja dari test jalur error. Yang menentukan adalah exit code dan ringkasan Test Files.

## Utang teknis yang diketahui

Item berikut belum dirapikan. Saat menyentuh salah satunya, sekalian perbaiki; jangan menambah aturan baru di area yang sama.

| File | Masalah |
| :--- | :--- |
| `app/dashboard/keuangan/_components/FinanceLedgerView.tsx` (~1190) | Panel distribusi sudah terpisah; sisa concerns: tabel desktop, kartu batch mobile, form filter. |
| `tests/components/StokView.test.tsx` | Tidak pernah merender isi tab stok, jadi refactor tab StokView tidak punya pengaman. |
| `controllers/cuaca/useCuacaController.tsx` (~605) | Lokasi sudah terpisah; sisa concern yang belum dipisah: notifikasi, jadwal, kanal WhatsApp. |
| `tests/components/KeuanganView.test.tsx` (~990) | Masih satu file untuk seluruh keuangan. |
<!-- END:verification -->

## Token visual ada di theme, bukan di wrapper

Token dasar tombol dan kartu **tidak boleh** ditulis di `sx` wrapper maupun di `components/ui/`. Satu-satunya sumber adalah `lib/theme.ts`:

```ts
MuiButton: { styleOverrides: { root: { /* radius, font, padding */ } } }
MuiCard:   { styleOverrides: { root: { /* radius 32, border divider, tanpa bayangan */ } } }
```

Wrapper hanya boleh menambah **perilaku**, bukan nilai visual:

- `components/ui/Button.tsx` — hanya `loading` → spinner + auto-disable
- `components/ui/Card.tsx` — hanya header (judul, subjudul, aksi) + konten

Kalau sebuah View memakai `<Card>` atau `<Button>` MUI mentah, ia **tetap dapat token yang sama** karena berasal dari theme. Memigrasikannya ke wrapper hanya perlu bila butuh perilaku header atau `loading` — sebelas pemakaian `CardHeader` yang sudah punya `sx` kustom tidak perlu diberi wrapper, karena itu justru menghilangkan kustomisasi tanpa imbalan.

