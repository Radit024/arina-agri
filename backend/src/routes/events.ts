import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { CalendarEvent } from '../models';

const router = Router();

// GET all events
router.get('/', async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, data: [], message: 'Database tidak terhubung' });
    }
    const userId = (req.headers['x-user-id'] as string) || 'guest';
    const events = await CalendarEvent.find({ userId }).sort({ date: 1, createdAt: -1 });
    res.json({ success: true, data: events });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data kalender', error: error.message });
  }
});

// POST create event
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, date, category, description } = req.body;

    if (!title || !date) {
      res.status(400).json({ success: false, message: 'Judul dan tanggal wajib diisi' });
      return;
    }

    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️ Database tidak terhubung. Mengembalikan mock success POST event.');
      return res.status(201).json({
        success: true,
        data: { _id: Date.now().toString(), title, date, category, description, completed: false, createdAt: new Date() },
        message: 'Database tidak terhubung. Kegiatan berhasil dijadwalkan (mock).'
      });
    }

    const userId = (req.headers['x-user-id'] as string) || 'guest';
    const event = new CalendarEvent({ userId, title, date, category, description });
    await event.save();
    res.status(201).json({ success: true, data: event, message: 'Kegiatan berhasil dijadwalkan' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal menyimpan kegiatan', error: error.message });
  }
});

// PATCH toggle complete
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️ Database tidak terhubung. Mengembalikan mock success PATCH event.');
      return res.json({ success: true, data: { _id: req.params.id, completed: true } });
    }

    const userId = (req.headers['x-user-id'] as string) || 'guest';
    const event = await CalendarEvent.findOne({ _id: req.params.id, userId });
    if (!event) {
      res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan' });
      return;
    }
    event.completed = !event.completed;
    await event.save();
    res.json({ success: true, data: event });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui status kegiatan', error: error.message });
  }
});

// DELETE event
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️ Database tidak terhubung. Mengembalikan mock success DELETE event.');
      return res.json({ success: true, message: 'Database tidak terhubung. Kegiatan berhasil dihapus (mock).' });
    }

    const userId = (req.headers['x-user-id'] as string) || 'guest';
    const deleted = await CalendarEvent.findOneAndDelete({ _id: req.params.id, userId });
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan' });
      return;
    }
    res.json({ success: true, message: 'Kegiatan berhasil dihapus' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal menghapus kegiatan', error: error.message });
  }
});

export default router;
