# Rencana Implementasi Subscription (Free, Basic, Pro)

## 1. Tujuan
- Membuat model monetisasi berkelanjutan tanpa merusak pengalaman user baru.
- Menjaga fitur inti tetap bisa dicoba di tier Free.
- Mengarahkan user aktif ke Basic, lalu user skala usaha ke Pro.

## 2. Ruang Lingkup MVP
- Implementasi 3 tier: `free`, `basic`, `pro`.
- Entitlement berbasis limit penggunaan per bulan.
- Payment gateway lokal (disarankan Midtrans atau Xendit).
- Upgrade langsung aktif, downgrade efektif di akhir periode berlangganan.
- Dashboard usage untuk user (sisa kuota per fitur).

Di luar MVP:
- Add-on per fitur.
- Proration kompleks lintas siklus.
- Kupon dan affiliate.

## 3. Definisi Tier dan Entitlement

| Fitur | Free | Basic | Pro |
|---|---:|---:|---:|
| Transaksi keuangan per bulan | 100 | 2000 | unlimited |
| Batch stok aktif | 5 | 100 | unlimited |
| Prompt AI per bulan | 10 | 300 | 1500 (fair use) |
| Event kalender per bulan | 20 | 300 | unlimited |
| Export laporan | CSV | CSV + PDF | CSV + PDF + insight |
| Jumlah anggota tim | 1 | 1 | 5 |
| Support | komunitas | email standar | prioritas |

Catatan:
- `unlimited` direpresentasikan sebagai `-1` pada database.
- Semua limit dihitung per user, kecuali fitur tim dihitung per workspace (jika workspace diaktifkan).

## 4. Arsitektur Solusi

### 4.1 Komponen Utama
1. `Subscription Service`
- Menentukan plan aktif user.
- Menentukan status subscription (`active`, `past_due`, `canceled`, `trialing`).

2. `Entitlement Guard` (middleware backend)
- Dijalankan sebelum endpoint yang menambah penggunaan.
- Mengecek limit plan dan usage bulan berjalan.

3. `Usage Meter`
- Mencatat konsumsi fitur (`transactions_created`, `ai_prompt_used`, dll).
- Atomic update untuk menghindari race condition.

4. `Billing Integration`
- Membuat invoice/checkout.
- Menerima webhook payment sukses/gagal.

5. `Subscription UI`
- Halaman plan dan billing.
- Banner upgrade saat kuota 80% dan 100%.

### 4.2 Integrasi Dengan Struktur Proyek Saat Ini
- Frontend Next.js: halaman pricing + status subscription di dashboard.
- Backend Express: middleware entitlement di route:
  - `/api/transactions`
  - `/api/stok`
  - `/api/events`
  - `/api/ai/*`
- Auth tetap memakai provider yang sudah aktif, `userId` jadi kunci utama subscription.

## 5. Desain Data (MongoDB)

## 5.1 Collection: `plans`
Contoh dokumen:
```json
{
  "code": "basic",
  "name": "Basic",
  "priceMonthly": 49000,
  "currency": "IDR",
  "entitlements": {
    "transactionsPerMonth": 2000,
    "activeBatches": 100,
    "aiPromptsPerMonth": 300,
    "calendarEventsPerMonth": 300,
    "teamMembers": 1,
    "pdfExport": true,
    "insightAdvanced": false
  },
  "isActive": true
}
```

## 5.2 Collection: `subscriptions`
```json
{
  "userId": "uid_123",
  "planCode": "basic",
  "status": "active",
  "billingCycle": "monthly",
  "currentPeriodStart": "2026-04-01T00:00:00.000Z",
  "currentPeriodEnd": "2026-05-01T00:00:00.000Z",
  "cancelAtPeriodEnd": false,
  "trialEnd": null,
  "paymentProvider": "midtrans",
  "paymentCustomerId": "cust_xxx",
  "createdAt": "...",
  "updatedAt": "..."
}
```

## 5.3 Collection: `usage_counters`
```json
{
  "userId": "uid_123",
  "period": "2026-04",
  "counters": {
    "transactionsCreated": 58,
    "aiPromptsUsed": 9,
    "calendarEventsCreated": 11,
    "activeBatches": 4
  },
  "updatedAt": "..."
}
```

## 5.4 Collection: `billing_events`
- Menyimpan webhook mentah + hasil proses idempotent.
- Kunci idempotency: `providerEventId`.

## 6. API Contract (Draft)

### 6.1 Subscription APIs
- `GET /api/subscription/me`
  - Return plan aktif, status, period, entitlement.
