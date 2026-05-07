import express from 'express';
import { supabaseAdmin } from '../services/supabase';

const router = express.Router();

/**
 * Webhook untuk menerima data dari n8n (dari Telegram Bot)
 * 
 * Flow:
 * 1. User chat Telegram
 * 2. n8n ekstrak informasi menggunakan AI
 * 3. n8n mengirim POST request ke endpoint ini
 */
router.post('/n8n', async (req, res) => {
  try {
    const { type, data } = req.body;

    // Pastikan request dari sumber yang valid (n8n)
    const secret = req.headers['x-webhook-secret'];
    const expectedSecret = process.env.N8N_WEBHOOK_SECRET;
    
    if (expectedSecret && secret !== expectedSecret) {
      return res.status(401).json({ success: false, message: 'Unauthorized webhook' });
    }

    if (!type || !data) {
      return res.status(400).json({ success: false, message: 'Invalid payload: type and data are required' });
    }

    // -- Pencatatan Keuangan --
    if (type === 'keuangan') {
      const { user_id, jenis, kategori, nominal, tanggal, keterangan } = data;

      if (!user_id || !jenis || !kategori || !nominal) {
        return res.status(400).json({ success: false, message: 'Missing required fields for keuangan' });
      }

      const { data: result, error } = await supabaseAdmin
        .from('transactions')
        .insert([{
          user_id,
          jenis,
          kategori,
          nominal: Number(nominal),
          tanggal: tanggal || new Date().toISOString(),
          keterangan: keterangan || '',
        }])
        .select();

      if (error) {
        console.error('[N8N Webhook] Error inserting keuangan:', error);
        return res.status(500).json({ success: false, message: 'Gagal mencatat keuangan ke database', error: error.message });
      }

      return res.status(200).json({ success: true, message: 'Pencatatan keuangan berhasil', data: result });
    }

    // -- Pencatatan Stok (Panen / Penjualan / dsb) --
    if (type === 'stok') {
      const { user_id, batch_id, batch_code, tipe, berat, tujuan, tanggal, catatan } = data;

      if (!user_id || !tipe || !berat) {
        return res.status(400).json({ success: false, message: 'Missing required fields for stok' });
      }

      const { data: result, error } = await supabaseAdmin
        .from('stock_mutations')
        .insert([{
          user_id,
          batch_id, // Opsional jika n8n tidak tahu batch_id pastinya
          batch_code,
          tipe,
          berat: Number(berat),
          tujuan: tujuan || null,
          tanggal: tanggal || new Date().toISOString(),
          catatan: catatan || '',
        }])
        .select();

      if (error) {
        console.error('[N8N Webhook] Error inserting stok:', error);
        return res.status(500).json({ success: false, message: 'Gagal mencatat stok ke database', error: error.message });
      }

      // Opsional: Jika mencatat stok keluar, kita bisa menambahkan logika update sisa stok di tabel harvest_batches
      
      return res.status(200).json({ success: true, message: 'Pencatatan stok berhasil', data: result });
    }

    return res.status(400).json({ success: false, message: 'Tipe pencatatan tidak dikenali. Gunakan "keuangan" atau "stok".' });

  } catch (error: any) {
    console.error('[N8N Webhook Error]', error.message || error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

export default router;
