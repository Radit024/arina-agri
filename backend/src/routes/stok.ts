import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { HarvestBatch, StockMutation } from '../models';

const router = Router();

// Helper: recalculate batch status
function computeStatus(stokTersisa: number, beratMasuk: number, estimasiKadaluarsa: string): IHarvestBatch['status'] {
  const today = new Date();
  const expDate = new Date(estimasiKadaluarsa);
  const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (stokTersisa === 0) return 'habis';
  if (diffDays <= 3) return 'hampir_kadaluarsa';
  if (stokTersisa < beratMasuk * 0.2) return 'menipis';
  return 'aman';
}

import { IHarvestBatch } from '../models';

// ─── BATCH CRUD ────────────────────────────────────────────────────

// GET all batches
router.get('/', async (_req: Request, res: Response) => {
  try {
    const batches = await HarvestBatch.find().sort({ tanggalPanen: -1 });
    res.json({ success: true, data: batches });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data stok', error });
  }
});

// GET summary stats
router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const batches = await HarvestBatch.find();
    const totalStokSiapJual = batches
      .filter((b) => b.status !== 'habis')
      .reduce((sum, b) => sum + b.stokTersisa, 0);

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const weeklyMutations = await StockMutation.find({
      tipe: 'keluar',
      tanggal: { $gte: lastWeek.toISOString().split('T')[0] },
    });
    const stokTerjualMingguIni = weeklyMutations.reduce((sum, m) => sum + m.berat, 0);

    const estimasiNilaiStok = batches
      .filter((b) => b.status !== 'habis')
      .reduce((sum, b) => sum + b.stokTersisa * b.hargaJual, 0);

    const batchHampirKadaluarsa = batches.filter((b) => b.status === 'hampir_kadaluarsa').length;

    res.json({
      success: true,
      data: { totalStokSiapJual, stokTerjualMingguIni, estimasiNilaiStok, batchHampirKadaluarsa },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menghitung ringkasan stok', error });
  }
});

// POST create batch
router.post('/', async (req: Request, res: Response) => {
  try {
    const { tanggalPanen, grade, beratMasuk, hargaModal, hargaJual, lokasiPenyimpanan, estimasiKadaluarsa, catatan } = req.body;

    const count = await HarvestBatch.countDocuments();
    const batchCode = `BATCH-${String(count + 1).padStart(3, '0')}-${grade}`;
    const status = computeStatus(beratMasuk, beratMasuk, estimasiKadaluarsa);

    const batch = new HarvestBatch({
      batchCode, tanggalPanen, grade, beratMasuk, stokTersisa: beratMasuk,
      hargaModal, hargaJual, lokasiPenyimpanan, estimasiKadaluarsa, catatan, status,
    });
    await batch.save();

    // Record stock-in mutation
    await StockMutation.create({
      batchId: batch._id, batchCode, tipe: 'masuk', berat: beratMasuk, tanggal: tanggalPanen, catatan: 'Panen awal masuk gudang',
    });

    res.status(201).json({ success: true, data: batch, message: 'Batch panen berhasil dicatat' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menyimpan batch panen', error });
  }
});

// PUT update batch
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await HarvestBatch.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Batch tidak ditemukan' });
      return;
    }
    const updatedData = { ...req.body };
    if (updatedData.stokTersisa !== undefined) {
      updatedData.status = computeStatus(updatedData.stokTersisa, existing.beratMasuk, updatedData.estimasiKadaluarsa || existing.estimasiKadaluarsa);
    }
    const updated = await HarvestBatch.findByIdAndUpdate(req.params.id, updatedData, { new: true, runValidators: true });
    res.json({ success: true, data: updated, message: 'Batch berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui batch', error });
  }
});

// DELETE batch
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await HarvestBatch.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Batch tidak ditemukan' });
      return;
    }
    await StockMutation.deleteMany({ batchId: req.params.id });
    res.json({ success: true, message: 'Batch dan riwayat mutasinya berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menghapus batch', error });
  }
});

// ─── STOCK OUT ─────────────────────────────────────────────────────

// POST catat keluar stok
router.post('/:id/keluar', async (req: Request, res: Response) => {
  try {
    const { berat, tujuan, tanggal, catatan } = req.body;
    const batch = await HarvestBatch.findById(req.params.id);

    if (!batch) {
      res.status(404).json({ success: false, message: 'Batch tidak ditemukan' });
      return;
    }
    if (berat > batch.stokTersisa) {
      res.status(400).json({ success: false, message: `Stok tidak cukup. Tersisa: ${batch.stokTersisa} kg` });
      return;
    }

    batch.stokTersisa -= berat;
    batch.status = computeStatus(batch.stokTersisa, batch.beratMasuk, batch.estimasiKadaluarsa);
    await batch.save();

    const mutation = await StockMutation.create({
      batchId: batch._id, batchCode: batch.batchCode, tipe: 'keluar',
      berat, tujuan, tanggal, catatan,
    });

    res.status(201).json({ success: true, data: { batch, mutation }, message: 'Stok berhasil dikeluarkan' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mencatat keluar stok', error });
  }
});

// ─── MUTATIONS ─────────────────────────────────────────────────────

// GET riwayat mutasi (with optional filter: grade, tanggal start/end)
router.get('/mutations', async (req: Request, res: Response) => {
  try {
    const { grade, from, to } = req.query;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};
    if (from || to) {
      filter.tanggal = {};
      if (from) filter.tanggal.$gte = from as string;
      if (to) filter.tanggal.$lte = to as string;
    }
    let mutations = await StockMutation.find(filter).sort({ tanggal: -1, createdAt: -1 });
    if (grade && grade !== 'semua') {
      const batchCodes = (await HarvestBatch.find({ grade: grade as string })).map((b) => b.batchCode);
      mutations = mutations.filter((m) => batchCodes.includes(m.batchCode));
    }
    res.json({ success: true, data: mutations });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil riwayat mutasi', error });
  }
});

export default router;
