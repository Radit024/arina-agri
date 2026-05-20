import { NextResponse } from 'next/server';
import { getBmkgWarnings } from '@/lib/server/weather/bmkgClient';
import { DEFAULT_BMKG_PROVINCE_NAME } from '@/lib/server/weather/bmkgTypes';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const provinceCode = url.searchParams.get('province') || undefined;
  const provinceName = url.searchParams.get('provinceName') || DEFAULT_BMKG_PROVINCE_NAME;
  const data = await getBmkgWarnings({ provinceCode, provinceName });
  return NextResponse.json({ success: true, data });
}
