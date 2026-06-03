import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AuthShell from '@/components/auth/AuthShell';

describe('AuthShell', () => {
  it('renders a named main landmark and shared Arina branding', () => {
    render(
      <AuthShell brandSubtitle="Kelola kebun lebih cerdas.">
        <form aria-label="Form login">
          <button type="submit">Masuk</button>
        </form>
      </AuthShell>,
    );

    expect(screen.getByRole('main', { name: /autentikasi arina agri/i })).toBeInTheDocument();
    expect(screen.getAllByText('Arina Agri').length).toBeGreaterThan(0);
    expect(screen.getByRole('form', { name: /form login/i })).toBeInTheDocument();
  });
});
