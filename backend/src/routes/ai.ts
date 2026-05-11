import express from 'express';
import { generateGeminiReply, generateFinancialAnalysis } from '../services/gemini';
import { supabaseAdmin } from '../services/supabase';

const router = express.Router();

router.post('/gemini', async (req, res) => {
  try {
    const { prompt, history, userName } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt tidak boleh kosong.' });
    }

    let context = '';
    if (history && Array.isArray(history)) {
      context = history.map((msg: any) => `${msg.role === 'user' ? 'Petani' : 'Arina'}: ${msg.content}`).join('\n');
    }

    // Sisipkan informasi harga komoditas (Cabai Rawit) 7 hari terakhir sebagai konteks tambahan
    try {
      const { data: prices } = await supabaseAdmin
        .from('commodity_prices')
        .select('*')
        .eq('commodity', 'Cabe Rawit Merah')
        .order('date', { ascending: false })
        .limit(7);

      if (prices && prices.length > 0) {
        // Balik array agar berurutan dari terlama ke terbaru
        const sortedPrices = prices.reverse();
        const priceInfo = sortedPrices.map(p => `- ${p.date}: Rp ${p.price}`).join('\n');
        context += `\n\nINFO PASAR SAAT INI (Harga Cabai Rawit 7 hari terakhir):\n${priceInfo}\nGunakan info harga ini untuk memberikan saran proaktif terkait panen atau penjualan jika relevan dengan pertanyaan petani.`;
      }
    } catch (dbErr) {
      console.warn('[Gemini Context] Gagal memuat data harga dari Supabase:', dbErr);
    }

    const reply = await generateGeminiReply({ prompt, context, userName });
    
    return res.json({ 
      success: true, 
      message: 'OK', 
      data: { reply, model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' } 
    });
  } catch (error: any) {
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

    const analysis = await generateFinancialAnalysis({ reportData });
    
    return res.json({ 
      success: true, 
      message: 'OK', 
      data: { analysis, model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' } 
    });
  } catch (error: any) {
    console.error('[Gemini Error]', error.message);
    return res.status(500).json({ success: false, message: error.message || 'Gagal memanggil Gemini.' });
  }
});

export default router;
