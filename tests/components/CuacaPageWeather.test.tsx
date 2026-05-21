import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CuacaPage from '@/app/dashboard/cuaca/page';
import { weatherApi } from '@/lib/api';

const mockStorage = vi.hoisted(() => ({
  gpsLocation: null as null | { latitude: number; longitude: number; accuracy: number; label: string; adm4?: string },
  gpsAutoAttempted: false,
}));

vi.mock('@mui/material/Autocomplete', () => ({
  default: () => null,
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'id',
  useTranslations: (namespace?: string) => (key: string, values?: any) => {
    if (namespace === 'Weather') {
      if (key === 'days.sun') return 'Min';
      if (key === 'days.mon') return 'Sen';
      if (key === 'days.tue') return 'Sel';
      if (key === 'days.wed') return 'Rab';
      if (key === 'days.thu') return 'Kam';
      if (key === 'days.fri') return 'Jum';
      if (key === 'days.sat') return 'Sab';
      if (key === 'location.gpsWithAccuracy') return `GPS ${values.label} (${values.accuracy}m)`;
      if (key === 'location.active') return `Lokasi aktif: ${values.location}`;
      if (key === 'gps.buttons.enable') return 'Nyalakan GPS';
      if (key === 'gps.messages.gpsActive') return 'Lokasi GPS aktif';
    }
    return key;
  },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'test@example.com', user_metadata: { full_name: 'Test Farmer' } } }),
}));

vi.mock('@/hooks/useCalendar', () => ({
  useCalendar: () => ({ events: [] }),
}));

vi.mock('@/hooks/useWeatherLocation', () => ({
  useWeatherLocation: () => ({
    gpsLocation: mockStorage.gpsLocation,
    setGpsLocation: vi.fn((val) => { mockStorage.gpsLocation = val; }),
    gpsAutoAttempted: mockStorage.gpsAutoAttempted,
    setGpsAutoAttempted: vi.fn((val) => { mockStorage.gpsAutoAttempted = val; }),
    activeAdm4: mockStorage.gpsLocation?.adm4,
    activeLocationLabel: mockStorage.gpsLocation?.label,
  }),
}));

vi.mock('@/hooks/useLocalStorage', () => ({
  default: (key: string, initial: unknown) => {
    return [initial, vi.fn()];
  },
}));

vi.mock('@/lib/api', () => ({
  locationApi: { search: vi.fn(async () => []) },
  eventApi: { getAll: vi.fn(async () => []) },
  notificationApi: { decideAndSend: vi.fn() },
  notificationScheduleApi: {
    get: vi.fn(async () => ({
      enabled: true,
      time: '07:00',
      timezone: 'Asia/Jakarta',
      platform: 'whatsapp',
    })),
    set: vi.fn(),
  },
  weatherApi: {
    getWarnings: vi.fn(async () => ({
      warnings: [
        {
          id: 'w1',
          event: 'Peringatan dini cuaca Jawa Timur',
          headline: 'Hujan lebat disertai petir',
          description: 'Hujan lebat...',
          effective: '2026-05-21T07:00:00Z',
          expires: '2026-05-21T10:00:00Z',
        },
      ],
    })),
    getForecast: vi.fn(async () => ({
      current: {
        temperatureC: 24,
        humidityPercent: 80,
        rainfallMm: 5,
        windSpeedKmh: 12,
        condition: 'Hujan',
        locationLabel: 'Malang',
      },
      days: [
        {
          date: '2026-05-21',
          minTemperatureC: 22,
          maxTemperatureC: 30,
          dominantCondition: 'Hujan',
          totalRainfallMm: 15,
        },
      ],
      attribution: 'Sumber data: BMKG',
    })),
  },
}));

function stubReverseGeocodeFetch() {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('nominatim.openstreetmap.org/reverse')) {
      return {
        ok: true,
        json: async () => ({
          address: { village: 'Mulyoagung' },
          display_name: 'Mulyoagung, Dau, Kabupaten Malang',
        }),
      };
    }
    return { ok: false };
  }));
}

describe('CuacaPage GPS', () => {
  beforeEach(() => {
    mockStorage.gpsLocation = null;
    mockStorage.gpsAutoAttempted = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows BMKG forecast attribution and active warning when GPS is active', async () => {
    mockStorage.gpsLocation = {
      latitude: -7.9201,
      longitude: 112.5899,
      accuracy: 10,
      label: 'Malang',
      adm4: '35.07.22.2008',
    };
    render(<CuacaPage />);

    await waitFor(() => expect(screen.getByText(/Sumber data: BMKG/)).toBeInTheDocument());
    expect(screen.getAllByText(/Peringatan dini cuaca Jawa Timur/).length).toBeGreaterThan(0);
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
    stubReverseGeocodeFetch();

    render(<CuacaPage />);

    const gpsButtons = await screen.findAllByRole('button', { name: /nyalakan gps/i });
    fireEvent.click(gpsButtons[0]);

    expect(getCurrentPosition.mock.calls.length).toBeGreaterThanOrEqual(1);
    await waitFor(() => expect(screen.getAllByText(/Lokasi GPS aktif/i).length).toBeGreaterThan(0));
  });

  it('retries geolocation when first attempt times out', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback, error: PositionErrorCallback, options?: PositionOptions) => {
      if (options?.enableHighAccuracy) {
        error({ code: 3, message: 'Timeout expired' } as GeolocationPositionError);
        return;
      }
      success({
        coords: { latitude: -7.9, longitude: 112.6, accuracy: 100 },
        timestamp: Date.now(),
      } as GeolocationPosition);
    });

    Object.defineProperty(global.navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });
    stubReverseGeocodeFetch();

    render(<CuacaPage />);

    const gpsButtons = await screen.findAllByRole('button', { name: /nyalakan gps/i });
    fireEvent.click(gpsButtons[0]);

    await waitFor(() => expect(getCurrentPosition.mock.calls.length).toBeGreaterThanOrEqual(2));
  });
});
