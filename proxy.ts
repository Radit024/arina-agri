import { NextResponse, type NextRequest } from 'next/server';
import { getRateLimitRule, hitRateLimit, resolveClientKey } from '@/lib/server/rateLimit';

const PUBLIC_PAGES = new Set([
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/auth/callback',
]);

const PUBLIC_API_ROUTES = new Set([
  '/api/health',
  '/api/news',
  '/api/feedback',
]);

const PUBLIC_API_PREFIXES = [
  '/api/cron/',
  '/api/webhook/',
];

/**
 * Yang boleh melewati gate proxy. `/api/news/trigger` sengaja TIDAK termasuk:
 * endpoint itu memicu fetch + scrape dan harus dijaga CRON_SECRET di handler.
 */
function isPublicApiRoute(pathname: string): boolean {
  if (PUBLIC_API_ROUTES.has(pathname)) return true;
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Sesi Supabase terautentikasi. Hanya inilah yang boleh dipakai sebagai bukti
 * akses untuk endpoint API.
 */
function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) =>
    cookie.name.startsWith('sb-') ||
    cookie.name === 'supabase-auth-token'
  );
}

/**
 * Cookie mode demo. Nilainya dibuat sepenuhnya di browser (AuthContext),
 * tanpa tanda tangan dan tanpa httpOnly, jadi TIDAK boleh diperlakukan
 * setara dengan sesi terautentikasi. Hanya boleh membuka halaman /dashboard
 * yang isinya sudah dimuat dari mock data di sisi klien.
 */
function hasGuestSessionCookie(request: NextRequest): boolean {
  return request.cookies.get('arina_guest_session')?.value === '1';
}

interface RateLimitDecision {
  limit: number;
  remaining: number;
  rejected: boolean;
  retryAfterMs: number;
}

/**
 * Rate limit untuk endpoint publik atau yang menyentuh kuota pihak ketiga.
 * Dijalankan di proxy agar permintaan berlama-lama tertahan sebelum handler dan
 * sebelum fetch keluar. Satu-satunya tempat rate limit diterapkan.
 */
async function checkRateLimitForProxy(request: NextRequest, pathname: string): Promise<RateLimitDecision | null> {
  const rule = getRateLimitRule(pathname);
  if (!rule) return null;

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const identity = token ? `user:${token.slice(0, 64)}` : `ip:${resolveClientKey(request)}`;

  const { result } = await hitRateLimit(pathname, identity, rule);

  return {
    limit: rule.max,
    remaining: result.remaining,
    rejected: !result.allowed,
    retryAfterMs: result.retryAfterMs,
  };
}

function withRateLimitHeaders(response: NextResponse, decision: RateLimitDecision): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(decision.limit));
  response.headers.set('X-RateLimit-Remaining', String(decision.rejected ? 0 : decision.remaining));
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0. Rate limit endpoint yang publik atau menyentuh kuota pihak ketiga
  const decision = await checkRateLimitForProxy(request, pathname);
  if (decision?.rejected) {
    const retryAfterSeconds = Math.max(1, Math.ceil(decision.retryAfterMs / 1000));
    return withRateLimitHeaders(
      NextResponse.json(
        {
          success: false,
          message: `Terlalu banyak permintaan. Coba lagi dalam ${retryAfterSeconds} detik.`,
        },
        {
          status: 429,
          headers: {
            'Cache-Control': 'no-store',
            'Retry-After': String(retryAfterSeconds),
          },
        },
      ),
      decision,
    );
  }

  const proceed = () => (decision ? withRateLimitHeaders(NextResponse.next(), decision) : NextResponse.next());

  // 1. Allow public landing and auth pages
  if (PUBLIC_PAGES.has(pathname)) {
    return proceed();
  }

  // 2. Allow public, cron, and webhook API routes
  if (isPublicApiRoute(pathname)) {
    return proceed();
  }

  const isDev = process.env.NODE_ENV === 'development';

  // 3. Protect UI dashboard routes (/dashboard/*)
  //    Mode demo tetap boleh masuk: isinya dimuat dari mock data di browser,
  //    tidak pernah menyentuh API.
  if (pathname.startsWith('/dashboard')) {
    if (!hasSessionCookie(request) && !hasGuestSessionCookie(request) && !isDev) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return proceed();
  }

  // 4. Protect API routes (/api/*)
  //    Cookie guest sengaja tidak dipakai di sini: setiap endpoint wajib
  //    memverifikasi token-nya sendiri lewat resolveRequestUserId/guardRequest.
  if (pathname.startsWith('/api')) {
    const authHeader = request.headers.get('authorization') || '';
    const hasBearer = authHeader.startsWith('Bearer ') && authHeader.length > 7;

    if (!hasBearer && !hasSessionCookie(request) && !isDev) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Autentikasi diperlukan' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return proceed();
  }

  return proceed();
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
