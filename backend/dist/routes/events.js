"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const models_1 = require("../models");
const router = (0, express_1.Router)();
// GET all events
router.get('/', async (req, res) => {
    try {
        if (mongoose_1.default.connection.readyState !== 1) {
            return res.json({ success: true, data: [], message: 'Database tidak terhubung' });
        }
        const userId = req.headers['x-user-id'] || 'guest';
        const events = await models_1.CalendarEvent.find({ userId }).sort({ date: 1, createdAt: -1 });
        res.json({ success: true, data: events });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mengambil data kalender', error: error.message });
    }
});
// POST create event
router.post('/', async (req, res) => {
    try {
        const { title, date, category, description } = req.body;
        if (!title || !date) {
            res.status(400).json({ success: false, message: 'Judul dan tanggal wajib diisi' });
            return;
        }
        if (mongoose_1.default.connection.readyState !== 1) {
            console.warn('⚠️ Database tidak terhubung. Mengembalikan mock success POST event.');
            return res.status(201).json({
                success: true,
                data: { _id: Date.now().toString(), title, date, category, description, completed: false, createdAt: new Date() },
                message: 'Database tidak terhubung. Kegiatan berhasil dijadwalkan (mock).'
            });
        }
        const userId = req.headers['x-user-id'] || 'guest';
        const event = new models_1.CalendarEvent({ userId, title, date, category, description });
        await event.save();
        res.status(201).json({ success: true, data: event, message: 'Kegiatan berhasil dijadwalkan' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Gagal menyimpan kegiatan', error: error.message });
    }
});
// PATCH toggle complete
router.patch('/:id/toggle', async (req, res) => {
    try {
        if (mongoose_1.default.connection.readyState !== 1) {
            console.warn('⚠️ Database tidak terhubung. Mengembalikan mock success PATCH event.');
            return res.json({ success: true, data: { _id: req.params.id, completed: true } });
        }
        const userId = req.headers['x-user-id'] || 'guest';
        const event = await models_1.CalendarEvent.findOne({ _id: req.params.id, userId });
        if (!event) {
            res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan' });
            return;
        }
        event.completed = !event.completed;
        await event.save();
        res.json({ success: true, data: event });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Gagal memperbarui status kegiatan', error: error.message });
    }
});
// DELETE event
router.delete('/:id', async (req, res) => {
    try {
        if (mongoose_1.default.connection.readyState !== 1) {
            console.warn('⚠️ Database tidak terhubung. Mengembalikan mock success DELETE event.');
            return res.json({ success: true, message: 'Database tidak terhubung. Kegiatan berhasil dihapus (mock).' });
        }
        const userId = req.headers['x-user-id'] || 'guest';
        const deleted = await models_1.CalendarEvent.findOneAndDelete({ _id: req.params.id, userId });
        if (!deleted) {
            res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan' });
            return;
        }
        res.json({ success: true, message: 'Kegiatan berhasil dihapus' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Gagal menghapus kegiatan', error: error.message });
    }
});
exports.default = router;
