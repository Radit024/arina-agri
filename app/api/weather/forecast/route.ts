import { NextResponse } from 'next/server';
import { getBmkgForecast } from '@/lib/server/weather/bmkgClient';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const adm4 = url.searchParams.get('adm4')?.trim();

  if (!adm4) {
    return NextResponse.json(
      { success: false, message: 'Parameter adm4 wajib diisi untuk memuat prakiraan cuaca BMKG.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const locationLabel = url.searchParams.get('locationLabel')?.trim() || adm4;

  try {
    const data = await getBmkgForecast({ adm4, locationLabel });
    return NextResponse.json(
      { success: true, data },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Gagal memuat prakiraan cuaca BMKG.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