- `POST /api/subscription/checkout`
  - Input: `targetPlan`.
  - Output: payment URL/token.
- `POST /api/subscription/cancel`
  - Set `cancelAtPeriodEnd = true`.
- `POST /api/subscription/resume`
  - Batalkan cancel sebelum period end.

### 6.2 Usage APIs
- `GET /api/subscription/usage`
  - Return usage bulan berjalan + limit + persentase.

### 6.3 Webhook APIs
- `POST /api/billing/webhook`
  - Verifikasi signature provider.
  - Proses event idempotent.
  - Update `subscriptions`.

## 7. Aturan Bisnis
- User baru default `free`.
- Trial Basic 14 hari (opsional, direkomendasikan).
- Upgrade: aktif instan setelah payment sukses.
- Downgrade: berlaku akhir periode aktif.
- Jika plan habis atau payment gagal:
  - Mode read tetap aktif.
  - Aksi write yang melewati limit ditolak dengan kode `402` atau `403` + pesan upgrade.

## 8. Perubahan Backend (Implementasi)
1. Tambah module baru:
- `backend/src/services/subscriptionService.ts`
- `backend/src/services/usageService.ts`
- `backend/src/services/billingService.ts`
- `backend/src/middleware/entitlementGuard.ts`

2. Tambah route baru:
- `backend/src/routes/subscription.ts`
- `backend/src/routes/billing.ts`

3. Integrasikan guard ke route eksisting:
- `transactions.ts` -> cek limit create/update tertentu.
- `stok.ts` -> cek `activeBatches` dan mutasi.
- `events.ts` -> cek event bulanan.
- `ai.ts` -> cek quota prompt.

4. Logging dan observability:
- Log penolakan entitlement (tanpa data sensitif).
- Metric count untuk `limit_reached` per fitur.

## 9. Perubahan Frontend (Implementasi)
1. Halaman pricing:
- `app/dashboard/langganan/page.tsx` (baru)
- Menampilkan perbandingan tier dan CTA upgrade.

2. Komponen status paket di pengaturan:
- tampilkan plan aktif, masa aktif, dan tombol kelola paket.

3. Banner dan paywall ringan:
- Muncul saat usage > 80%.
- Saat limit tercapai: tampilkan dialog upgrade.

4. Sinkronisasi usage:
- Polling ringan atau refresh saat user membuat data.

## 10. Timeline Implementasi (4 Minggu)

### Minggu 1 - Fondasi
- Finalisasi entitlement matrix.
- Buat schema collections dan seed data plans.
- Implement `GET /api/subscription/me` dan `GET /api/subscription/usage`.

### Minggu 2 - Guard dan Metering
- Implement `entitlementGuard`.
- Integrasi ke endpoint transaksi, stok, kalender, AI.
- Unit test untuk kasus limit.

### Minggu 3 - Billing
- Integrasi payment provider + webhook idempotent.
- Implement upgrade/cancel/resume.
- Uji alur sukses, gagal, expired.

### Minggu 4 - Frontend dan Rollout
- Implement halaman pricing dan banner upgrade.
- QA end-to-end + observability dashboard.
- Soft launch ke 10-20% user.

## 11. Testing Plan
- Unit test:
  - perhitungan limit.
  - period reset.
  - status subscription transitions.
- Integration test:
  - webhook -> update subscription.
  - endpoint write ditolak saat limit habis.
- E2E test:
  - user free -> upgrade basic -> limit bertambah.
  - downgrade terjadwal di period end.

## 12. KPI Pasca Rilis
- Free -> Basic conversion rate.
- Basic -> Pro conversion rate.
- Churn per tier.
- Fitur pemicu upgrade paling tinggi.
- MRR dan ARPU bulanan.

## 13. Risiko dan Mitigasi
1. Risiko: webhook dobel diproses.
- Mitigasi: idempotency key + unique index.

2. Risiko: user marah karena hard block.
- Mitigasi: read-only fallback + notifikasi sebelum limit habis.

3. Risiko: query usage lambat.
- Mitigasi: counter pre-aggregated per periode, bukan hitung realtime dari semua dokumen.

4. Risiko: ketergantungan provider payment.
- Mitigasi: abstraksi `billingService` agar provider bisa diganti.

## 14. Definition of Done
- Entitlement berjalan di semua endpoint write utama.
- Billing webhook tervalidasi dan idempotent.
- User bisa lihat plan, usage, dan upgrade dari UI.
- Monitoring dan alert dasar aktif.
- Dokumentasi operasional tersedia untuk tim.
