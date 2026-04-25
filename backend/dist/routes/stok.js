"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const models_1 = require("../models");
const router = (0, express_1.Router)();
// Helper: recalculate batch status
function computeStatus(stokTersisa, beratMasuk, estimasiKadaluarsa) {
    const today = new Date();
    const expDate = new Date(estimasiKadaluarsa);
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (stokTersisa === 0)
        return 'habis';
    if (diffDays <= 3)
        return 'hampir_kadaluarsa';
    if (stokTersisa < beratMasuk * 0.2)
        return 'menipis';
    return 'aman';
}
// ─── BATCH CRUD ────────────────────────────────────────────────────
// GET all batches
router.get('/', async (req, res) => {
    try {
        if (mongoose_1.default.connection.readyState !== 1) {
            return res.json({ success: true, data: [], message: 'Database tidak terhubung' });
        }
        const userId = req.headers['x-user-id'] || 'guest';
        const batches = await models_1.HarvestBatch.find({ userId }).sort({ tanggalPanen: -1, createdAt: -1 });
        res.json({ success: true, data: batches });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mengambil data stok', error: error.message });
    }
});
// GET summary stats
router.get('/summary', async (req, res) => {
    try {
        if (mongoose_1.default.connection.readyState !== 1) {
            return res.json({
                success: true,
                data: { totalStokSiapJual: 0, stokTerjualMingguIni: 0, estimasiNilaiStok: 0, batchHampirKadaluarsa: 0 }
            });
        }
        const userId = req.headers['x-user-id'] || 'guest';
        const batches = await models_1.HarvestBatch.find({ userId });
        const totalStokSiapJual = batches
            .filter((b) => b.status !== 'habis')
            .reduce((sum, b) => sum + b.stokTersisa, 0);
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        const weeklyMutations = await models_1.StockMutation.find({
            userId,
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Gagal menghitung ringkasan stok', error: error.message });
    }
});
// POST create batch
router.post('/', async (req, res) => {
    try {
        const { tanggalPanen, grade, beratMasuk, hargaModal, hargaJual, lokasiPenyimpanan, estimasiKadaluarsa, catatan } = req.body;
        if (mongoose_1.default.connection.readyState !== 1) {
            console.warn('⚠️ Database tidak terhubung. Mengembalikan mock success POST stok.');
            const batchCode = `BATCH-999-${grade}`;
            const status = computeStatus(beratMasuk, beratMasuk, estimasiKadaluarsa);
            const batch = { _id: Date.now().toString(), batchCode, tanggalPanen, grade, beratMasuk, stokTersisa: beratMasuk, hargaModal, hargaJual, lokasiPenyimpanan, estimasiKadaluarsa, catatan, status, createdAt: new Date() };
            return res.status(201).json({ success: true, data: batch, message: 'Database tidak terhubung. Batch panen berhasil dicatat (mock).' });
        }
        const count = await models_1.HarvestBatch.countDocuments();
        const batchCode = `BATCH-${String(count + 1).padStart(3, '0')}-${grade}`;
        const status = computeStatus(beratMasuk, beratMasuk, estimasiKadaluarsa);
        const userId = req.headers['x-user-id'] || 'guest';
        const batch = new models_1.HarvestBatch({
            userId, batchCode, tanggalPanen, grade, beratMasuk, stokTersisa: beratMasuk,
            hargaModal, hargaJual, lokasiPenyimpanan, estimasiKadaluarsa, catatan, status,
        });
        await batch.save();
        // Record stock-in mutation
        await models_1.StockMutation.create({
            userId, batchId: batch._id, batchCode, tipe: 'masuk', berat: beratMasuk, tanggal: tanggalPanen, catatan: 'Panen awal masuk gudang',
        });
        res.status(201).json({ success: true, data: batch, message: 'Batch panen berhasil dicatat' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Gagal menyimpan batch panen', error: error.message });
    }
});
// PUT update batch
router.put('/:id', async (req, res) => {
    try {
        if (mongoose_1.default.connection.readyState !== 1) {
            console.warn('⚠️ Database tidak terhubung. Mengembalikan mock success PUT stok.');
            return res.json({ success: true, data: { _id: req.params.id, ...req.body }, message: 'Database tidak terhubung. Batch berhasil diperbarui (mock).' });
        }
        const userId = req.headers['x-user-id'] || 'guest';
        const existing = await models_1.HarvestBatch.findOne({ _id: req.params.id, userId });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Batch tidak ditemukan' });
            return;
        }
        const updatedData = { ...req.body };
        if (updatedData.stokTersisa !== undefined) {
            updatedData.status = computeStatus(updatedData.stokTersisa, existing.beratMasuk, updatedData.estimasiKadaluarsa || existing.estimasiKadaluarsa);
        }
        const updated = await models_1.HarvestBatch.findOneAndUpdate({ _id: req.params.id, userId }, updatedData, { new: true, runValidators: true });
        res.json({ success: true, data: updated, message: 'Batch berhasil diperbarui' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Gagal memperbarui batch', error: error.message });
    }
});
// DELETE batch
router.delete('/:id', async (req, res) => {
    try {
        if (mongoose_1.default.connection.readyState !== 1) {
            console.warn('⚠️ Database tidak terhubung. Mengembalikan mock success DELETE stok.');
            return res.json({ success: true, message: 'Database tidak terhubung. Batch berhasil dihapus (mock).' });
        }
        const userId = req.headers['x-user-id'] || 'guest';
        const deleted = await models_1.HarvestBatch.findOneAndDelete({ _id: req.params.id, userId });
        if (!deleted) {
            res.status(404).json({ success: false, message: 'Batch tidak ditemukan' });
            return;
        }
        await models_1.StockMutation.deleteMany({ batchId: req.params.id });
        res.json({ success: true, message: 'Batch dan riwayat mutasinya berhasil dihapus' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Gagal menghapus batch', error: error.message });
    }
});
// ─── STOCK OUT ─────────────────────────────────────────────────────
// POST catat keluar stok
router.post('/:id/keluar', async (req, res) => {
    try {
        const { berat, tujuan, tanggal, catatan } = req.body;
        if (mongoose_1.default.connection.readyState !== 1) {
            console.warn('⚠️ Database tidak terhubung. Mengembalikan mock success POST keluar stok.');
            return res.status(201).json({ success: true, data: { batch: { _id: req.params.id }, mutation: { _id: Date.now().toString() } }, message: 'Database tidak terhubung. Stok berhasil dikeluarkan (mock).' });
        }
        const userId = req.headers['x-user-id'] || 'guest';
        const batch = await models_1.HarvestBatch.findOne({ _id: req.params.id, userId });
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
        const mutation = await models_1.StockMutation.create({
            userId, batchId: batch._id, batchCode: batch.batchCode, tipe: 'keluar',
            berat, tujuan, tanggal, catatan,
        });
        res.status(201).json({ success: true, data: { batch, mutation }, message: 'Stok berhasil dikeluarkan' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mencatat keluar stok', error: error.message });
    }
});
// ─── MUTATIONS ─────────────────────────────────────────────────────
// GET riwayat mutasi (with optional filter: grade, tanggal start/end)
router.get('/mutations', async (req, res) => {
    try {
        if (mongoose_1.default.connection.readyState !== 1) {
            return res.json({ success: true, data: [] });
        }
        const { grade, from, to } = req.query;
        const userId = req.headers['x-user-id'] || 'guest';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filter = { userId };
        if (from || to) {
            filter.tanggal = {};
            if (from)
                filter.tanggal.$gte = from;
            if (to)
                filter.tanggal.$lte = to;
        }
        let mutations = await models_1.StockMutation.find(filter).sort({ tanggal: -1, createdAt: -1 });
        if (grade && grade !== 'semua') {
            const batchCodes = (await models_1.HarvestBatch.find({ grade: grade })).map((b) => b.batchCode);
            mutations = mutations.filter((m) => batchCodes.includes(m.batchCode));
        }
        res.json({ success: true, data: mutations });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mengambil riwayat mutasi', error: error.message });
    }
});
exports.default = router;
