# Rencana Implementasi Subscription (Free, Basic, Pro)

## 1. Tujuan
- Membuat model monetisasi berkelanjutan tanpa merusak pengalaman user baru.
- Menjaga fitur inti tetap bisa dicoba di tier Free.
- Mengarahkan user aktif ke Basic, lalu user skala usaha ke Pro.

## 2. Tech Stack Aktual Proyek

Stack di bawah ini disesuaikan dengan codebase saat ini.

### 2.1 Frontend
- Next.js 16 (App Router) + React 19 + TypeScript.
- UI: MUI v9 + Tailwind CSS.
- i18n: next-intl.

### 2.2 Auth dan Data
- Auth utama: Supabase Auth (client memakai `@supabase/supabase-js`).
- CRUD transaksi, kalender, stok: langsung ke Supabase Postgres via `lib/api.ts`.
- Data model yang sudah dipakai: `transactions`, `calendar_events`, `harvest_batches`, `stock_mutations`.

### 2.3 Backend
- Backend TypeScript di `backend/` saat ini dipakai sebagai AI proxy (`/api/ai/*`).
- Backend Node di `server/` masih ada, tetapi bukan jalur utama CRUD frontend saat ini.

### 2.4 Implikasi untuk Subscription
- Entitlement untuk transaksi/kalender/stok tidak diletakkan di Express middleware.
- Entitlement wajib ditegakkan di Supabase layer (RLS policy + function/RPC) agar aman.

## 3. Ruang Lingkup MVP
- Implementasi 3 tier: `free`, `basic`, `pro`.
- Entitlement berbasis limit penggunaan per bulan.
- Payment gateway lokal (disarankan Midtrans atau Xendit).
- Upgrade langsung aktif, downgrade efektif di akhir periode.
- Dashboard usage untuk user (sisa kuota per fitur).

Di luar MVP:
- Add-on per fitur.
- Proration kompleks lintas siklus.
- Kupon dan affiliate.

## 4. Definisi Tier dan Entitlement

| Fitur | Free | Basic | Pro |
|---|---:|---:|---:|
| Prompt AI per bulan | 10 | 300 | 1500 (fair use) |
| Akses kalender | Tidak | Ya | Ya |
| Export laporan | CSV | CSV + PDF | CSV + PDF + insight AI (Powered by Gemini) |
| Jumlah anggota tim | 1 | 1 | 5 |

Catatan prompt AI:
- Free: limit dihitung per jumlah prompt, reset harian.
- Basic: 4x lebih banyak dari Free.
- Pro: 10x lebih banyak dari Free.

Catatan:
- `unlimited` direpresentasikan sebagai `-1`.
- Limit dihitung per `user_id` (sesuai model Supabase saat ini).

## 5. Arsitektur Solusi (Sesuai Stack Saat Ini)

### 5.1 Komponen Utama
1. Subscription domain di Supabase:
- tabel plan, subscription, usage, billing event.

2. Entitlement enforcement di Supabase:
- RLS policy membatasi akses data per `auth.uid()`.
- Function/RPC mengecek kuota sebelum insert/update fitur berbayar.

3. Billing integration layer:
- Endpoint checkout + webhook di Next.js Route Handler (`app/api/*`) atau service backend terpisah.
- Webhook memutakhirkan status subscription secara idempotent.

4. Frontend subscription UI:
- Halaman paket, status paket aktif, meter usage, CTA upgrade.

### 5.2 Integrasi dengan Struktur Proyek
- Frontend dashboard tetap menggunakan `lib/api.ts`.
- Untuk aksi yang perlu entitlement ketat, frontend panggil RPC Supabase (bukan insert langsung).
- Endpoint AI (`/api/ai/*`) tetap lewat backend TypeScript; quota AI bisa divalidasi di endpoint ini.

## 6. Desain Data (Supabase Postgres)

Gunakan migration SQL, bukan collection Mongo.

### 6.1 Table `plans`
Kolom inti:
- `code` text primary key (`free`, `basic`, `pro`)
- `name` text
- `price_monthly` integer
- `currency` text default `IDR`
- `entitlements` jsonb
- `is_active` boolean
- `created_at`, `updated_at` timestamptz

### 6.2 Table `user_subscriptions`
Kolom inti:
- `id` uuid primary key
- `user_id` uuid not null
- `plan_code` text references `plans(code)`
- `status` text (`active`, `trialing`, `past_due`, `canceled`)
- `billing_cycle` text (`monthly`, `yearly`)
- `current_period_start`, `current_period_end` timestamptz
- `cancel_at_period_end` boolean
- `payment_provider`, `provider_customer_id` text
- `created_at`, `updated_at` timestamptz

### 6.3 Table `usage_counters`
Kolom inti:
- `id` uuid primary key
- `user_id` uuid not null
- `period` text format `YYYY-MM`
- `transactions_created` integer default 0
- `ai_prompts_used` integer default 0
- `calendar_events_created` integer default 0
- `active_batches` integer default 0
- `updated_at` timestamptz

Unique index:
- `(user_id, period)`

