# Desain: Migrasi Data Lama ke Model Scenario

Tanggal: 2026-08-02
Status: Disetujui, menunggu implementation plan
Sub-bagian: bagian terpisah dari revisi besar Manajemen Keuangan (lihat
`AUDIT_REVISI_MANAJEMEN_KEUANGAN.md` §14 di root repo; bergantung pada sub-bagian A —
`docs/superpowers/specs/2026-08-02-finance-scenario-model-calc-engine-design.md` — dan sub-bagian B —
`docs/superpowers/specs/2026-08-02-finance-scenario-ui-integration-design.md`)

## Latar Belakang

Sub-bagian B sengaja membuat data lama (RAB/transaksi dengan `scenario_id` NULL) tidak terlihat di
tampilan yang sudah difilter per-scenario, dan menunda migrasi sungguhan ke bagian terpisah ini.
Audit §14 menetapkan strategi migrasi: data lama tidak aman langsung dianggap REALISASI karena tidak
pernah ada pemisahan mode sebelumnya. RAB lama dapat dipetakan otomatis ke PROYEKSI (karena model
lama memang eksplisit membuat RAB sebagai rencana), tapi transaksi lama harus masuk antrean
klasifikasi manual (`UNCLASSIFIED`) dengan dukungan bulk assignment, disertai audit trail dan
kemampuan rollback administratif.

## Keputusan Desain

1. **Pemicu migrasi: otomatis saat proyek lama dibuka pertama kali** di modul Keuangan (bukan tool
   terpisah di Pengaturan) — memperluas logic provisioning scenario yang sudah dibangun di
   sub-bagian B (`useFinanceScenarios`).
2. **RAB lama otomatis ter-assign ke PROJECTION**, tanpa interaksi pengguna — `scenario_id` NULL
   pada `rab_categories`/`rab_items` proyek tersebut diisi ke ID scenario `PROJECTION` proyek itu.
   Operasi ini idempoten (hanya menyentuh baris yang masih NULL, jadi no-op pada pembukaan
   berikutnya) dan tercatat ke audit log.
3. **Transaksi lama TIDAK di-assign otomatis** — `scenario_id` NULL pada transaksi merepresentasikan
   status "belum diklasifikasi" (`UNCLASSIFIED`), konsisten dengan aturan sub-bagian B bahwa data
   ber-`scenario_id` NULL memang tidak terlihat sampai diklasifikasikan.
4. **UI klasifikasi: banner + dialog dengan bulk assignment**, bukan halaman terpisah. Banner
   tampil di atas tab Buku Besar saat ada transaksi UNCLASSIFIED di proyek tersebut.
5. **Audit trail: tabel `migration_audit_log` baru**, mencatat setiap perubahan `scenario_id`
   (auto-migrasi RAB maupun klasifikasi/rollback transaksi manual) — bukan hanya field metadata di
   tabel transaksi, supaya riwayat penuh tersedia meski klasifikasi diubah berkali-kali.
6. **Rollback**: aksi "Batalkan klasifikasi" per baris di dialog klasifikasi yang sama (mengembalikan
   `scenario_id` ke NULL, tercatat sebagai entri rollback) — bukan tool administratif terpisah.
   Layar khusus untuk menelusuri riwayat `migration_audit_log` secara visual **tidak** termasuk
   cakupan ini (datanya tetap tersimpan lengkap untuk investigasi manual via database).

## Arsitektur

### Data Model

```sql
migration_audit_log
  id             uuid PK
  user_id        uuid NOT NULL
  project_id     uuid NOT NULL REFERENCES finance_projects(id) ON DELETE CASCADE
  entity_type    text NOT NULL CHECK (entity_type IN ('rab_category', 'rab_item', 'transaction'))
  entity_id      uuid NOT NULL
  previous_scenario_id  uuid NULL REFERENCES finance_scenarios(id)
  new_scenario_id       uuid NULL REFERENCES finance_scenarios(id)
  action         text NOT NULL CHECK (action IN ('auto_migrate_rab', 'classify_transaction', 'rollback_classification'))
  created_at     timestamptz DEFAULT now()
```

`previous_scenario_id`/`new_scenario_id` nullable karena baik keadaan awal (NULL → migrasi) maupun
rollback (klasifikasi → NULL) melibatkan sisi NULL.

### Trigger & Logic

