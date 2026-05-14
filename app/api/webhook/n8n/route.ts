import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

const supabaseAdmin = getSupabaseAdmin();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body;

    const secret = req.headers.get('x-webhook-secret');
    const expectedSecret = process.env.N8N_WEBHOOK_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (!type || !data) {
      return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
    }

    let user_id = data.user_id;

    if (!user_id && data.telegram_chat_id) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('telegram_chat_id', data.telegram_chat_id)
        .single();

      if (profileError || !profile) {
        return NextResponse.json(
          { success: false, message: 'Akun Telegram ini belum dihubungkan ke Arina Agri.' },
          { status: 404 }
        );
      }
      user_id = profile.id;
    }

    if (!user_id) {
      return NextResponse.json(
        { success: false, message: 'user_id atau telegram_chat_id tidak ditemukan di payload' },
        { status: 400 }
      );
    }

    if (type === 'keuangan') {
      const { jenis, kategori, nominal, tanggal, keterangan } = data;

      const { data: result, error } = await supabaseAdmin
        .from('transactions')
        .insert([
          {
            user_id,
            jenis,
            kategori,
            nominal: Number(nominal),
            tanggal: tanggal || new Date().toISOString(),
            keterangan: keterangan || '',
          },
        ])
        .select();

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Keuangan tercatat', data: result });
    }

    if (type === 'stok') {
      const { batch_code, tipe, berat, tujuan, tanggal, catatan } = data;

      const { data: result, error } = await supabaseAdmin
        .from('stock_mutations')
        .insert([
          {
            user_id,
            batch_code,
            tipe,
            berat: Number(berat),
            tujuan: tujuan || null,
            tanggal: tanggal || new Date().toISOString(),
            catatan: catatan || '',
          },
        ])
        .select();

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Stok tercatat', data: result });
    }

    return NextResponse.json({ success: false, message: 'Unknown type' }, { status: 400 });
  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}