import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/**
 * Header keamanan dasar. Aplikasi memuat session yang terhubung ke
 * Telegram/WhatsApp dan menampilkan data keuangan, jadi klikjacking dan
 * referrer leakage perlu ditutup.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
];

const nextConfig: NextConfig = {
  // Tanpa ini,	dev server yang di-bind ke `localhost` akan menolak request yang
  // datang dari `127.0.0.1` (atau sebaliknya). Gejalanya sangat menyesatkan:
  // HTML tampil sempurna tapi React tidak pernah hydrate sehingga seluruh aplikasi
  // diam total (semua tombol mati) tanpa error di console.
  allowedDevOrigins: ['127.0.0.1', 'localhost', '0.0.0.0'],

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
