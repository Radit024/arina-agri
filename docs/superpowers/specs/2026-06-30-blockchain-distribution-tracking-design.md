# Design Spec: Sistem Tracking Distribusi Produk Berbasis Blockchain & QR Code

**Tanggal:** 2026-06-30  
**Status:** Approved  
**Konteks:** Skripsi — repo baru terpisah dari Arina Agri, mengambil fitur stok sebagai fondasi

---

## 1. Latar Belakang

Sistem ini dirancang sebagai implementasi skripsi bertema *Perancangan Sistem Tracking Distribusi Produk Menggunakan Blockchain dan QR Code*. Fitur stok yang sudah ada di Arina Agri (batch panen, mutasi stok, grade, lokasi, pembeli) digunakan sebagai fondasi, diperluas dengan:

- Rantai distribusi multi-aktor (Petani → Gudang → Distributor → Retailer → Konsumen)
- Setiap serah terima dicatat on-chain di Polygon sebagai hash anchor
- QR code per batch sebagai jembatan fisik-digital
- Halaman publik untuk konsumen memverifikasi keaslian riwayat distribusi

---

## 2. Keputusan Teknis

| Aspek | Keputusan | Alasan |
|---|---|---|
| Blockchain | Polygon (Amoy testnet) | Supply chain use case ada (termasuk Indonesia), gas murah, EVM-compatible, referensi akademis kuat |
| Smart contract framework | Hardhat + Solidity | JavaScript-based, familier, integrasi ethers.js mudah |
| Autentikasi aktor | Backend wallet relay (gasless) | Realistis untuk petani lokal yang tidak punya MetaMask |
| Database off-chain | Supabase | Konsisten dengan Arina Agri |
| Data storage pattern | Hash-anchored | Data detail di Supabase, hanya SHA-256 hash on-chain — pola industri (OriginTrail, TRACE-RICE) |
| Frontend | Next.js | Sama dengan Arina, tinggal copy komponen stok yang relevan |
| QR scan page | Halaman web publik | Konsumen tidak perlu install apapun |
| QR pola | 1 QR per batch | Setiap serah terima = scan = transaksi on-chain baru |

---

## 3. Arsitektur Sistem

### 4 Layer

```
LAYER 1 — FRONTEND (Next.js)
  Dashboard Aktor | Halaman Publik QR (/track/[batchId]) | Admin Panel
         ↓
LAYER 2 — BACKEND (Next.js API Routes)
  Auth Supabase | Wallet Relay | Hash Generator | QR Generator
         ↓                              ↓
LAYER 3 — OFF-CHAIN              LAYER 4 — ON-CHAIN
  Supabase (PostgreSQL)           Polygon Amoy
  Data lengkap batch,             Smart Contract
  mutasi, aktor, QR               (hanya hash + timestamp + role)
```

### Prinsip Kunci
- Supabase = sumber data yang ditampilkan (cepat, lengkap)
- Polygon = notaris digital (hanya 32 bytes hash per transaksi, tidak bisa dimanipulasi)
- QR code = jembatan fisik-digital (satu QR per batch, berlaku sepanjang rantai)

---

## 4. Smart Contract — ProductTracker.sol

```solidity
struct BatchEvent {
    bytes32 dataHash;      // SHA-256 dari data Supabase
    address actorAddress;  // wallet backend relay
    uint8   actorRole;     // 0=Petani,1=Gudang,2=Distributor,3=Retailer
    uint256 timestamp;     // block.timestamp
    string  batchId;       // UUID dari Supabase
}

mapping(string => BatchEvent[]) public batchHistory;

function registerBatch(string batchId, bytes32 dataHash) external onlyRelay
function recordHandover(string batchId, bytes32 dataHash, uint8 actorRole) external onlyRelay
function getHistory(string batchId) external view returns (BatchEvent[])
function verifyHash(string batchId, uint256 index, bytes32 hash) external view returns (bool)
```

**Gas estimation:**
- `registerBatch()` → ~80.000 gas (~$0.0001 di Polygon mainnet)
- `recordHandover()` → ~60.000 gas (~$0.00008 di Polygon mainnet)
- `getHistory()` → gratis (read-only)
- Satu siklus distribusi lengkap (4 handover) → maksimal $0.001

---

## 5. Database Schema Supabase

