# Transaction Draft Collapse Design

## Goal

Di modal tambah/edit transaksi, setiap draft transaksi yang sudah diinput harus bisa di-expand dan di-collapse. Saat ini klik pada draft yang sedang terbuka tidak menutupnya karena controller selalu mengisi `expandedDraftId` dengan id yang sama.

## Behavior

- Klik draft yang tertutup membuka draft tersebut.
- Klik draft yang sedang terbuka menutup draft tersebut.
- Saat tambah draft baru, draft baru tetap otomatis terbuka.
- Saat edit transaksi, draft awal tetap otomatis terbuka.
- Saat validasi menemukan error, draft pertama yang error tetap otomatis terbuka.
- Saat draft yang sedang terbuka dihapus, draft tersisa terakhir tetap otomatis terbuka seperti perilaku sebelumnya.

## Implementation

Ubah `expandDraft(id)` di `useTransactionBatchController` menjadi toggle:

```ts
const expandDraft = (id: string) => {
  setExpandedDraftId((current) => (current === id ? null : id));
};
```

Komponen `TransactionDraftCard` dan `TransactionBatchDialog` tidak perlu mengubah kontrak props karena tetap memanggil `expandDraft(draft.id)`.

## Testing

Tambahkan test hook untuk memastikan `expandDraft(id)` membuka draft ketika tertutup dan menutup draft ketika id yang sama dipanggil lagi.
