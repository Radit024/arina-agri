import { beforeEach, describe, expect, it, vi } from 'vitest';

const from = vi.fn();
const resolveRequestUserId = vi.fn();

vi.mock('@/lib/server/auth/requestUser', () => ({
  resolveRequestUserId: (request: Request) => resolveRequestUserId(request),
}));

vi.mock('@/lib/server/supabaseAdmin', () => ({
  getSupabaseAdmin: () => ({ from }),
}));

const userId = '00000000-0000-4000-8000-000000000001';
const profileRow = {
  id: userId,
  full_name: 'Arina Developer',
  whatsapp_phone: '6281234567890',
  telegram_username: null,
  telegram_chat_id: '123456789',
};

describe('profile route', () => {
  beforeEach(() => {
    vi.resetModules();
    from.mockReset();
    resolveRequestUserId.mockReset();
  });

  it('returns 401 when authorization is missing', async () => {
    resolveRequestUserId.mockResolvedValue(null);
    const { PATCH } = await import('@/app/api/profile/route');

    const response = await PATCH(new Request('http://localhost/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ whatsappPhone: '081234567890' }),
    }));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ success: false, message: 'Unauthorized' });
    expect(from).not.toHaveBeenCalled();
  });

  it('inserts a profile row when update finds no existing profile', async () => {
    resolveRequestUserId.mockResolvedValue(userId);
    const updateMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateSelect = vi.fn(() => ({ maybeSingle: updateMaybeSingle }));
    const updateEq = vi.fn(() => ({ select: updateSelect }));
    const update = vi.fn(() => ({ eq: updateEq }));

    const insertSingle = vi.fn().mockResolvedValue({ data: profileRow, error: null });
    const insertSelect = vi.fn(() => ({ single: insertSingle }));
    const insert = vi.fn(() => ({ select: insertSelect }));
    from.mockReturnValue({ update, insert });

    const { PATCH } = await import('@/app/api/profile/route');
    const response = await PATCH(new Request('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { authorization: 'Bearer mock-token' },
      body: JSON.stringify({
        fullName: 'Arina Developer',
        whatsappPhone: '0812-3456-7890',
        telegramContact: '123456789',
      }),
    }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(updateSelect).toHaveBeenCalledWith('id,full_name,whatsapp_phone,telegram_username,telegram_chat_id');
    expect(update).toHaveBeenCalledWith({
      full_name: 'Arina Developer',
      whatsapp_phone: '6281234567890',
      telegram_username: null,
      telegram_chat_id: '123456789',
    });
    expect(insert).toHaveBeenCalledWith({
      id: userId,
      full_name: 'Arina Developer',
      whatsapp_phone: '6281234567890',
      telegram_username: null,
      telegram_chat_id: '123456789',
    });
    expect(json.data).toMatchObject({
      whatsappPhone: '6281234567890',
      telegramChatId: '123456789',
      telegramContact: '123456789',
    });
  });

  it('returns a 409 when a contact identity is already used by another profile', async () => {
    resolveRequestUserId.mockResolvedValue(userId);
    const updateMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    });
    const updateSelect = vi.fn(() => ({ maybeSingle: updateMaybeSingle }));
    const updateEq = vi.fn(() => ({ select: updateSelect }));
    const update = vi.fn(() => ({ eq: updateEq }));
    from.mockReturnValue({ update });

    const { PATCH } = await import('@/app/api/profile/route');
    const response = await PATCH(new Request('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { authorization: 'Bearer mock-token' },
      body: JSON.stringify({ telegramContact: '@petanimaju' }),
    }));
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json).toEqual({
      success: false,
      message: 'Nomor WhatsApp atau Telegram sudah dipakai profil lain.',
    });
  });
});
