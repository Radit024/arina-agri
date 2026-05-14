import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 10, 50);
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = getSupabaseAdmin();

    const { data, error, count } = await supabase
      .from('news_articles')
      .select('*', { count: 'exact' })
      .order('pub_date', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('[API News] Supabase error:', error.message);
      return NextResponse.json({ success: false, message: 'Gagal mengambil data berita' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API News] Error:', message);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
