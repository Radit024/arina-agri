import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  // Tanpa ini,	dev server yang di-bind ke `localhost` akan menolak request yang
  // datang dari `127.0.0.1` (atau sebaliknya). Gejalanya sangat menyesatkan:
  // HTML tampil sempurna tapi React tidak pernah hydrate sehingga seluruh aplikasi
  // diam total (semua tombol mati) tanpa error di console.
  allowedDevOrigins: ['127.0.0.1', 'localhost', '0.0.0.0'],
};

export default withNextIntl(nextConfig);
