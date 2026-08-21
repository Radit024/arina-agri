import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PAGES = new Set([
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/auth/callback',
]);

const PUBLIC_API_PREFIXES = [
  '/api/health',
  '/api/news',
  '/api/cron/',
  '/api/webhook/',
  '/api/feedback',
];

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function hasSupabaseSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) =>
    cookie.name.startsWith('sb-') ||
    cookie.name === 'supabase-auth-token' ||
    cookie.name === 'arina_guest_session'
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public landing and auth pages
  if (PUBLIC_PAGES.has(pathname)) {
    return NextResponse.next();
  }

  // 2. Allow public, cron, and webhook API routes
  if (isPublicApiRoute(pathname)) {
    return NextResponse.next();
  }

  const isDev = process.env.NODE_ENV === 'development';
  const hasSession = hasSupabaseSessionCookie(request);

  // 3. Protect UI dashboard routes (/dashboard/*)
  if (pathname.startsWith('/dashboard')) {
    if (!hasSession && !isDev) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 4. Protect API routes (/api/*)
  if (pathname.startsWith('/api')) {
    const authHeader = request.headers.get('authorization') || '';
    const hasBearer = authHeader.startsWith('Bearer ') && authHeader.length > 7;

    if (!hasBearer && !hasSession && !isDev) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Autentikasi diperlukan' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const middleware = proxy;
export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (*.svg, *.png, *.jpg, *.webp, *.json, *.geojson)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|geojson)$).*)',
  ],
};
