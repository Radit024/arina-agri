import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Transaction } from '../models';

const router = Router();

// GET all transactions
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Check if database is connected (readyState 1 = connected)
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️ Database tidak terhubung. Mengembalikan array kosong.');
      return res.json({ 
        success: true, 
        data: [], 
        message: 'Database tidak terhubung. Menampilkan data kosong.' 
      });
    }

    const transactions = await Transaction.find().sort({ tanggal: -1, createdAt: -1 });
    res.json({ success: true, data: transactions });
  } catch (error: any) {
    console.error('[Transactions Error]', error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil data transaksi', error: error.message });
  }
});

// POST create transaction
router.post('/', async (req: Request, res: Response) => {
  try {
    const { jenis, kategori, nominal, tanggal, keterangan } = req.body;

    if (!jenis || !kategori || !nominal || !tanggal) {
      res.status(400).json({ success: false, message: 'Field jenis, kategori, nominal, dan tanggal wajib diisi' });
      return;
    }

    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️ Database tidak terhubung. Mengembalikan mock success POST.');
      return res.status(201).json({
        success: true,
        data: { _id: Date.now().toString(), jenis, kategori, nominal, tanggal, keterangan, createdAt: new Date() },
        message: 'Database tidak terhubung. Transaksi berhasil disimpan (mock).'
      });
    }

    const transaction = new Transaction({ jenis, kategori, nominal, tanggal, keterangan });
    await transaction.save();
    res.status(201).json({ success: true, data: transaction, message: 'Transaksi berhasil disimpan' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal menyimpan transaksi', error: error.message });
  }
});

// PUT update transaction
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️ Database tidak terhubung. Mengembalikan mock success PUT.');
      return res.json({
        success: true,
        data: { _id: req.params.id, ...req.body },
        message: 'Database tidak terhubung. Transaksi berhasil diperbarui (mock).'
      });
    }

    const updated = await Transaction.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
      return;
    }
    res.json({ success: true, data: updated, message: 'Transaksi berhasil diperbarui' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui transaksi', error: error.message });
  }
});

// DELETE transaction
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️ Database tidak terhubung. Mengembalikan mock success DELETE.');
      return res.json({ success: true, message: 'Database tidak terhubung. Transaksi dihapus (mock).' });
    }

    const deleted = await Transaction.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
      return;
    }
    res.json({ success: true, message: 'Transaksi berhasil dihapus' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal menghapus transaksi', error: error.message });
  }
});

export default router;
