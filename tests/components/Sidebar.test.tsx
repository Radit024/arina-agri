import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from '@/components/shared/Sidebar';

const openGuideMock = vi.fn();
const pushMock = vi.fn();
const prefetchMock = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: pushMock, prefetch: prefetchMock }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const labels: Record<string, string> = {
      dashboard: 'Dashboard',
      keuangan: 'Manajemen Keuangan',
      stok: 'Manajemen Stok',
      cuaca: 'Cuaca',
      kabarPasar: 'Berita',
      ensiklopedia: 'AI Chat',
      kalender: 'Smart Kalender',
      guide: 'Panduan',
      beriMasukan: 'Feedback',
      pengaturan: 'Pengaturan',
      logout: 'Keluar',
      farmer: 'Petani',
    };

    return (key: string) => labels[key] ?? key;
  },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      email: 'budi@example.com',
      user_metadata: { full_name: 'Budi Santoso' },
    },
    signOut: vi.fn(),
  }),
}));

vi.mock('@/components/shared/guide/GuideProvider', () => ({
  useGuide: () => ({ openGuide: openGuideMock }),
}));

vi.mock('@/components/shared/FeedbackModal', () => ({
  default: () => null,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
    },
  },
}));

beforeEach(() => {
  openGuideMock.mockReset();
  pushMock.mockReset();
  prefetchMock.mockReset();
});

describe('Sidebar', () => {
  it('keeps feedback and guide visible when the profile menu is open', async () => {
    render(<Sidebar />);

    expect(screen.getByRole('button', { name: 'Feedback' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Panduan' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Budi Santoso/ }));

    expect(await screen.findByRole('button', { name: 'Pengaturan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keluar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Feedback' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Panduan' })).toBeInTheDocument();
  });
});