### 6.4 Table `billing_events`
Kolom inti:
- `id` uuid primary key
- `provider` text
- `provider_event_id` text unique
- `payload` jsonb
- `processed_at` timestamptz null
- `created_at` timestamptz

## 7. RLS dan Function yang Dibutuhkan

### 7.1 RLS minimum
- `plans`: read-only untuk authenticated.
- `user_subscriptions`: user hanya bisa lihat row miliknya.
- `usage_counters`: user hanya bisa lihat row miliknya.
- `billing_events`: hanya service role.

### 7.2 Function/RPC minimum
1. `get_my_subscription()`
- return plan aktif + status + entitlement.

2. `get_my_usage(period_text)`
- return usage + sisa kuota.

3. `guarded_create_transaction(payload jsonb)`
- cek limit plan dulu, lalu insert transaksi jika lolos.

4. `guarded_create_calendar_event(payload jsonb)`
- pola sama untuk kalender.

5. `guarded_create_harvest_batch(payload jsonb)`
- cek limit active batch.

Opsional MVP cepat:
- Pakai insert langsung + trigger counter, lalu hard block dilakukan di frontend.
- Untuk produksi berbayar, tetap disarankan hard block di RPC/server.

## 8. API Contract (Draft)

### 8.1 Frontend-facing
- `GET /api/subscription/plans`
  - daftar paket dari table `plans`.
- `GET /api/subscription/me`
  - plan aktif user + status.
- `GET /api/subscription/usage`
  - usage dan sisa kuota.
- `POST /api/subscription/checkout`
  - buat transaksi billing provider.
- `POST /api/subscription/cancel`
  - set `cancel_at_period_end = true`.
- `POST /api/subscription/resume`
  - batalkan cancel terjadwal.

### 8.2 Webhook
- `POST /api/billing/webhook`
  - verifikasi signature.
  - simpan event idempotent.
  - update `user_subscriptions`.

## 9. Perubahan Implementasi

### 9.1 Supabase
1. Buat folder migration baru: `supabase/migrations/`.
2. Tambah DDL untuk `plans`, `user_subscriptions`, `usage_counters`, `billing_events`.
3. Tambah RLS policy dan RPC/function entitlement.
4. Seed `plans` untuk free/basic/pro.

### 9.2 Frontend (Next.js)
1. Tambah halaman `app/dashboard/langganan/page.tsx`.
2. Tambah helper `lib/subscription.ts` untuk plans, status, usage.
3. Integrasikan banner upgrade saat usage >= 80%.
4. Ubah jalur create data ke RPC jika fitur butuh hard block.

### 9.3 Backend AI (opsional pada MVP)
1. Tambahkan cek quota AI di endpoint AI proxy sebelum panggil Gemini.
2. Update `usage_counters.ai_prompts_used` setiap request sukses.

## 10. Timeline Implementasi (4 Minggu)

### Minggu 1 - Fondasi Data
- Migration table subscription + seed plans.
- RLS policy dasar.
- Endpoint read-only plans, my subscription, my usage.

### Minggu 2 - Entitlement Core
- RPC create transaksi/kalender/stok dengan guard kuota.
- Integrasi frontend ke RPC.
- Unit dan integration test limit.

### Minggu 3 - Billing
- Integrasi Midtrans/Xendit checkout.
- Webhook idempotent.
- Upgrade/cancel/resume lifecycle.

### Minggu 4 - UI dan Rollout
- Halaman pricing + usage meter.
- Paywall ringan + CTA upgrade.
- QA end-to-end + soft launch.

## 11. Testing Plan
- Unit test:
  - hitung sisa kuota.
  - transisi status subscription.
- Integration test:
  - RPC menolak saat limit habis.
  - webhook update status subscription.
- E2E test:
  - free ke basic, limit berubah.
  - cancel at period end.

## 12. KPI Pasca Rilis
- Free ke Basic conversion rate.
- Basic ke Pro conversion rate.
- Churn per tier.
- Fitur pemicu upgrade tertinggi.
- MRR dan ARPU bulanan.

## 13. Risiko dan Mitigasi
1. Risiko: bypass limit lewat client langsung ke tabel.
- Mitigasi: pakai RLS + RPC guarded insert untuk aksi write kritikal.

2. Risiko: event webhook terproses lebih dari sekali.
- Mitigasi: unique `provider_event_id` + idempotent handler.

3. Risiko: user terganggu oleh hard block mendadak.
- Mitigasi: warning bertahap (80%, 90%, 100%) + read-only fallback.

4. Risiko: codebase masih punya backend legacy.
- Mitigasi: tetapkan satu jalur resmi subscription (Supabase + Next API) dan dokumentasikan.

## 14. Definition of Done
- Paket free/basic/pro aktif di database dan bisa dibaca UI.
- Limit fitur kritikal ditegakkan server-side (RPC/RLS), bukan hanya frontend.
- Billing webhook tervalidasi dan idempotent.
- User bisa lihat paket aktif, usage, dan upgrade dari dashboard.
- Monitoring dasar untuk `limit_reached`, `checkout_created`, `webhook_processed` tersedia.
