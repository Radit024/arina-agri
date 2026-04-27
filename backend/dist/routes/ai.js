"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const gemini_1 = require("../services/gemini");
const router = express_1.default.Router();
router.post('/gemini', async (req, res) => {
    try {
        const { prompt, history, userName } = req.body;
        if (!prompt) {
            return res.status(400).json({ success: false, message: 'Prompt tidak boleh kosong.' });
        }
        let context = '';
        if (history && Array.isArray(history)) {
            context = history.map((msg) => `${msg.role === 'user' ? 'Petani' : 'Arina'}: ${msg.content}`).join('\n');
        }
        const reply = await (0, gemini_1.generateGeminiReply)({ prompt, context, userName });
        return res.json({
            success: true,
            message: 'OK',
            data: { reply, model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' }
        });
    }
    catch (error) {
        console.error('[Gemini Error]', error.message);
        return res.status(500).json({ success: false, message: error.message || 'Gagal memanggil Gemini.' });
    }
});
router.post('/financial-report', async (req, res) => {
    try {
        const reportData = req.body;
        if (!reportData || !reportData.periode) {
            return res.status(400).json({ success: false, message: 'Data laporan tidak lengkap.' });
        }
        const analysis = await (0, gemini_1.generateFinancialAnalysis)({ reportData });
        return res.json({
            success: true,
            message: 'OK',
            data: { analysis, model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' }
        });
    }
    catch (error) {
        console.error('[Gemini Error]', error.message);
        return res.status(500).json({ success: false, message: error.message || 'Gagal memanggil Gemini.' });
    }
});
exports.default = router;
