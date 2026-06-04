import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Module Mocks ─────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
  sendDirectNotification: vi.fn(),
}));

vi.mock('@/lib/server/supabaseAdmin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

vi.mock('@/lib/server/notifications/channels', () => ({
  sendDirectNotification: mocks.sendDirectNotification,
}));

// ─── Mock Builders ────────────────────────────────────────────────────────────

function makeProfileSupabase(profile: unknown | null) {
  const single = vi.fn(async () =>
    profile
      ? { data: profile, error: null }
      : { data: null, error: { message: 'No rows found' } },
  );

  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single })) })) };
      }
      throw new Error(`Unexpected table in profile mock: ${table}`);
    }),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('processInboundChatMessage', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.sendDirectNotification.mockResolvedValue({ success: true });
  });

  it('replies with account-linking instructions for unknown Telegram senders', async () => {
    mocks.getSupabaseAdmin.mockReturnValue(makeProfileSupabase(null));

    const { processInboundChatMessage } = await import('@/lib/server/chat-input/processor');

    const result = await processInboundChatMessage({
      channel: 'telegram',
      externalMessageId: 'tg-unknown-1',
      senderId: '999999',
      text: 'pengeluaran 50000 pupuk',
      receivedAt: '2026-06-03T00:00:00.000Z',
      replyTo: '999999',
    });

    expect(result.status).toBe('ignored');
    expect(result.replyText).toContain('belum terhubung ke Arina Agri');
    expect(mocks.sendDirectNotification).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'telegram', to: '999999' }),
    );
  });

  it('records valid finance input and sends a confirmation reply', async () => {
    const logInsertSingle = vi.fn(async () => ({ data: { id: 'log-1' }, error: null }));
    const logUpdate = vi.fn(() => ({ eq: vi.fn(async () => ({ data: null, error: null })) }));
    const txInsertSingle = vi.fn(async () => ({ data: { id: 'tx-1' }, error: null }));
    const profileSingle = vi.fn(async () => ({
      data: { id: 'user-1', full_name: 'Budi' },
      error: null,
    }));

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: profileSingle })) })) };
        }
        if (table === 'inbound_message_logs') {
          return {
            insert: vi.fn(() => ({ select: vi.fn(() => ({ single: logInsertSingle })) })),
            update: logUpdate,
          };
        }
        if (table === 'transactions') {
          return {
            insert: vi.fn(() => ({ select: vi.fn(() => ({ single: txInsertSingle })) })),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    mocks.getSupabaseAdmin.mockReturnValue(supabase);

    const { processInboundChatMessage } = await import('@/lib/server/chat-input/processor');

    const result = await processInboundChatMessage({
      channel: 'telegram',
      externalMessageId: 'tg-valid-1',
      senderId: '123456',
      text: 'pengeluaran 50000 pupuk beli npk',
      receivedAt: '2026-06-03T00:00:00.000Z',
      replyTo: '123456',
    });

    expect(result.status).toBe('processed');
    expect(result.replyText).toContain('berhasil dicatat');
    expect(mocks.sendDirectNotification).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'telegram', to: '123456' }),
    );
  });

  it('replies with help text when message format is invalid', async () => {
    const logInsertSingle = vi.fn(async () => ({ data: { id: 'log-2' }, error: null }));
    const logUpdate = vi.fn(() => ({ eq: vi.fn(async () => ({ data: null, error: null })) }));
    const profileSingle = vi.fn(async () => ({
      data: { id: 'user-1', full_name: 'Budi' },
      error: null,
    }));

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: profileSingle })) })) };
        }
        if (table === 'inbound_message_logs') {
          return {
            insert: vi.fn(() => ({ select: vi.fn(() => ({ single: logInsertSingle })) })),
            update: logUpdate,
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    mocks.getSupabaseAdmin.mockReturnValue(supabase);

    const { processInboundChatMessage } = await import('@/lib/server/chat-input/processor');

    const result = await processInboundChatMessage({
      channel: 'telegram',
      externalMessageId: 'tg-invalid-1',
      senderId: '123456',
      text: 'halo arina tolong catat sesuatu',
      receivedAt: '2026-06-03T00:00:00.000Z',
      replyTo: '123456',
    });

    expect(result.status).toBe('ignored');
    expect(result.replyText).toContain('Format belum dikenali');
  });

  it('handles duplicate messages via idempotency log', async () => {
    const profileSingle = vi.fn(async () => ({
      data: { id: 'user-1', full_name: 'Budi' },
      error: null,
    }));

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: profileSingle })) })) };
        }
        if (table === 'inbound_message_logs') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: null,
                  error: { message: 'duplicate key value violates unique constraint' },
                })),
              })),
            })),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    mocks.getSupabaseAdmin.mockReturnValue(supabase);

    const { processInboundChatMessage } = await import('@/lib/server/chat-input/processor');

    const result = await processInboundChatMessage({
      channel: 'telegram',
      externalMessageId: 'tg-dup-1',
      senderId: '123456',
      text: 'pengeluaran 50000 pupuk',
      receivedAt: '2026-06-03T00:00:00.000Z',
      replyTo: '123456',
    });

    expect(result.status).toBe('ignored');
    expect(result.replyText).toContain('sudah pernah diproses');
  });
});
