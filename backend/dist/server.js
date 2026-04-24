"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const transactions_1 = __importDefault(require("./routes/transactions"));
const stok_1 = __importDefault(require("./routes/stok"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/arina-agri';
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
        message: 'Arina Agri Backend is running',
        timestamp: new Date().toISOString(),
        dbStatus: mongoose_1.default.connection.readyState === 1 ? 'connected' : 'disconnected',
    });
});
// ─── Routes ───────────────────────────────────────────────────────
app.use('/api/transactions', transactions_1.default);
app.use('/api/stok', stok_1.default);
// ─── 404 Handler ─────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});
// ─── Connect to MongoDB & Start ───────────────────────────────────
async function startServer() {
    try {
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('✅ MongoDB terhubung:', MONGODB_URI);
        app.listen(PORT, () => {
            console.log(`Arina Agri Backend berjalan di http://localhost:${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/api/health`);
        });
    }
    catch (error) {
        console.error('❌ Gagal terhubung ke MongoDB:', error);
        process.exit(1);
    }
}
startServer();
