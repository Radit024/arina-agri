import { NextResponse } from 'next/server';
import { resolveRequestUserId } from '@/lib/server/auth/requestUser';

export interface GuardOptions {
  /** Endpoint ini wajib punya pengguna terautentikasi. */
  requireAuth?: boolean;
  /** Batas ukuran body mentah dalam byte. Berlaku bila `maxBodyBytes` diisi. */
  maxBodyBytes?: number;
}

export interface GuardContext {
  userId: string | null;
  /** Body yang sudah dibaca dan di-parse. Null bila memang tidak ada body. */
  body: unknown;
}

/**
 * Menjalankan pemeriksaan lease yang konsisten untuk seluruh route:
 * resolusi user dan batas ukuran body.
 *
 * Rate limit TIDAK dilakukan di sini: proxy sudah menerapkannya lebih awal
 * dengan identitas yang sama untuk seluruh request. Menerapkannya di kedua
 * tempat akan menghitung satu request dua kali lewat dua counter berbeda.
 *
 * Mengembalikan respons error bila gagal, atau konteks bila lolos.
 */
export async function guardRequest(
  request: Request,
  options: GuardOptions = {},
): Promise<{ response: NextResponse } | { context: GuardContext }> {
  const userId = await resolveRequestUserId(request);

  if (options.requireAuth && !userId) {
    return {
      response: NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      ),
    };
  }

  const { maxBodyBytes } = options;
  if (!maxBodyBytes) {
    return { context: { userId, body: undefined } };
  }

  const raw = await request.text();
  if (raw.length > maxBodyBytes) {
    return {
      response: NextResponse.json(
        { success: false, message: 'Data yang dikirim terlalu besar.' },
        { status: 413, headers: { 'Cache-Control': 'no-store' } },
      ),
    };
  }

  if (!raw.trim()) {
    return { context: { userId, body: undefined } };
  }

  try {
    return { context: { userId, body: JSON.parse(raw) } };
  } catch {
    return {
      response: NextResponse.json(
        { success: false, message: 'Format data tidak valid.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      ),
    };
  }
}