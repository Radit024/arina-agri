import { NextResponse } from 'next/server';
import { getBmkgForecast } from '@/lib/server/weather/bmkgClient';
import { DEFAULT_BMKG_LOCATION_LABEL } from '@/lib/server/weather/bmkgTypes';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const adm4 = url.searchParams.get('adm4') || undefined;
  const locationLabel = url.searchParams.get('locationLabel') || DEFAULT_BMKG_LOCATION_LABEL;
  const data = await getBmkgForecast({ adm4, locationLabel });
  return NextResponse.json({ success: true, data });
}
