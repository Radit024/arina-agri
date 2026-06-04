import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RegisterController from '@/controllers/register/RegisterController';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const copy: Record<string, string> = {
      branding: 'Bergabunglah dan tingkatkan produktivitas pertanian Anda.',
      title: 'Buat Akun Baru',
      subtitle: 'Isi data di bawah ini untuk memulai.',
      fullName: 'Nama Lengkap',
      email: 'Alamat Email',
      password: 'Kata Sandi',
      confirmPassword: 'Konfirmasi Kata Sandi',
      submit: 'Daftar Sekarang',
      processing: 'Memproses...',
      google: 'Daftar dengan Google',
      hasAccount: 'Sudah punya akun?',
      loginNow: 'Masuk di sini',
      'validation.name': 'Nama lengkap minimal 3 karakter',
      'validation.email': 'Format email tidak valid',
      'validation.password': 'Password minimal 6 karakter',
      'validation.confirm': 'Konfirmasi password minimal 6 karakter',
      'validation.mismatch': 'Konfirmasi password tidak cocok',
    };

    return copy[key] ?? key;
  },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    loading: false,
    session: null,
    user: null,
  }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
      signUp: vi.fn(),
    },
  },
}));

describe('RegisterController', () => {
  it('renders the register form without a schema runtime error', () => {
    render(<RegisterController />);

    expect(screen.getByRole('heading', { name: 'Buat Akun Baru' })).toBeInTheDocument();
    // Use regex to match label text even when MUI appends " *" for required fields
    expect(screen.getByLabelText(/Alamat Email/)).toBeInTheDocument();
  });
});
