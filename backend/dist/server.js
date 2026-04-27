"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const ai_1 = __importDefault(require("./routes/ai"));
const notification_1 = __importDefault(require("./routes/notification"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// ─── Middleware ───────────────────────────────────────────────────
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// ─── Health Check ─────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({
        success: true,
        message: 'Arina Agri AI Proxy Backend is running',
        timestamp: new Date().toISOString(),
    });
});
// ─── Routes ───────────────────────────────────────────────────────
app.use('/api/ai', ai_1.default);
app.use('/api/notification', notification_1.default);
// ─── 404 Handler ─────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});
// ─── Global Error Handler ────────────────────────────────────────
app.use((error, req, res, next) => {
    console.error('[Global Error]', error.message || error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
});
// ─── Start Server ────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`Arina Agri Backend berjalan di http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});