```
hooks/useFinanceScenarios.ts   (dimodifikasi, dari sub-bagian B)
  → setelah memastikan 2 baris finance_scenarios ada untuk sebuah proyek:
      1. UPDATE rab_categories SET scenario_id = projectionScenario.id
         WHERE project_id = X AND scenario_id IS NULL
      2. UPDATE rab_items SET scenario_id = projectionScenario.id
         WHERE project_id = X AND scenario_id IS NULL
      3. Untuk setiap baris yang ter-update di langkah 1-2, tulis satu baris
         migration_audit_log (action = 'auto_migrate_rab', previous_scenario_id = NULL,
         new_scenario_id = projectionScenario.id)
  → transaksi TIDAK disentuh oleh langkah ini

hooks/useUnclassifiedTransactions.ts   (baru)
  → given projectId: fetch transactions WHERE project_id = X AND scenario_id IS NULL
  → return { unclassified: ApiTransaction[], count, loading, error, reload }

controllers/keuangan/useMigrationController.ts   (baru)
  → wraps useUnclassifiedTransactions(selectedProject?.id)
  → classifyTransactions(transactionIds: string[], targetScenarioId: string):
      update scenario_id tiap transaksi terpilih, tulis migration_audit_log per transaksi
      (action = 'classify_transaction', previous_scenario_id = null,
      new_scenario_id = targetScenarioId)
  → unclassifyTransaction(transactionId: string, currentScenarioId: string):
      set scenario_id kembali ke NULL, tulis migration_audit_log
      (action = 'rollback_classification', previous_scenario_id = currentScenarioId,
      new_scenario_id = null)
  → dialogOpen state + open/close
```

### UI Components

```
app/dashboard/keuangan/_components/UnclassifiedTransactionsBanner.tsx   (baru)
  → tampil di atas ledger Buku Besar saat count > 0: "N transaksi belum diklasifikasi"
  → tombol "Klasifikasikan Sekarang" membuka TransactionClassificationDialog

app/dashboard/keuangan/_components/TransactionClassificationDialog.tsx   (baru)
  → daftar transaksi UNCLASSIFIED dengan checkbox (pola selection sama seperti bulk-select
    yang sudah ada di ledger transaksi)
  → tombol massal "Tandai sebagai Proyeksi" / "Tandai sebagai Realisasi" memanggil
    useMigrationController.classifyTransactions
  → setiap baris transaksi yang SUDAH terklasifikasi (untuk kasus dialog dibuka ulang setelah
    sebagian diklasifikasi dalam sesi yang sama) menampilkan aksi "Batalkan klasifikasi"
    memanggil unclassifyTransaction
```

## Error Handling & Edge Case

- Proyek dibuka berkali-kali → auto-migrasi RAB no-op setelah run pertama (tidak ada duplikasi
  audit log, lihat Keputusan Desain #2).
- Transaksi yang sudah diklasifikasikan lalu dibatalkan (rollback) → kembali muncul di banner/dialog
  UNCLASSIFIED, riwayat penuh (klasifikasi awal + rollback) tetap ada di `migration_audit_log`.
- Bulk classify sebagian gagal (mis. satu transaksi gagal ter-update) → laporkan jumlah
  berhasil/gagal secara eksplisit (mengikuti pola feedback bulk operation yang sudah ada di modul
  ini), jangan menelan error dengan `catch {}` kosong (audit §7.4/§11.6).
- Proyek baru (dibuat setelah revisi scenario ini berjalan) tidak pernah punya data `scenario_id`
  NULL, sehingga banner UNCLASSIFIED tidak pernah muncul untuknya — perilaku ini otomatis benar
  tanpa perlu percabangan kode khusus "proyek baru vs lama".

## Testing

- Unit test auto-migrasi RAB: baris `scenario_id` NULL ter-assign ke PROJECTION pada pembukaan
  pertama; pembukaan kedua adalah no-op (tidak ada baris migration_audit_log baru).
- Unit test `useMigrationController.classifyTransactions`: multi-select ter-update ke
  `scenario_id` yang benar, audit log tertulis per transaksi.
- Unit test `unclassifyTransaction`: `scenario_id` kembali NULL, audit log rollback tertulis.
- Component test `UnclassifiedTransactionsBanner`: muncul saat count > 0, hilang saat count = 0.
- Component test `TransactionClassificationDialog`: bulk assign & rollback per baris berfungsi,
  pesan hasil (berhasil/gagal) akurat pada kegagalan sebagian.

## Out of Scope

- Tool migrasi lintas-proyek terpusat — migrasi tetap dipicu per-proyek saat proyek itu dibuka.
- Layar khusus menelusuri riwayat `migration_audit_log` secara visual — datanya tersimpan lengkap,
  tapi UI browsing riwayat penuh ditunda ke fase berikutnya (bukan blocker workflow inti).
- Klasifikasi otomatis berbasis heuristik (mis. menebak Proyeksi/Realisasi dari tanggal transaksi
  vs tanggal proyek) — audit eksplisit mewajibkan keputusan pengguna, bukan tebakan sistem.
