import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { sendDirectNotification } from '@/lib/server/notifications/channels';
import {
  addFinanceCategoryAliases,
  createFinanceCategory,
  formatFinanceCategoryList,
  listFinanceCategoriesForUser,
} from '@/lib/server/finance/categories';
import { resolveChatUser } from './identity';
import { HELP_TEXT, WELCOME_TEXT, parseChatInput } from './parser';
import { recordFinanceCommand, recordStockInCommand, recordStockOutCommand } from './records';
import { buildBriefingText } from './briefing';
import type { CategoryCommand, InboundChatMessage, ProcessChatInputResult, ResolvedChatUser, UtilityCommand } from './types';

interface FinanceSummaryRow {
  jenis?: string | null;
  nominal?: number | string | null;
}

interface StockSummaryRow {
  status?: string | null;
  stok_tersisa?: number | string | null;
}

interface BatchListRow {
  batch_code?: string | null;
  grade?: string | null;
  stok_tersisa?: number | string | null;
  status?: string | null;
}

interface InboundMessageLogRow {
  id: string;
}

async function sendReply(message: InboundChatMessage, text: string): Promise<void> {
  await sendDirectNotification({
    platform: message.channel,
    to: message.replyTo,
    message: text,
    metadata: {
      source: 'chat-input',
      externalMessageId: message.externalMessageId,
    },
  });
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function buildConnectionText(message: InboundChatMessage) {
  if (message.channel === 'telegram') {
    const usernameLine = message.senderDisplayName
      ? `Username Telegram terdeteksi: @${message.senderDisplayName.replace(/^@/, '')}`
      : 'Pastikan akun Telegram Anda memiliki username.';

    return [
      'Panduan hubungkan Telegram ke Arina Agri:',
      '1. Buka aplikasi Arina Agri.',
      '2. Masuk ke Pengaturan > Profil.',
      '3. Isi username Telegram Anda, lalu simpan.',
      '4. Kirim /profil untuk cek status koneksi.',
      '',
      `Chat ID Telegram Anda: ${message.senderId}`,
      usernameLine,
    ].join('\n');
  }

  return [
    'Panduan hubungkan WhatsApp ke Arina Agri:',
    '1. Buka aplikasi Arina Agri.',
    '2. Masuk ke Pengaturan > Profil.',
    '3. Isi nomor WhatsApp yang sama dengan nomor ini.',
    '4. Simpan, lalu kirim /profil untuk cek status koneksi.',
    '',
    `Nomor WhatsApp Anda: ${message.senderId}`,
  ].join('\n');
}

async function resolveUtilityUser(
  supabase: SupabaseClient,
  message: InboundChatMessage,
): Promise<ResolvedChatUser | null> {
  return resolveChatUser(
    supabase,
    message.channel,
    message.senderId,
    message.senderDisplayName,
  );
}

async function buildSummaryText(supabase: SupabaseClient, userId: string, now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [transactionsResult, batchesResult] = await Promise.all([
    supabase
      .from('transactions')
      .select('jenis,nominal')
      .eq('user_id', userId)
      .gte('tanggal', start)
      .lte('tanggal', end),
    supabase
      .from('harvest_batches')
      .select('stok_tersisa,status')
      .eq('user_id', userId),
  ]);

  if (transactionsResult.error) throw new Error(transactionsResult.error.message);
  if (batchesResult.error) throw new Error(batchesResult.error.message);

  const transactions = (transactionsResult.data ?? []) as FinanceSummaryRow[];
  const batches = (batchesResult.data ?? []) as StockSummaryRow[];
  const pemasukan = transactions
    .filter((row) => row.jenis === 'pendapatan')
    .reduce((sum, row) => sum + Number(row.nominal || 0), 0);
  const pengeluaran = transactions
    .filter((row) => row.jenis === 'pengeluaran')
    .reduce((sum, row) => sum + Number(row.nominal || 0), 0);
  const stokTersisa = batches
    .filter((row) => row.status !== 'habis')
    .reduce((sum, row) => sum + Number(row.stok_tersisa || 0), 0);

  return [
    'Ringkasan bulan ini:',
    `Pemasukan: ${formatRupiah(pemasukan)}`,
    `Pengeluaran: ${formatRupiah(pengeluaran)}`,
    `Laba bersih: ${formatRupiah(pemasukan - pengeluaran)}`,
    `Stok aktif: ${stokTersisa} kg`,
  ].join('\n');
}

async function buildBatchText(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('harvest_batches')
    .select('batch_code,grade,stok_tersisa,status')
    .eq('user_id', userId)
    .order('tanggal_panen', { ascending: false })
    .limit(5);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as BatchListRow[];
  if (rows.length === 0) {
    return [
      'Belum ada batch stok.',
      'Gunakan format:',
      '/stok_masuk 50kg A modal 18000 jual 25000 gudang utama exp 2026-06-20',
    ].join('\n');
  }

  return [
    'Batch stok terakhir:',
    ...rows.map((row) => `${row.batch_code} - grade ${row.grade}, sisa ${row.stok_tersisa} kg, status ${row.status}`),
    '',
    'Gunakan kode batch untuk /stok_keluar.',
  ].join('\n');
}

async function handleUtilityCommand(
  supabase: SupabaseClient,
  message: InboundChatMessage,
  command: UtilityCommand,
  now: Date,
): Promise<ProcessChatInputResult> {
  let replyText = '';

  if (command.name === 'start') replyText = WELCOME_TEXT;
  if (command.name === 'help') replyText = HELP_TEXT;
  if (command.name === 'hubungkan') replyText = buildConnectionText(message);

  if (command.name === 'batal') {
    replyText = 'Tidak ada proses bertahap yang perlu dibatalkan. Setiap command Arina Agri langsung diproses jika formatnya valid.';
  }

  if (command.name === 'profil') {
    const user = await resolveUtilityUser(supabase, message);
    replyText = user
      ? `Akun terhubung.\nNama: ${user.displayName}\nChannel: ${message.channel === 'telegram' ? 'Telegram' : 'WhatsApp'}`
      : buildConnectionText(message);
  }

  if (command.name === 'ringkasan') {
    const user = await resolveUtilityUser(supabase, message);
    if (!user) {
      replyText = buildConnectionText(message);
    } else {
      try {
        replyText = await buildSummaryText(supabase, user.id, now);
      } catch (error) {
        replyText = `Gagal memuat ringkasan: ${error instanceof Error ? error.message : 'terjadi kesalahan.'}`;
      }
    }
  }

  if (command.name === 'batch') {
    const user = await resolveUtilityUser(supabase, message);
    if (!user) {
      replyText = [
        'Format kode batch: BATCH-001-A',
        'Contoh stok keluar:',
        '/stok_keluar BATCH-001-A 20kg pasar lokal kirim pagi',
        '',
        'Hubungkan akun untuk melihat daftar batch aktif.',
      ].join('\n');
    } else {
      try {
        replyText = await buildBatchText(supabase, user.id);
      } catch (error) {
        replyText = `Gagal memuat batch: ${error instanceof Error ? error.message : 'terjadi kesalahan.'}`;
      }
    }
  }

  if (command.name === 'briefing') {
    const user = await resolveUtilityUser(supabase, message);
    if (!user) {
      replyText = buildConnectionText(message);
    } else if (!command.args) {
      replyText = [
        'Silakan pilih rentang waktu laporan cerdas Anda:',
        '',
        '/briefing hari ini',
        '/briefing minggu ini',
      ].join('\n');
    } else {
      const range = command.args as 'hari ini' | 'minggu ini';
      try {
        replyText = await buildBriefingText(supabase, user.id, user.displayName, range, now);
      } catch (error) {
        replyText = `Gagal memuat briefing: ${error instanceof Error ? error.message : 'terjadi kesalahan.'}`;
      }
    }
  }

  await sendReply(message, replyText);
  return { success: true, status: 'ignored', replyText };
}

async function handleCategoryCommand(
  supabase: SupabaseClient,
  userId: string,
  command: CategoryCommand,
): Promise<{ data: unknown; summary: string }> {
  if (command.type === 'category_list') {
    const categories = await listFinanceCategoriesForUser(supabase, userId, command.jenis);
    return {
      data: categories,
      summary: formatFinanceCategoryList(categories, command.jenis),
    };
  }

  if (command.type === 'category_create') {
    const category = await createFinanceCategory(supabase, userId, command);
    return {
      data: category,
      summary: `Kategori ${category.label} berhasil ditambahkan. Alias: ${category.aliases.join(', ') || '-'}`,
    };
  }

  const category = await addFinanceCategoryAliases(supabase, userId, command);
  return {
    data: category,
    summary: `Alias kategori ${category.label} berhasil diperbarui: ${category.aliases.join(', ') || '-'}`,
  };
}

export async function processInboundChatMessage(
  message: InboundChatMessage,
): Promise<ProcessChatInputResult> {
  const supabase = getSupabaseAdmin();
  const now = new Date(message.receivedAt);
  const parsed = parseChatInput(message.text);

  if (parsed.ok && parsed.command.type === 'utility') {
    return handleUtilityCommand(supabase, message, parsed.command, now);
  }

  if (!parsed.ok) {
    await sendReply(message, parsed.message);
    return { success: true, status: 'ignored', replyText: parsed.message };
  }

  const user = await resolveChatUser(
    supabase,
    message.channel,
    message.senderId,
    message.senderDisplayName,
  );

  if (!user) {
    const platform = message.channel === 'telegram' ? 'Telegram' : 'WhatsApp';
    const replyText =
      `Akun ${platform} ini belum terhubung ke Arina Agri. ` +
      `Silakan masukkan ${platform === 'Telegram' ? 'username Telegram' : 'nomor WhatsApp'} ` +
      'Anda di halaman Pengaturan > Profil pada aplikasi Arina Agri.';

    await sendReply(message, replyText);
    return { success: true, status: 'ignored', replyText };
  }

  const { data: logRow, error: logError } = await supabase
    .from('inbound_message_logs')
    .insert({
      channel: message.channel,
      external_message_id: message.externalMessageId,
      user_id: user.id,
      sender_id: message.senderId,
      raw_text: message.text,
      status: 'received',
    })
    .select()
    .single();

  if (logError) {
    const duplicateText = 'Pesan ini sudah pernah diproses.';
    await sendReply(message, duplicateText);
    return { success: true, status: 'ignored', replyText: duplicateText };
  }

  try {
    const command = parsed.command;
    let result: { data: unknown; summary: string };

    if (command.type === 'finance') {
      result = await recordFinanceCommand(supabase, user.id, command, now);
    } else if (command.type === 'stock_in') {
      result = await recordStockInCommand(supabase, user.id, command, now);
    } else if (command.type === 'stock_out') {
      result = await recordStockOutCommand(supabase, user.id, command, now);
    } else if (
      command.type === 'category_list' ||
      command.type === 'category_create' ||
      command.type === 'category_alias'
    ) {
      result = await handleCategoryCommand(supabase, user.id, command);
    } else {
      throw new Error('Command utilitas tidak bisa dicatat sebagai transaksi.');
    }

    await supabase
      .from('inbound_message_logs')
      .update({
        command_type: parsed.command.type,
        status: 'processed',
        response_text: result.summary,
        processed_at: now.toISOString(),
      })
      .eq('id', (logRow as InboundMessageLogRow).id);

    await sendReply(message, result.summary);
    return { success: true, status: 'processed', replyText: result.summary };
  } catch (error) {
    const replyText = error instanceof Error ? error.message : 'Gagal memproses pesan.';

    await supabase
      .from('inbound_message_logs')
      .update({
        command_type: parsed.command.type,
        status: 'failed',
        error_message: replyText,
        response_text: replyText,
        processed_at: now.toISOString(),
      })
      .eq('id', (logRow as InboundMessageLogRow).id);

    await sendReply(message, `Gagal: ${replyText}`);
    return { success: false, status: 'failed', replyText };
  }
}
