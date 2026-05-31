import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/context/AuthContext';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));

const originalEnv = { ...process.env };

function AuthProbe() {
  const { user, loading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user-id">{user?.id ?? ''}</span>
    </div>
  );
}

beforeEach(() => {
  Object.assign(process.env, { NODE_ENV: 'development' });
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('AuthProvider development fallback', () => {
  it('stores a UUID-shaped development user id for Supabase uuid columns', async () => {
    window.localStorage.setItem('arina_user_id', 'dev-user-id');

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    const userId = screen.getByTestId('user-id').textContent ?? '';
    expect(userId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(userId).not.toBe('dev-user-id');
    expect(window.localStorage.getItem('arina_user_id')).toBe(userId);
  });
});
