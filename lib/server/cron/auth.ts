export function isCronAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;

  // Fail-closed: tanpa konfigurasi, cron ditolak di setiap environment.
  // Kegagalan konfigurasi tidak boleh berubah menjadi akses terbuka.
  if (!expected) return false;

  const auth = request.headers.get('authorization');
  return auth === `Bearer ${expected}`;
}

export function requireCronAuth(request: Request): Response | null {
  return isCronAuthorized(request) ? null : new Response('Unauthorized', { status: 401 });
}
