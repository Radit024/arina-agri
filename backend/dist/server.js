"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./env"); // Harus di atas import lain yang memakai process.env
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const ai_1 = __importDefault(require("./routes/ai"));
const notification_1 = __importDefault(require("./routes/notification"));
const news_1 = __importDefault(require("./routes/news"));
const notificationScheduler_1 = require("./services/notificationScheduler");
const newsScheduler_1 = require("./services/newsScheduler");
const priceScraper_1 = require("./services/priceScraper");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const corsAllowlist = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
// ─── Middleware ───────────────────────────────────────────────────
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (corsAllowlist.includes(origin))
            return callback(null, true);
        return callback(new Error(`CORS blocked: ${origin}`));
    },
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
app.use('/api/news', news_1.default);
(0, notificationScheduler_1.startScheduler)();
(0, newsScheduler_1.startNewsScheduler)();
(0, priceScraper_1.startPriceScraper)();
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
