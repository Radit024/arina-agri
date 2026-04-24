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
  const firebaseClientConfig = {
    apiKey: process.env.FIREBASE_CLIENT_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'mock-api-key',
    authDomain: process.env.FIREBASE_CLIENT_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'mock.firebaseapp.com',
    projectId: process.env.FIREBASE_CLIENT_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mock-project-id',
    storageBucket: process.env.FIREBASE_CLIENT_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'mock.appspot.com',
    messagingSenderId:
      process.env.FIREBASE_CLIENT_MESSAGING_SENDER_ID || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
    appId: process.env.FIREBASE_CLIENT_APP_ID || process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef',
  };

  return (
    <html lang={locale} className={`${plusJakartaSans.variable} ${sora.variable}`}>
      <body className="antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__ARINA_FIREBASE_CONFIG__ = ${JSON.stringify(firebaseClientConfig)};`,
          }}
        />
        <AuthProvider>
          <NextIntlClientProvider messages={messages}>
            <MuiProvider>{children}</MuiProvider>
          </NextIntlClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
