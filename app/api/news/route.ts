import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 10, 50);
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Use Service Role Key for server-side access (bypasses RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
