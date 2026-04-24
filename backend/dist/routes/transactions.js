"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const models_1 = require("../models");
const router = (0, express_1.Router)();
// GET all transactions
router.get('/', async (_req, res) => {
    try {
        const transactions = await models_1.Transaction.find().sort({ tanggal: -1, createdAt: -1 });
        res.json({ success: true, data: transactions });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mengambil data transaksi', error });
    }
});
// POST create transaction
router.post('/', async (req, res) => {
    try {
        const { jenis, kategori, nominal, tanggal, keterangan } = req.body;
        if (!jenis || !kategori || !nominal || !tanggal) {
            res.status(400).json({ success: false, message: 'Field jenis, kategori, nominal, dan tanggal wajib diisi' });
            return;
        }
        const transaction = new models_1.Transaction({ jenis, kategori, nominal, tanggal, keterangan });
        await transaction.save();
        res.status(201).json({ success: true, data: transaction, message: 'Transaksi berhasil disimpan' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Gagal menyimpan transaksi', error });
    }
});
// PUT update transaction
router.put('/:id', async (req, res) => {
    try {
        const updated = await models_1.Transaction.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!updated) {
            res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
            return;
        }
        res.json({ success: true, data: updated, message: 'Transaksi berhasil diperbarui' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Gagal memperbarui transaksi', error });
    }
});
// DELETE transaction
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await models_1.Transaction.findByIdAndDelete(req.params.id);
        if (!deleted) {
            res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
            return;
        }
        res.json({ success: true, message: 'Transaksi berhasil dihapus' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Gagal menghapus transaksi', error });
    }
});
exports.default = router;
