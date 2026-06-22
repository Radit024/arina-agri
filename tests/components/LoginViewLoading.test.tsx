import { useForm } from 'react-hook-form';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LoginView from '@/app/login/_components/LoginView';
import type { LoginForm } from '@/controllers/login/useLoginController';

const copy: Record<string, string> = {
  branding: 'Kelola kebun Anda lebih cerdas.',
  title: 'Selamat Datang Kembali',
  subtitle: 'Silakan masuk untuk melanjutkan.',
  email: 'Alamat Email',
  password: 'Kata Sandi',
  forgotPassword: 'Lupa kata sandi?',
  submit: 'Masuk',
  google: 'Masuk dengan Google',
  noAccount: 'Belum punya akun?',
  registerNow: 'Daftar Sekarang',
  processing: 'Memproses...',
  preparingDashboard: 'Menyiapkan dashboard...',
  formLabel: 'Form login',
  localLogin: 'Masuk mode lokal',
};

function LoginViewHarness({ localLoginEnabled = false }: { localLoginEnabled?: boolean }) {
  const form = useForm<LoginForm>({
    defaultValues: { email: '', password: '' },
  });

  return (
    <LoginView
      control={form.control}
      error={null}
      errors={{}}
      googleLoading={false}
      handleGoogleSignIn={vi.fn()}
      handleLocalSignIn={vi.fn()}
      handleSubmit={form.handleSubmit}
      localLoading={false}
      localLoginEnabled={localLoginEnabled}
      loading={false}
      onSubmit={vi.fn()}
      redirecting
      showPassword={false}
      t={(key) => copy[key] ?? key}
      togglePassword={vi.fn()}
    />
  );
}

describe('LoginView loading transition', () => {
  it('keeps clear feedback while the dashboard route is being prepared', () => {
    render(<LoginViewHarness />);

    expect(screen.getByRole('form', { name: /login/i })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getAllByText('Menyiapkan dashboard...').length).toBeGreaterThan(0);
    expect(screen.getByRole('progressbar', { name: /menyiapkan dashboard/i })).toBeInTheDocument();
  });

  it('shows the local login action only when enabled', () => {
    const { rerender } = render(<LoginViewHarness />);

    expect(screen.queryByRole('button', { name: 'Masuk mode lokal' })).not.toBeInTheDocument();

    rerender(<LoginViewHarness localLoginEnabled />);

    expect(screen.getByRole('button', { name: 'Masuk mode lokal' })).toBeInTheDocument();
  });
});