### Tabel dari Arina (disesuaikan)

```sql
harvest_batches
  id, batch_code, tanggal_panen, grade, berat_masuk, stok_tersisa,
  harga_modal, harga_jual, lokasi_penyimpanan, estimasi_kadaluarsa,
  catatan, status, user_id,
  blockchain_tx_hash,   -- tx hash saat registerBatch()
  qr_code_url,          -- URL: /track/{id}
  qr_code_data,         -- base64 PNG QR
  created_at, updated_at

stock_mutations          -- riwayat masuk/keluar (dari Arina)
supply_items             -- item saprotan (dari Arina)
grades                   -- grade produk (dari Arina)
locations                -- lokasi penyimpanan (dari Arina)
buyers                   -- data pembeli (dari Arina)
```

### Tabel Baru

```sql
actors
  id, user_id, name,
  role  ENUM('petani','gudang','distributor','retailer'),
  phone, address, created_at

distribution_events
  id, batch_id → harvest_batches,
  from_actor_id → actors,
  to_actor_id   → actors,
  event_type    ENUM('serah_terima','konfirmasi_terima'),
  weight_kg, notes, location,
  data_hash,             -- SHA-256 dari semua field
  blockchain_tx_hash,    -- tx hash dari recordHandover()
  blockchain_status      ENUM('pending','confirmed','failed'),
  confirmed_at, created_at

qr_scans
  id, batch_id, scanned_at, user_agent, ip_hash,
  scan_type  ENUM('actor','consumer')
```

---

## 6. Alur Data per Aktor

### Petani — Membuat Batch
1. Isi form (grade, berat, harga, lokasi, tanggal panen) — sama seperti Arina
2. Backend simpan ke `harvest_batches` (Supabase)
3. Backend generate SHA-256 hash dari data batch
4. Backend wallet relay panggil `registerBatch()` di Polygon → dapat `tx_hash`
5. Update `harvest_batches`: `blockchain_tx_hash`, status confirmed
6. Generate QR code (`/track/{batchId}`) → simpan ke Supabase
7. Petani download/print QR code

### Gudang, Distributor, Retailer — Serah Terima
1. Scan QR → redirect ke `/dashboard/distribusi/terima?batchId=xxx`
2. Sistem load data batch → tampilkan info produk
3. Aktor isi: berat diterima, catatan, lokasi sekarang
4. Backend:
   - Simpan ke `distribution_events` (status: pending)
   - Hash semua field → `data_hash`
   - Relay `recordHandover()` di Polygon → `tx_hash`
   - Update status: confirmed
5. Aktor lihat konfirmasi sukses + link Polygonscan

### Konsumen — Scan QR
1. Scan QR → buka `/track/{batchId}` (no login)
2. Fetch data dari Supabase (cepat)
3. Paralel: fetch `getHistory()` dari smart contract
4. Per event: bandingkan `data_hash` Supabase vs on-chain
   - Match → badge hijau "Terverifikasi Blockchain ✓"
   - Mismatch → badge merah "Data tidak sesuai ⚠"
5. Tampilkan timeline: Petani → Gudang → Distributor → Retailer → Anda

---

## 7. Struktur Folder Next.js

```
app/
├── dashboard/
│   ├── batch/                    # Dari Arina: stok → batch
│   │   ├── page.tsx
│   │   └── _components/
│   │       ├── BatchView.tsx
│   │       └── BatchDialog.tsx
│   ├── distribusi/               # BARU
│   │   ├── page.tsx
│   │   ├── terima/page.tsx
│   │   └── _components/
│   │       ├── DistribusiView.tsx
│   │       └── HandoverDialog.tsx
│   └── qr/[batchId]/page.tsx
├── track/
│   └── [batchId]/                # Halaman publik konsumen
│       ├── page.tsx
│       └── _components/
│           ├── TrackingView.tsx
│           └── VerificationBadge.tsx
└── api/
    ├── batch/route.ts
    ├── distribusi/route.ts
    └── track/[id]/route.ts

controllers/
├── batch/BatchController.tsx     # Dari StokController Arina
├── distribusi/DistribusiController.tsx
└── track/TrackController.tsx

hooks/
├── useBatch.ts                   # Dari useStok.ts Arina
├── useDistribusi.ts
└── useTrack.ts

lib/
├── supabase.ts                   # Dari Arina, tidak berubah
├── blockchain.ts                 # ethers.js + wallet relay
├── hash.ts                       # SHA-256 generator
└── qrcode.ts                     # qrcode.react wrapper

contracts/                        # Hardhat subfolder
├── hardhat.config.ts
├── contracts/ProductTracker.sol
├── scripts/deploy.ts
├── test/ProductTracker.test.ts
└── deployments/amoy.json
```

