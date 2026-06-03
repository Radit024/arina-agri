import './env'; // Harus di atas import lain yang memakai process.env
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import aiRoutes from './routes/ai';
import notificationRoutes from './routes/notification';
import newsRoutes from './routes/news';
import { startScheduler } from './services/notificationScheduler';
import { startNewsScheduler } from './services/newsScheduler';
import { startPriceScraper } from './services/priceScraper';



const app = express();
const PORT = process.env.PORT || 5000;

const corsAllowlist = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

// ─── Middleware ───────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (corsAllowlist.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Arina Agri AI Proxy Backend is running',
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes ───────────────────────────────────────────────────────
app.use('/api/ai', aiRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/news', newsRoutes);

startScheduler();
startNewsScheduler();
startPriceScraper();

// ─── 404 Handler ─────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});

// ─── Global Error Handler ────────────────────────────────────────
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error]', error.message || error);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// ─── Start Server ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Arina Agri Backend berjalan di http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
