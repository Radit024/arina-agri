import './env'; // Harus di atas import lain yang memakai process.env
import express from 'express';
import cors from 'cors';
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

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Arina Agri AI Proxy Backend is running',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/ai', aiRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/news', newsRoutes);

startScheduler();
startNewsScheduler();
startPriceScraper();

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  void _next;
  console.error('[Global Error]', error instanceof Error ? error.message : error);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Arina Agri Backend berjalan di http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
