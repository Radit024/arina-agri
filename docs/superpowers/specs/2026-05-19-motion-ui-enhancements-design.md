# Motion UI Enhancements + Dark Mode Fixes - Design Spec

## 1. Ringkasan
Menambahkan Framer Motion untuk micro-interaction bottom nav, transisi halaman dashboard, dan animasi konten bottom sheet. Melengkapi dashboard dengan skeleton loading + pull-to-refresh mobile, serta memperbaiki dark mode di halaman Pengaturan dengan mengganti warna hardcoded ke token tema.

## 2. Tujuan
- Memberi rasa interaksi native dengan motion ringan tanpa mengubah struktur MUI.
- Menyediakan loading state yang informatif di dashboard utama.
- Menjaga tampilan Pengaturan tetap kontras dan konsisten di dark mode.

## 3. Non-Goal
- Tidak mengganti komponen MUI utama (BottomNavigation, SwipeableDrawer).
- Tidak membuat animasi global di seluruh aplikasi di luar area dashboard.
- Tidak menambah layanan data baru.

## 4. Ruang Lingkup
- **Bottom Nav (mobile):** micro-interaction icon/label.
- **Dashboard main page:** transisi halaman + skeleton loading + pull-to-refresh.
- **Bottom Sheet "Lainnya":** animasi konten list tanpa mengubah gesture swipe.
- **Halaman Pengaturan:** perbaikan token warna agar dark mode aman.

## 5. Arsitektur Motion
### 5.1 Bottom Nav
- Bungkus ikon dan label `BottomNavigationAction` dengan `motion.span`.
- `whileTap={{ scale: 0.96 }}` untuk feedback tekan.
- `animate={{ scale: isSelected ? 1 : 0.98 }}` dengan easing 120–160ms.
- Tidak mengubah struktur `BottomNavigationAction` agar a11y tetap default MUI.

### 5.2 Transisi Halaman Dashboard
- Di `app/dashboard/layout.tsx`, bungkus `children` dengan `AnimatePresence` + `motion.div`.
- Gunakan key berdasarkan pathname agar transisi berjalan saat route berubah.
- Transisi ringan: enter `opacity: 0, y: 6` → `opacity: 1, y: 0`; exit kebalikannya.
- Hormati `prefers-reduced-motion` via `useReducedMotion` untuk mematikan motion bila diminta user.

### 5.3 Bottom Sheet "Lainnya"
- Tetap gunakan `SwipeableDrawer` agar gesture swipe tidak terganggu.
- Konten list dibungkus `motion.div` dengan `initial/animate` saat `open` berubah.
- Stagger ringan per item (`delay` 20–30ms) via `motion.div` di dalam `ListItemButton`.

## 6. Loading & Pull-to-Refresh (Dashboard Utama)
- Saat `useTransactions.loading` atau `useCalendar.loading` true, tampilkan skeleton layout:
  - KPI card, chart cards, quick actions, news widget.
- Pull-to-refresh hanya di mobile dashboard utama:
  - Gesture tarik dari atas memicu `reload()` pada `useTransactions`, `useCalendar`, `useCommodityPrices`.
  - Indikator refresh ringan di top content, tanpa dependency tambahan selain Framer Motion.
- Setelah data siap, skeleton diganti konten aktual; error tetap tampil sesuai pola yang ada.

## 7. Dark Mode Fix (Halaman Pengaturan)
- Ganti warna hardcoded (#ffffff, #f0fdf4, #16a34a, #111827) dengan token tema:
  - `background.paper`, `background.default`, `action.hover`, `success.light`,
    `text.primary`, `text.secondary`.
- Kartu menu mobile pengaturan:
  - `bgcolor: background.paper`, border `divider`.
  - Badge ikon memakai `alpha(theme.palette.success.main, 0.12)` agar aman di dark.
- Panel konten:
  - `background.paper` + shadow ringan berbasis mode.

## 8. Data Flow
- Tidak menambah API baru.
- Pull-to-refresh memanggil fungsi reload yang sudah tersedia di hooks.

## 9. Error Handling
- Error data tetap memakai pola existing (Alert/Snackbar).
- Motion tidak memblokir render jika animasi gagal.

## 10. Aksesibilitas
- `prefers-reduced-motion` mematikan animasi non-esensial.
- Snackbar/toast tetap pakai `role="status"` dan `aria-live="polite"`.

## 11. Dependensi
- Tambahkan `framer-motion` ke `package.json`.

## 12. Testing
- Unit test: bottom nav tetap menampilkan 5 item.
- Visual check: transisi halaman halus, skeleton muncul saat loading.
- Visual check dark mode Pengaturan: kontras teks dan kartu aman.

## 13. Catatan Implementasi
- Hindari konflik `SwipeableDrawer` dengan animasi; motion hanya di konten.
- Gunakan motion minimal untuk menjaga performa dan bundle size.
