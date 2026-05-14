import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { generateGeminiReply } from '@/lib/server/ai/gemini';
import { validateGeminiPayload } from '@/lib/server/ai/validators';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateGeminiPayload(body);
    if (!validation.valid) {
      return NextResponse.json({ success: false, message: validation.message }, { status: 400 });
    }

    const { prompt, history, userName } = body;

    let context = '';
    if (history && Array.isArray(history)) {
      context = history.map((msg: any) => `${msg.role === 'user' ? 'Petani' : 'Arina'}: ${msg.content}`).join('\n');
    }

    try {
      const supabase = getSupabaseAdmin();
      const { data: prices } = await supabase
        .from('commodity_prices')
        .select('*')
        .eq('commodity', 'Cabe Rawit Merah')
        .order('date', { ascending: false })
        .limit(7);

      if (prices && prices.length > 0) {
        const sortedPrices = prices.reverse();
        const priceInfo = sortedPrices.map((p) => `- ${p.date}: Rp ${p.price}`).join('\n');
        context += `\n\nINFO PASAR SAAT INI (Harga Cabai Rawit 7 hari terakhir):\n${priceInfo}\nGunakan info harga ini untuk memberikan saran proaktif terkait panen atau penjualan jika relevan dengan pertanyaan petani.`;
      }
    } catch (dbErr) {
      console.warn('[Gemini Context] Gagal memuat data harga dari Supabase:', dbErr);
    }

    const reply = await generateGeminiReply({ prompt, context, userName });

    return NextResponse.json({
      success: true,
      message: 'OK',
      data: { reply, model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' },
    });
  } catch (error: any) {
    console.error('[Gemini Error]', error.message);
    return NextResponse.json({ success: false, message: error.message || 'Gagal memanggil Gemini.' }, { status: 500 });
  }
}