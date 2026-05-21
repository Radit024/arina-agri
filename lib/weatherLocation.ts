export const WEATHER_GPS_LOCATION_KEY = 'arina-weather-gps-location';
export const WEATHER_GPS_AUTO_ATTEMPTED_KEY = 'arina-weather-gps-auto-attempted';

export interface GpsLocationSnapshot {
  latitude: number;
  longitude: number;
  accuracy: number;
  label: string;
  adm4?: string;
}
