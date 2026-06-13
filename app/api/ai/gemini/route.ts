import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { generateGeminiReply } from '@/lib/server/ai/gemini';
import { validateGeminiPayload } from '@/lib/server/ai/validators';
import type { GeminiWeatherContext } from '@/lib/server/ai/gemini';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface GeminiHistoryMessage {
  role: 'user' | 'ai';
  content: string;
}

interface GeminiRoutePayload {
  prompt: string;
  history?: GeminiHistoryMessage[];
  userName?: string;
  weatherContext?: GeminiWeatherContext;
}

function shouldIncludeMarketInfo(prompt: string) {
  if (!prompt || typeof prompt !== 'string') return false;
  const normalized = prompt.toLowerCase();
  const marketKeywords = [
    'harga',
    'pasar',
    'jual',
    'penjualan',
    'harga cabe',
    'harga cabai',
    'harga cabai rawit',
    'harga hari ini',
    'harga terkini',
    'harga terbaru',
    'komoditas',
    'naik turun harga',
    'trend harga',
    'tren harga',
  ];

  for (let i = 0; i < marketKeywords.length; i++) {
    if (normalized.indexOf(marketKeywords[i]) !== -1) {
      return true;
    }
  }

  return false;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateGeminiPayload(body);
    if (!validation.valid) {
      return NextResponse.json({ success: false, message: validation.message }, { status: 400 });
    }

    const { prompt, history, userName, weatherContext } = body as GeminiRoutePayload;

    let context = '';
    if (history && history.length > 0) {
      context = history.map((msg) => `${msg.role === 'user' ? 'Petani' : 'Arina'}: ${msg.content}`).join('\n');
    }

    if (shouldIncludeMarketInfo(prompt)) {
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
          context += `\n\nINFO PASAR SAAT INI (Harga Cabai Rawit 7 hari terakhir):\n${priceInfo}\nGunakan info harga ini hanya jika diminta atau relevan langsung dengan pertanyaan petani.`;
        }
      } catch (dbErr) {
        console.warn('[Gemini Context] Gagal memuat data harga dari Supabase:', dbErr);
      }
    }

    const reply = await generateGeminiReply({ prompt, context, userName, weatherContext });

    return NextResponse.json({
      success: true,
      message: 'OK',
      data: { reply, model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memanggil Gemini.';
    console.error('[Gemini Error]', message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
