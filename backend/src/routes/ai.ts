import express from 'express';
import { generateGeminiReply, generateFinancialAnalysis } from '../services/gemini';

const router = express.Router();

router.post('/gemini', async (req, res) => {
  try {
    const { prompt, history } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt tidak boleh kosong.' });
    }

    let context = '';
    if (history && Array.isArray(history)) {
      context = history.map((msg: any) => `${msg.role === 'user' ? 'Petani' : 'Arina'}: ${msg.content}`).join('\n');
    }

    const reply = await generateGeminiReply({ prompt, context });
    
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
