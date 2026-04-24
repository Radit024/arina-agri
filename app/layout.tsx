import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Sora } from 'next/font/google';
import './globals.css';
import MuiProvider from '@/components/shared/MuiProvider';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Arina Agri — Asisten Cerdas Petani Indonesia',
  description:
    'Platform AI untuk petani dan pelaku agribisnis UMKM Indonesia. Kelola keuangan, pantau cuaca, dan konsultasi penyakit tanaman dengan mudah.',
  keywords: ['pertanian', 'agribisnis', 'AI', 'petani', 'cabai', 'UMKM'],
  icons: {
    icon: '/logo%20arina.svg',
    shortcut: '/logo%20arina.svg',
    apple: '/logo%20arina.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { AuthProvider } from '@/context/AuthContext';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${plusJakartaSans.variable} ${sora.variable}`}>
      <body className="antialiased">
        <AuthProvider>
          <NextIntlClientProvider messages={messages}>
            <MuiProvider>{children}</MuiProvider>
          </NextIntlClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
