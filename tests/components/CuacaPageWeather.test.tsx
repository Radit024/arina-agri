import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CuacaPage from '@/app/dashboard/cuaca/page';

vi.mock('next-intl', () => ({
  useLocale: () => 'id',
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) => {
      if (key === 'title') return 'Notifikasi Cuaca';
      if (key === 'subtitle') return 'Pantau kondisi cuaca';
      if (key === 'current.title') return 'Cuaca Saat Ini';
      if (key === 'current.humidity') return 'Kelembapan';
      if (key === 'current.rainfall') return 'Curah Hujan';
      if (key === 'current.windSpeed') return 'Angin';
      if (key === 'current.temperature') return 'Suhu';
      if (key === 'forecast.title') return 'Prakiraan 3 Hari BMKG';
      if (key === 'forecast.today') return 'Hari ini';
      if (key === 'history.title') return 'Riwayat Peringatan';
      if (key === 'history.columns.date') return 'Tanggal';
      if (key === 'history.columns.alertType') return 'Jenis';
      if (key === 'history.columns.message') return 'Pesan';
      if (key === 'history.columns.status') return 'Status';
      if (key === 'history.status.sent') return 'Terkirim';
      if (key === 'history.status.failed') return 'Gagal';
      if (key === 'whatsapp.title') return 'Integrasi Notifikasi';
      if (key === 'whatsapp.note') return 'Atur kanal notifikasi';
      if (key === 'whatsapp.enable') return 'Aktifkan notifikasi';
      if (key === 'whatsapp.phoneLabel') return 'Nomor WhatsApp';
      if (key === 'whatsapp.telegramLabel') return 'Kontak Telegram';
      if (key === 'whatsapp.phonePlaceholder') return '08123456789';
      if (key === 'whatsapp.telegramPlaceholder') return '@budi';
      if (key === 'whatsapp.phoneHelper') return 'Masukkan nomor aktif';
      if (key === 'whatsapp.telegramHelper') return 'Masukkan username Telegram';
      if (key === 'whatsapp.saved') return 'Tersimpan';
      if (key === 'whatsapp.saveAndEnable') return 'Simpan';
      if (key === 'whatsapp.testButton') return `Tes ${values?.platform ?? 'Notifikasi'}`;
      if (key === 'whatsapp.activeAlertTypes') return 'Jenis peringatan aktif';
      if (key === 'whatsapp.alerts.heavyRain') return 'Hujan lebat';
      if (key === 'whatsapp.alerts.strongWind') return 'Angin kencang';
      if (key === 'whatsapp.alerts.extremeTemp') return 'Suhu ekstrem';
      if (key === 'whatsapp.alerts.lowHumidity') return 'Kelembapan rendah';
      if (key === 'whatsapp.scheduleTitle') return 'Jadwal Notifikasi';
      if (key === 'whatsapp.scheduleSub') return 'Atur pengiriman';
      if (key === 'whatsapp.scheduleTime') return 'Waktu';
      if (key === 'whatsapp.scheduleActive') return 'Aktif';
      if (key === 'whatsapp.scheduleSave') return 'Simpan jadwal';
      if (key.startsWith('days.')) return key.replace('days.', '');
      return values ? `${key} ${JSON.stringify(values)}` : key;
    };
    t.raw = (key: string) => key === 'whatsapp.tutorialSteps' ? ['Buka Telegram', 'Kirim pesan ke bot'] : [];
    return t;
  },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'budi@example.com', user_metadata: { full_name: 'Budi' } } }),
}));

vi.mock('@/hooks/useCalendar', () => ({ useCalendar: () => ({ events: [] }) }));
vi.mock('@/hooks/useLocalStorage', () => ({ default: (_key: string, initial: string) => [initial, vi.fn()] }));

vi.mock('@/lib/api', () => ({
  eventApi: { getAll: vi.fn(async () => []) },
  notificationApi: { decideAndSend: vi.fn() },
  notificationScheduleApi: {
    get: vi.fn(async () => ({
      enabled: true,
      time: '07:00',
      timezone: 'Asia/Jakarta',
      platform: 'whatsapp',
      to: '',
      customMessage: '',
    })),
    set: vi.fn(async () => ({ success: true })),
  },
  weatherApi: {
    getForecast: vi.fn(async () => ({
      adm4: '35.07.22.2008',
      locationLabel: 'Desa Wonorejo, Malang',
      updatedAt: '2026-05-20T00:00:00.000Z',
      attribution: 'Sumber data: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)',
      isFallback: false,
      current: {
        utcDatetime: '2026-05-20 00:00:00',
        localDatetime: '2026-05-20 07:00:00',
        temperatureC: 24,
        humidityPercent: 82,
        condition: 'hujan',
        conditionText: 'Hujan Ringan',
        windSpeedKmh: 8,
        rainfallMm: 6,
        locationLabel: 'Desa Wonorejo, Malang',
        adm4: '35.07.22.2008',
        source: 'BMKG',
      },
      days: [{
        date: '2026-05-20',
        minTemperatureC: 24,
        maxTemperatureC: 29,
        dominantCondition: 'hujan',
        totalRainfallMm: 6,
        slots: [],
      }],
    })),
    getWarnings: vi.fn(async () => ({
      provinceCode: 'jatim',
      provinceName: 'Jawa Timur',
      updatedAt: '2026-05-20T00:00:00.000Z',
      attribution: 'Sumber data: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)',
      isFallback: false,
      warnings: [{
        id: 'w1',
        event: 'Hujan Lebat',
        headline: 'Peringatan dini cuaca Jawa Timur',
        description: 'Malang berpotensi hujan lebat',
        affectedAreas: ['Malang'],
        source: 'BMKG',
      }],
    })),
  },
}));

describe('CuacaPage BMKG data', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows BMKG forecast attribution and active warning', async () => {
    render(<CuacaPage />);

    await waitFor(() => expect(screen.getByText(/Sumber data: BMKG/)).toBeInTheDocument());
    expect(screen.getAllByText(/Peringatan dini cuaca Jawa Timur/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Prakiraan 3 Hari BMKG/)).toBeInTheDocument();
  });

  it('requests browser geolocation when gps button is clicked', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: -7.9845,
          longitude: 112.6214,
          accuracy: 25,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition);
    });

    Object.defineProperty(global.navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });

    render(<CuacaPage />);

    const gpsButtons = await screen.findAllByRole('button', { name: /nyalakan gps/i });
    fireEvent.click(gpsButtons[0]);

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText(/Lokasi GPS aktif/i)).toBeInTheDocument());
  });
});
