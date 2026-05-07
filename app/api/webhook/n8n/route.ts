import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Gunakan Service Role Key agar backend bisa menulis data tanpa batasan RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body;

    // Keamanan: Cek secret jika dikonfigurasi
    const secret = req.headers.get('x-webhook-secret');
    const expectedSecret = process.env.N8N_WEBHOOK_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (!type || !data) {
      return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
    }

    let user_id = data.user_id;

    // Jika n8n hanya mengirim telegram_chat_id, kita cari user_id-nya di database
    if (!user_id && data.telegram_chat_id) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles') // Asumsi nama tabel user/profil adalah 'profiles'
        .select('id') // Asumsi primary key-nya 'id' yang sama dengan auth.users id
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
        .insert([{
          user_id,
          jenis,
          kategori,
          nominal: Number(nominal),
          tanggal: tanggal || new Date().toISOString(),
          keterangan: keterangan || '',
        }])
        .select();

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Keuangan tercatat', data: result });
    }

    if (type === 'stok') {
      const { batch_code, tipe, berat, tujuan, tanggal, catatan } = data;
      
      const { data: result, error } = await supabaseAdmin
        .from('stock_mutations')
        .insert([{
          user_id,
          batch_code,
          tipe,
          berat: Number(berat),
          tujuan: tujuan || null,
          tanggal: tanggal || new Date().toISOString(),
          catatan: catatan || '',
        }])
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
