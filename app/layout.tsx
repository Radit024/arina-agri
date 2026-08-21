import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Sora } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import MuiProvider from '@/components/shared/MuiProvider';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { AuthProvider } from '@/context/AuthContext';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
  preload: false,
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

const themeInitScript = `
(() => {
  try {
    const stored = window.localStorage.getItem('arina_theme_mode');
    const mode = stored === 'light' || stored === 'dark' ? stored : 'light';
    const root = document.documentElement;
    root.dataset.theme = mode;
    root.style.colorScheme = mode;
  } catch {
    document.documentElement.dataset.theme = 'light';
    document.documentElement.style.colorScheme = 'light';
  }
})();
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${plusJakartaSans.variable} ${sora.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <Script id="arina-theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <AuthProvider>
          <NextIntlClientProvider messages={messages}>
            <MuiProvider>{children}</MuiProvider>
          </NextIntlClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
