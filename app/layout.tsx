import type { Metadata } from 'next';
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} ${sora.variable}`}>
      <body className="antialiased">
        <MuiProvider>{children}</MuiProvider>
      </body>
    </html>
  );
}
