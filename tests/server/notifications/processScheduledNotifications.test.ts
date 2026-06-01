import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
  getBmkgForecast: vi.fn(),
  getBmkgWarnings: vi.fn(),
  buildNotificationDecision: vi.fn(),
  sendDirectNotification: vi.fn(),
}));

vi.mock('@/lib/server/supabaseAdmin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

vi.mock('@/lib/server/weather/bmkgClient', () => ({
  getBmkgForecast: mocks.getBmkgForecast,
  getBmkgWarnings: mocks.getBmkgWarnings,
}));

vi.mock('@/lib/server/notifications/decision', () => ({
  buildNotificationDecision: mocks.buildNotificationDecision,
}));

vi.mock('@/lib/server/notifications/channels', () => ({
  sendDirectNotification: mocks.sendDirectNotification,
}));

function makeSchedule(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sched-1',
    user_id: 'user-1',
    enabled: true,
    time: '07:00',
    timezone: 'Asia/Jakarta',
    platform: 'telegram',
    recipient_number: null,
    telegram_chat_id: '123456',
    recipient_name: 'Budi',
    custom_message: 'Ringkasan harian kebun cabai.',
    weather_adm4: '35.07.22.2008',
    weather_location_label: 'Mulyoagung, Dau, Kabupaten Malang',
    last_sent_at: null,
    ...overrides,
  };
}

function makeForecast() {
  return {
    adm4: '35.07.22.2008',
    locationLabel: 'Mulyoagung, Dau, Kabupaten Malang',
    current: {
      utcDatetime: '2026-05-20T00:00:00Z',
      localDatetime: '2026-05-20 07:00:00',
      temperatureC: 24,
      humidityPercent: 82,
      condition: 'hujan',
      conditionText: 'Hujan Ringan',
      windSpeedKmh: 8,
      rainfallMm: 6,
      locationLabel: 'Mulyoagung, Dau, Kabupaten Malang',
      adm4: '35.07.22.2008',
      source: 'BMKG',
    },
    days: [],
    updatedAt: '2026-05-20T00:00:00.000Z',
    attribution: 'BMKG',
    isFallback: false,
  };
}

function createSupabaseMock(schedules: unknown[], events: unknown[] = []) {
  const scheduleSelectBuilder = {
    eq: vi.fn(async () => ({ data: schedules, error: null })),
  };
  type EventSelectBuilder = {
    eq: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
  };
  const eventSelectBuilder = {} as EventSelectBuilder;
  Object.assign(eventSelectBuilder, {
    eq: vi.fn(() => eventSelectBuilder),
    order: vi.fn(async () => ({ data: events, error: null })),
  });
  const updateBuilder = {
    eq: vi.fn(async () => ({ data: null, error: null })),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === 'notification_schedules') {
        return {
          select: vi.fn(() => scheduleSelectBuilder),
          update: vi.fn(() => updateBuilder),
        };
      }

      if (table === 'calendar_events') {
        return {
          select: vi.fn(() => eventSelectBuilder),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  };
}

describe('processScheduledNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getBmkgForecast.mockResolvedValue(makeForecast());
    mocks.getBmkgWarnings.mockResolvedValue({
      provinceCode: 'jatim',
      provinceName: 'Jawa Timur',
      warnings: [{
        id: 'warning-1',
        event: 'Hujan Lebat',
        headline: 'Peringatan dini cuaca Jawa Timur',
        description: 'Malang berpotensi hujan lebat.',
        affectedAreas: ['Malang'],
        severity: 'Severe',
        source: 'BMKG',
      }],
      updatedAt: '2026-05-20T00:00:00.000Z',
      attribution: 'BMKG',
      isFallback: false,
    });
    mocks.buildNotificationDecision.mockImplementation(async (input) => ({
      shouldSend: true,
      reason: 'force send',
      payload: {
        platform: input.platform,
        to: input.to,
        message: 'Pesan cuaca BMKG',
        metadata: {},
      },
    }));
    mocks.sendDirectNotification.mockResolvedValue({ success: true, data: { ok: true } });
  });

  it('builds scheduled notification decisions from BMKG weather and warnings', async () => {
    const supabase = createSupabaseMock([makeSchedule()], [{
      title: 'Penyemprotan',
      waktu: '08:00',
      category: 'penyemprotan',
      description: 'Cek angin sebelum mulai.',
    }]);
    mocks.getSupabaseAdmin.mockReturnValue(supabase);
    const { processScheduledNotifications } = await import('@/lib/server/notifications/process');

    const result = await processScheduledNotifications(true);

    expect(result.success).toBe(true);
    expect(mocks.getBmkgForecast).toHaveBeenCalledWith({
      adm4: '35.07.22.2008',
      locationLabel: 'Mulyoagung, Dau, Kabupaten Malang',
    });
    expect(mocks.buildNotificationDecision).toHaveBeenCalledWith(expect.objectContaining({
      platform: 'telegram',
      to: '123456',
      recipientName: 'Budi',
      weather: {
        kondisi: 'hujan',
        suhu: 24,
        kelembapan: 82,
        curahHujan: 6,
        kecepatanAngin: 8,
        lokasi: 'Mulyoagung, Dau, Kabupaten Malang',
      },
      metadata: expect.objectContaining({
        source: 'vercel-cron-scheduler',
        customMessage: 'Ringkasan harian kebun cabai.',
        forceSend: true,
        locale: 'id',
        bmkgWarnings: [expect.objectContaining({ id: 'warning-1' })],
        dailyEvents: [{
          title: 'Penyemprotan',
          time: '08:00',
          category: 'penyemprotan',
          note: 'Cek angin sebelum mulai.',
        }],
      }),
    }));
    expect(mocks.sendDirectNotification).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Pesan cuaca BMKG',
    }));
  });

  it('skips enabled schedules that do not have a BMKG adm4 location', async () => {
    const supabase = createSupabaseMock([makeSchedule({ weather_adm4: null })]);
    mocks.getSupabaseAdmin.mockReturnValue(supabase);
    const { processScheduledNotifications } = await import('@/lib/server/notifications/process');

    const result = await processScheduledNotifications(true);

    expect(mocks.getBmkgForecast).not.toHaveBeenCalled();
    expect(mocks.buildNotificationDecision).not.toHaveBeenCalled();
    expect(mocks.sendDirectNotification).not.toHaveBeenCalled();
    const results = result.results ?? [];
    expect(results[0]).toMatchObject({
      user_id: 'user-1',
      skipped: true,
      reason: 'Lokasi BMKG belum tersimpan untuk jadwal notifikasi.',
    });
  });
});
