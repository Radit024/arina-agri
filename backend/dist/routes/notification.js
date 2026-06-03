"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notificationChannels_1 = require("../services/notificationChannels");
const notificationScheduler_1 = require("../services/notificationScheduler");
const notificationDecision_1 = require("../services/notificationDecision");
const router = (0, express_1.Router)();
function validateDecisionPayload(body) {
    if (!body || typeof body !== 'object') {
        return { valid: false, message: 'Payload tidak valid.' };
    }
    if (body.platform !== 'whatsapp' && body.platform !== 'telegram') {
        return { valid: false, message: 'platform harus "whatsapp" atau "telegram".' };
    }
    if (!body.to || typeof body.to !== 'string') {
        return { valid: false, message: 'Field "to" wajib diisi.' };
    }
    if (!body.weather || typeof body.weather !== 'object') {
        return { valid: false, message: 'Field "weather" wajib diisi.' };
    }
    const requiredWeatherFields = ['kondisi', 'suhu', 'kelembapan', 'curahHujan', 'kecepatanAngin'];
    for (const field of requiredWeatherFields) {
        if (body.weather[field] === undefined || body.weather[field] === null) {
            return { valid: false, message: `Field weather.${field} wajib diisi.` };
        }
    }
    const numericWeatherFields = ['suhu', 'kelembapan', 'curahHujan', 'kecepatanAngin'];
    for (const field of numericWeatherFields) {
        const value = Number(body.weather[field]);
        if (!Number.isFinite(value)) {
            return { valid: false, message: `Field weather.${field} harus berupa angka valid.` };
        }
    }
    if (typeof body.weather.kondisi !== 'string' || !body.weather.kondisi.trim()) {
        return { valid: false, message: 'Field weather.kondisi harus berupa teks yang valid.' };
    }
    return { valid: true };
}
function validateSchedulePayload(body) {
    if (!body || typeof body !== 'object') {
        return { valid: false, message: 'Payload tidak valid.' };
    }
    if (!body.time || typeof body.time !== 'string' || !(0, notificationScheduler_1.isValidScheduleTime)(body.time)) {
        return { valid: false, message: 'Field time harus berupa format HH:mm.' };
    }
    if (body.platform !== 'whatsapp' && body.platform !== 'telegram') {
        return { valid: false, message: 'platform harus "whatsapp" atau "telegram".' };
    }
    if (!body.to || typeof body.to !== 'string') {
        return { valid: false, message: 'Field "to" wajib diisi.' };
    }
    return { valid: true };
}
// Endpoint: POST /api/notification/send
router.post('/send', async (req, res) => {
    try {
        const { platform, to, message, metadata } = req.body;
        // Validasi input
        if (!platform || !to || !message) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: platform, to, message'
            });
        }
        if (platform !== 'whatsapp' && platform !== 'telegram') {
            return res.status(400).json({
                success: false,
                message: 'Invalid platform. Must be "whatsapp" atau "telegram"'
            });
        }
        // Panggil service channel langsung dari backend.
        const result = await (0, notificationChannels_1.sendDirectNotification)({ platform, to, message, metadata });
        if (!result.success) {
            return res.status(500).json({ success: false, message: result.error });
        }
        return res.status(200).json({
            success: true,
            message: 'Notification sent successfully via backend channel',
            data: result.data
        });
    }
    catch (error) {
        console.error('[Notification Route Error]', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
// Endpoint: GET /api/notification/schedule
// Mengambil konfigurasi jadwal notifikasi harian.
router.get('/schedule', (_req, res) => {
    const schedule = (0, notificationScheduler_1.getSchedule)();
    return res.status(200).json({
        success: true,
        message: 'Schedule loaded',
        data: schedule,
    });
});
// Endpoint: POST /api/notification/schedule
// Menyimpan jadwal notifikasi harian dan menjadwalkan ulang job.
router.post('/schedule', async (req, res) => {
    try {
        const validation = validateSchedulePayload(req.body);
        if (!validation.valid) {
            return res.status(400).json({ success: false, message: validation.message });
        }
        const payload = req.body;
        const updated = (0, notificationScheduler_1.saveSchedule)({
            enabled: Boolean(payload.enabled),
            time: payload.time,
            timezone: payload.timezone || 'Asia/Jakarta',
            platform: payload.platform,
            to: payload.to,
            recipientName: payload.recipientName || 'Petani',
            customMessage: payload.customMessage,
            userId: payload.userId,
        });
        (0, notificationScheduler_1.reschedule)(updated);
        return res.status(200).json({
            success: true,
            message: 'Schedule updated',
            data: updated,
        });
    }
    catch (error) {
        console.error('[Notification Schedule Error]', error);
        return res.status(500).json({ success: false, message: 'Gagal menyimpan jadwal notifikasi.' });
    }
});
// Endpoint: POST /api/notification/decide
// Menjalankan hybrid AI decision system (rule-based + Gemini) tanpa mengirim pesan.
router.post('/decide', async (req, res) => {
    try {
        const validation = validateDecisionPayload(req.body);
        if (!validation.valid) {
            return res.status(400).json({ success: false, message: validation.message });
        }
        const payload = req.body;
        const decision = await (0, notificationDecision_1.buildNotificationDecision)(payload);
        return res.status(200).json({
            success: true,
            message: 'Decision generated successfully',
            data: decision,
        });
    }
    catch (error) {
        console.error('[Notification Decide Error]', error);
        return res.status(500).json({ success: false, message: 'Gagal menghasilkan keputusan notifikasi.' });
    }
});
// Endpoint: POST /api/notification/decide-send
// Menjalankan decision system, lalu mengirim ke channel tujuan jika shouldSend = true.
router.post('/decide-send', async (req, res) => {
    try {
        const validation = validateDecisionPayload(req.body);
        if (!validation.valid) {
            return res.status(400).json({ success: false, message: validation.message });
        }
        const payload = req.body;
        const decision = await (0, notificationDecision_1.buildNotificationDecision)(payload);
        if (!decision.shouldSend) {
            return res.status(200).json({
                success: true,
                message: 'Notifikasi tidak dikirim karena kondisi belum memenuhi aturan.',
                data: {
                    sent: false,
                    decision,
                },
            });
        }
        const sendResult = await (0, notificationChannels_1.sendDirectNotification)(decision.payload);
        if (!sendResult.success) {
            return res.status(500).json({
                success: false,
                message: sendResult.error || 'Gagal meneruskan notifikasi ke channel tujuan.',
                data: {
                    sent: false,
                    decision,
                },
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Keputusan berhasil dibuat dan notifikasi diteruskan ke channel tujuan.',
            data: {
                sent: true,
                decision,
                channel: sendResult.data,
            },
        });
    }
    catch (error) {
        console.error('[Notification DecideSend Error]', error);
        return res.status(500).json({ success: false, message: 'Gagal memproses notifikasi berbasis AI decision system.' });
    }
});
exports.default = router;