### File Diambil dari Arina (rename/adaptasi)
- `hooks/useStok.ts` → `hooks/useBatch.ts`
- `controllers/stok/StokController.tsx` → `controllers/batch/BatchController.tsx`
- `app/dashboard/stok/_components/StokView.tsx` → `BatchView.tsx`
- `app/dashboard/stok/_lib/stockSchemas.ts` → `batchSchemas.ts`
- `lib/supabase.ts` → dipakai langsung

---

## 8. QR Code Flow

```
Generate:
batchId (Supabase UUID)
  → URL: /track/{batchId}
  → qrcode.react → PNG base64
  → Simpan ke Supabase (qr_code_data)
  → Tampil di dashboard petani → bisa download/print

Scan (Aktor):
Scan QR → /track/{batchId}?actor=true
  → Jika login sebagai aktor → redirect ke /dashboard/distribusi/terima?batchId=xxx
  → Jika tidak login → tampil halaman publik konsumen

Scan (Konsumen):
Scan QR → /track/{batchId}
  → Fetch Supabase + Polygon secara paralel
  → Render timeline + badge verifikasi per event
```

---

## 9. Error Handling

| Skenario | Penanganan |
|---|---|
| Blockchain tx gagal | Status `pending` di Supabase, retry 3x dengan exponential backoff |
| QR scan batch tidak ditemukan | Halaman error informatif dengan panduan kontak |
| Hash mismatch | Badge merah "Peringatan: Data mungkin telah dimodifikasi" + tampilkan kedua hash untuk audit |
| Polygon RPC down | Fallback ke public RPC alternatif; jika semua down tampil "Verifikasi sementara tidak tersedia" |
| Aktor scan QR di luar urutan gilirannya | Validasi urutan on-chain: Gudang hanya bisa konfirmasi setelah Petani, dst. |
| Supabase down | Error page informatif, tidak expose detail teknis ke konsumen |

---

## 10. Testing Strategy

### Smart Contract (Hardhat)
- `registerBatch()` menyimpan hash dan event dengan benar
- `recordHandover()` menambah event ke history yang tepat
- `getHistory()` mengembalikan semua events untuk batchId
- `verifyHash()` return true/false dengan tepat
- Akses kontrol: hanya backend relay wallet yang bisa write

### Unit Tests (Jest/Vitest)
- `hash.ts`: SHA-256 dari input sama selalu menghasilkan hash identik
- `qrcode.ts`: generate QR menghasilkan URL valid
- Schema validasi Supabase untuk `distribution_events`

### Integration Tests
- Full flow: registerBatch → 4x recordHandover → getHistory → verifyHash semua match
- API route `/api/batch/create` end-to-end
- API route `/api/distribusi/handover` end-to-end

### Manual Testing (Demo Skripsi)
1. Buat 1 batch sebagai Petani
2. Login sebagai Gudang → scan QR → konfirmasi terima
3. Login sebagai Distributor → scan QR → konfirmasi terima
4. Login sebagai Retailer → scan QR → konfirmasi terima
5. Scan QR sebagai Konsumen → semua badge hijau
6. Lihat semua tx di Polygonscan Amoy

---

## 11. Referensi Akademis Utama

1. Blockchain-Based Traceability for Agricultural Products: A Systematic Literature Review — MDPI Agriculture, 2023
2. Enhancing Agricultural Supply Chain Traceability with Blockchain, Smart Contracts & E-Labelling — ResearchGate, 2025
3. Improving Agricultural Product Traceability Using Blockchain — PMC/Sensors, 2022
4. TRACE-RICE Project — Blockchain-Enabled Traceability in Rice Supply Chain, 2023
5. Wipro + Shell Falcon Platform on Polygon PoS — 2023
6. Readiness Assessment for Blockchain Traceability: Kintamani Coffee Case Study — JSC, 2024
