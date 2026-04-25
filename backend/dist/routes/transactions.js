"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const models_1 = require("../models");
const router = (0, express_1.Router)();
// GET all transactions
router.get('/', async (req, res) => {
    try {
        // Check if database is connected (readyState 1 = connected)
        if (mongoose_1.default.connection.readyState !== 1) {
            console.warn('⚠️ Database tidak terhubung. Mengembalikan array kosong.');
            return res.json({
                success: true,
                data: [],
                message: 'Database tidak terhubung. Menampilkan data kosong.'
            });
        }
        const userId = req.headers['x-user-id'] || 'guest';
        const transactions = await models_1.Transaction.find({ userId }).sort({ tanggal: -1, createdAt: -1 });
        res.json({ success: true, data: transactions });
    }
    catch (error) {
        console.error('[Transactions Error]', error.message);
        res.status(500).json({ success: false, message: 'Gagal mengambil data transaksi', error: error.message });
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
        if (mongoose_1.default.connection.readyState !== 1) {
            console.warn('⚠️ Database tidak terhubung. Mengembalikan mock success POST.');
            return res.status(201).json({
                success: true,
                data: { _id: Date.now().toString(), jenis, kategori, nominal, tanggal, keterangan, createdAt: new Date() },
                message: 'Database tidak terhubung. Transaksi berhasil disimpan (mock).'
            });
        }
        const userId = req.headers['x-user-id'] || 'guest';
        const transaction = new models_1.Transaction({ userId, jenis, kategori, nominal, tanggal, keterangan });
        await transaction.save();
        res.status(201).json({ success: true, data: transaction, message: 'Transaksi berhasil disimpan' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Gagal menyimpan transaksi', error: error.message });
    }
});
// PUT update transaction
router.put('/:id', async (req, res) => {
    try {
        if (mongoose_1.default.connection.readyState !== 1) {
            console.warn('⚠️ Database tidak terhubung. Mengembalikan mock success PUT.');
            return res.json({
                success: true,
                data: { _id: req.params.id, ...req.body },
                message: 'Database tidak terhubung. Transaksi berhasil diperbarui (mock).'
            });
        }
        const userId = req.headers['x-user-id'] || 'guest';
        const updated = await models_1.Transaction.findOneAndUpdate({ _id: req.params.id, userId }, req.body, { new: true, runValidators: true });
        if (!updated) {
            res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
            return;
        }
        res.json({ success: true, data: updated, message: 'Transaksi berhasil diperbarui' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Gagal memperbarui transaksi', error: error.message });
    }
});
// DELETE transaction
router.delete('/:id', async (req, res) => {
    try {
        if (mongoose_1.default.connection.readyState !== 1) {
            console.warn('⚠️ Database tidak terhubung. Mengembalikan mock success DELETE.');
            return res.json({ success: true, message: 'Database tidak terhubung. Transaksi dihapus (mock).' });
        }
        const userId = req.headers['x-user-id'] || 'guest';
        const deleted = await models_1.Transaction.findOneAndDelete({ _id: req.params.id, userId });
        if (!deleted) {
            res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
            return;
        }
        res.json({ success: true, message: 'Transaksi berhasil dihapus' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Gagal menghapus transaksi', error: error.message });
    }
});
exports.default = router;
