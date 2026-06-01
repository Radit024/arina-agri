import type { WeatherSnapshotInput } from './decision';
import type { BmkgForecastResponse } from '@/lib/server/weather/bmkgTypes';

export function weatherSnapshotFromBmkgForecast(
  forecast: BmkgForecastResponse,
  locationLabel?: string | null
): WeatherSnapshotInput {
  const current = forecast.current;

  return {
    kondisi: current.condition,
    suhu: current.temperatureC,
    kelembapan: current.humidityPercent,
    curahHujan: current.rainfallMm,
    kecepatanAngin: current.windSpeedKmh,
    lokasi: locationLabel?.trim() || current.locationLabel || forecast.locationLabel,
  };
}
