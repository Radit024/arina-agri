'use client';

import { useEffect, useMemo, useState } from 'react';

import type { ApiTransaction } from '@/lib/api';
import { nextLedgerSortState } from './ledgerSort';

const LEDGER_PAGE_SIZE = 7;

/**
 * Tabel Buku Besar: filter, pencarian, pengurutan, paginasi, dan seleksi baris.
 *
 * Dipisah dari `useKeuanganController` karena seluruh concern ini berputar
 * Around satu daftar `transactions`. Modul lain (BEP/HPP, laporan AI, grafik)
 * tidak menyentuh state ini sama sekali.
 */
export function useLedgerTable({
  transactions,
  bulanLabels,
}: {
  transactions: ApiTransaction[];
  bulanLabels: string[];
}) {
  const [filterBulan, setFilterBulan] = useState('semua');
  const [filterJenis, setFilterJenis] = useState<'semua' | 'pengeluaran' | 'pendapatan'>('semua');
  const [filterRabLink, setFilterRabLink] = useState<'semua' | 'linked' | 'unlinked'>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<'tanggal' | 'kategori' | 'nominal' | 'jenis' | null>(
    'tanggal',
  );
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>('desc');
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [ledgerPage, setLedgerPage] = useState(1);

  const clearSelectionTxs = () => setSelectedTxIds([]);

  const bulanOptions = useMemo(
    () =>
      Array.from(
        new Set(
          transactions
            .map((tx) => tx.tanggal.slice(0, 7))
            .filter((bulanKey) => /^\d{4}-\d{2}$/.test(bulanKey)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [transactions],
  );

  const getBulanLabel = (bulanKey: string) => {
    const [tahun, bulan] = bulanKey.split('-');
    const monthIndex = Number(bulan) - 1;
    if (monthIndex < 0 || monthIndex > 11 || Number.isNaN(monthIndex)) {
      return bulanKey;
    }
    return `${bulanLabels[monthIndex]} ${tahun}`;
  };

  // Filter bulan yang tidak lagi ada di daftar transaksi akan menggantung, jadi
  // dikembalikan ke "semua" alih-alih membuat tabel kosong tanpa explanation.
  useEffect(() => {
    if (filterBulan !== 'semua' && !bulanOptions.includes(filterBulan)) {
      setFilterBulan('semua');
    }
  }, [bulanOptions, filterBulan]);

  // Dihitung di sini, bukan di pemanggil, karena `filterBulan` milik modul ini
  // sekaligus juga menjadi dasar ringkasan pendapatan/pengeluaran di luar.
  const monthFilteredTransactions = useMemo(
    () => transactions.filter((tx) => filterBulan === 'semua' || tx.tanggal.startsWith(filterBulan)),
    [transactions, filterBulan],
  );

  // Filtered + searched + sorted table data
  const displayedTransactions = useMemo(() => {
    let result = monthFilteredTransactions.filter(
      (tx) => filterJenis === 'semua' || tx.jenis === filterJenis,
    );

    if (filterRabLink === 'linked') {
      result = result.filter((tx) => Boolean(tx.rabItemId || tx.rabCategoryId));
    } else if (filterRabLink === 'unlinked') {
      result = result.filter((tx) => !tx.rabItemId && !tx.rabCategoryId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (tx) =>
          tx.kategori.toLowerCase().includes(q) ||
          String(tx.volume ?? '').includes(q) ||
          (tx.satuan ?? '').toLowerCase().includes(q) ||
          String(tx.hargaSatuan ?? '').includes(q) ||
          String(tx.nominal ?? '').includes(q) ||
          (tx.keterangan ?? '').toLowerCase().includes(q),
      );
    }

    if (!sortColumn || !sortDir) return result;

    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortColumn === 'tanggal') cmp = a.tanggal.localeCompare(b.tanggal);
      else if (sortColumn === 'kategori') cmp = a.kategori.localeCompare(b.kategori);
      else if (sortColumn === 'nominal') cmp = a.nominal - b.nominal;
      else if (sortColumn === 'jenis') cmp = a.jenis.localeCompare(b.jenis);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [monthFilteredTransactions, filterJenis, filterRabLink, searchQuery, sortColumn, sortDir]);

  const ledgerTotalPages = Math.max(1, Math.ceil(displayedTransactions.length / LEDGER_PAGE_SIZE));

  // Perubahan filter selalu mengembalikan pengguna ke halaman pertama; kalau tidak,
  // pengguna bisa terjebak di halaman 5 dari hasil filter yang sekarang hanya
  // punya satu halaman.
  useEffect(() => {
    setLedgerPage(1);
  }, [filterBulan, filterJenis, filterRabLink, searchQuery, sortColumn, sortDir]);

  useEffect(() => {
    if (ledgerPage > ledgerTotalPages) setLedgerPage(ledgerTotalPages);
  }, [ledgerPage, ledgerTotalPages]);

  const pagedTransactions = useMemo(
    () =>
      displayedTransactions.slice(
        (ledgerPage - 1) * LEDGER_PAGE_SIZE,
        ledgerPage * LEDGER_PAGE_SIZE,
      ),
    [displayedTransactions, ledgerPage],
  );

  // Menghapus transaksi terpilih bisa membuat salah satu jenis hilang, sehingga
  // bulk delete tidak lagi Pode diasumsikan homogenous.
  const selectedTransactionsMixed = useMemo(() => {
    const selected = transactions.filter((tx) => selectedTxIds.includes(tx._id));
    return new Set(selected.map((tx) => tx.jenis)).size > 1;
  }, [transactions, selectedTxIds]);

  const toggleSort = (col: NonNullable<typeof sortColumn>) => {
    const next = nextLedgerSortState({ column: sortColumn, dir: sortDir }, col);
    setSortColumn(next.column);
    setSortDir(next.dir);
  };

  const toggleSelectTx = (id: string) => {
    setSelectedTxIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return {
    filterBulan,
    setFilterBulan,
    filterJenis,
    setFilterJenis,
    filterRabLink,
    setFilterRabLink,
    searchQuery,
    setSearchQuery,
    sortColumn,
    sortDir,
    selectedTxIds,
    bulkDeleteConfirm,
    setBulkDeleteConfirm,
    ledgerPage,
    setLedgerPage,
    bulanOptions,
    getBulanLabel,
    monthFilteredTransactions,
    displayedTransactions,
    pagedTransactions,
    ledgerTotalPages,
    selectedTransactionsMixed,
    toggleSort,
    toggleSelectTx,
    clearSelectionTxs,
  };
}
