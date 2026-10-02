import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CuacaPage from '@/app/dashboard/cuaca/page';
import { locationApi, weatherApi } from '@/lib/api';

type TestGpsLocation = null | { latitude: number; longitude: number; accuracy: number; label: string; adm4?: string };
type TestGpsLocationSetter = TestGpsLocation | ((current: TestGpsLocation) => TestGpsLocation);

const mockStorage = vi.hoisted(() => ({
  gpsLocation: null as TestGpsLocation,
  gpsAutoAttempted: false,
  isWeatherLocationHydrated: true,
}));

vi.mock('@mui/material/Autocomplete', () => ({
  default: () => null,
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'id',
  useMessages: () => ({}),
  useTranslations: (namespace?: string) => (key: string, values: Record<string, string | number> = {}) => {
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

vi.mock('@/hooks/useWeatherLocation', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    useWeatherLocation: () => {
      const [gpsLocation, setGpsLocationState] = React.useState(mockStorage.gpsLocation);
      const [gpsAutoAttempted, setGpsAutoAttemptedState] = React.useState(mockStorage.gpsAutoAttempted);
      const setGpsLocation = React.useCallback((val: TestGpsLocationSetter) => {
        setGpsLocationState((current) => {
          const nextValue = typeof val === 'function' ? val(current) : val;
          mockStorage.gpsLocation = nextValue;
          return nextValue;
        });
      }, []);
      const setGpsAutoAttempted = React.useCallback((val: boolean | ((current: boolean) => boolean)) => {
        setGpsAutoAttemptedState((current) => {
          const nextValue = typeof val === 'function' ? val(current) : val;
          mockStorage.gpsAutoAttempted = nextValue;
          return nextValue;
        });
      }, []);

      return {
        gpsLocation,
        setGpsLocation,
        gpsAutoAttempted,
        setGpsAutoAttempted,
        isWeatherLocationHydrated: mockStorage.isWeatherLocationHydrated,
        activeAdm4: gpsLocation?.adm4,
        activeLocationLabel: gpsLocation?.label,
      };
    },
  };
});

vi.mock('@/hooks/useLocalStorage', () => ({
  default: (key: string, initial: unknown) => {
    return [initial, vi.fn()];
  },
}));

vi.mock('@/lib/api', () => ({
  locationApi: {
    search: vi.fn(async () => []),
    reverse: vi.fn(async () => ({
      id: '35.73.05.1008',
      adm4: '35.73.05.1008',
      label: 'Tunjungsekar, Kec. Lowokwaru, Kota Malang, Jawa Timur',
      name: 'Tunjungsekar',
      detail: 'Kec. Lowokwaru, Kota Malang, Jawa Timur',
      latitude: -7.93167,
      longitude: 112.63784,
    })),
  },
  eventApi: { getAll: vi.fn(async () => []) },
  notificationApi: { decideAndSend: vi.fn() },
  notificationScheduleApi: {
    get: vi.fn(async () => ({
      enabled: true,
      time: '07:00',
      timezone: 'Asia/Jakarta',
      platform: 'whatsapp',
    })),
    set: vi.fn(async () => ({ success: true })),
  },
  profileApi: {
    get: vi.fn(async () => ({
      id: 'u1',
      fullName: 'Test Farmer',
      lokasi: '',
      komoditas: '',
      luasLahan: '',
      whatsappPhone: '',
      telegramUsername: '',
      telegramChatId: '',
      telegramContact: '',
    })),
    save: vi.fn(),
  },
  weatherApi: {
    getWarnings: vi.fn(async () => ({
      warnings: [
        {
          id: 'w1',
          event: 'Peringatan dini cuaca Jawa Timur',
          headline: 'Hujan lebat disertai petir',
          description: 'Hujan lebat...',
          affectedAreas: ['Malang'],
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

function clearNavigatorGeolocation() {
  Object.defineProperty(global.navigator, 'geolocation', {
    configurable: true,
    value: undefined,
  });
}

describe('CuacaPage GPS', () => {
  beforeEach(() => {
    clearNavigatorGeolocation();
    mockStorage.gpsLocation = null;
    mockStorage.gpsAutoAttempted = false;
    mockStorage.isWeatherLocationHydrated = true;
  });

  afterEach(async () => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    clearNavigatorGeolocation();
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

  it('does not load or render BMKG warning placeholders before a BMKG location is selected', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: -7.9201,
          longitude: 112.5899,
          accuracy: 10,
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

    expect(await screen.findByText('emptyWeather.title')).toBeInTheDocument();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(weatherApi.getForecast).not.toHaveBeenCalled();
    expect(weatherApi.getWarnings).not.toHaveBeenCalled();
    expect(screen.queryByText(/Peringatan dini cuaca Jawa Timur/i)).not.toBeInTheDocument();
  });

  it('exposes responsive weather UI hooks for mobile and desktop polish', async () => {
    mockStorage.gpsLocation = {
      latitude: -7.9201,
      longitude: 112.5899,
      accuracy: 10,
      label: 'Malang',
      adm4: '35.07.22.2008',
    };

    const { container } = render(<CuacaPage />);

    await waitFor(() => expect(screen.getByText(/Sumber data: BMKG/)).toBeInTheDocument());

    expect(container.querySelector('[data-guide-target="weather-gps"]')).toHaveAttribute('data-touch-target', '44');
    expect(container.querySelector('[data-weather-forecast-grid="fit-mobile"]')).toBeInTheDocument();
    expect(container.querySelector('[data-weather-history-layout="stretch-column"]')).toBeInTheDocument();
    expect(container.querySelector('[data-weather-history-card="fills-empty-space"]')).toBeInTheDocument();
    expect(container.querySelector('[data-weather-history-mobile="cards"]')).toBeInTheDocument();
    expect(container.querySelector('[data-weather-history-table="desktop"]')).toBeInTheDocument();
    expect(container.querySelector('[data-weather-notification-panel="sticky"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="LocationOnIcon"]')).toBeInTheDocument();
    expect(container.textContent).not.toContain(String.fromCodePoint(0x1f4cd));
    expect(container.textContent).not.toContain(String.fromCodePoint(0x1f4a7));
  });

  it('hydrates a saved GPS location without adm4 before loading BMKG forecast', async () => {
    mockStorage.gpsLocation = {
      latitude: -7.93167,
      longitude: 112.63784,
      accuracy: 100,
      label: 'Tunjungsekar',
    };

    render(<CuacaPage />);

    await waitFor(() => expect(locationApi.reverse).toHaveBeenCalledWith({ lat: -7.93167, lon: 112.63784 }));
    await waitFor(() => {
      expect(weatherApi.getForecast).toHaveBeenCalledWith({
        adm4: '35.73.05.1008',
        locationLabel: 'Tunjungsekar, Kec. Lowokwaru, Kota Malang, Jawa Timur',
      });
    });
    expect(await screen.findByText(/Sumber data: BMKG/)).toBeInTheDocument();
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
    await waitFor(() => expect(locationApi.reverse).toHaveBeenCalledWith({ lat: -7.9845, lon: 112.6214 }));
    await waitFor(() => {
      expect(weatherApi.getForecast).toHaveBeenCalledWith({
        adm4: '35.73.05.1008',
        locationLabel: 'Tunjungsekar, Kec. Lowokwaru, Kota Malang, Jawa Timur',
      });
    });
    await waitFor(() => expect(screen.getAllByText(/Lokasi GPS aktif/i).length).toBeGreaterThan(0));
  });

  it('does not auto-track GPS again after the first automatic attempt', async () => {
    mockStorage.gpsAutoAttempted = true;
    const getCurrentPosition = vi.fn();

    Object.defineProperty(global.navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });

    render(<CuacaPage />);

    expect(await screen.findByRole('button', { name: /nyalakan gps/i })).toBeInTheDocument();
    expect(getCurrentPosition).not.toHaveBeenCalled();
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
