export function isCronAuthorized(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const auth = request.headers.get('authorization');
  return auth === `Bearer ${expected}`;
}

export function requireCronAuth(request: Request): Response | null {
  return isCronAuthorized(request) ? null : new Response('Unauthorized', { status: 401 });
}
