import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/context/AuthContext';

const { getSession, onAuthStateChange, signOutMock } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOutMock: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession,
      onAuthStateChange,
      signOut: signOutMock,
    },
  },
}));

const originalEnv = { ...process.env };

function AuthProbe() {
  const { user, session, loading, startLocalSession } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user-id">{user?.id ?? ''}</span>
      <span data-testid="access-token">{session?.access_token ?? ''}</span>
      <button type="button" onClick={startLocalSession}>Local</button>
    </div>
  );
}

beforeEach(() => {
  Object.assign(process.env, { NODE_ENV: 'development' });
  window.localStorage.clear();
  getSession.mockResolvedValue({ data: { session: null } });
  onAuthStateChange.mockReturnValue({
    data: {
      subscription: {
        unsubscribe: vi.fn(),
      },
    },
  });
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe('AuthProvider development auth isolation', () => {
  it('uses a real Supabase session in development when one exists', async () => {
    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'real-session-token',
          user: {
            id: '11111111-1111-4111-8111-111111111111',
            email: 'real@example.com',
            user_metadata: { full_name: 'Real User' },
          },
        },
      },
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    expect(screen.getByTestId('user-id')).toHaveTextContent('11111111-1111-4111-8111-111111111111');
    expect(screen.getByTestId('access-token')).toHaveTextContent('real-session-token');
    expect(window.localStorage.getItem('arina_user_id')).toBe('11111111-1111-4111-8111-111111111111');
    expect(window.localStorage.getItem('arina_auth_mode')).toBeNull();
  });

  it('does not create a local development session until requested', async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    expect(screen.getByTestId('user-id')).toHaveTextContent('');
    expect(screen.getByTestId('access-token')).toHaveTextContent('');
    expect(window.localStorage.getItem('arina_user_id')).toBeNull();
    expect(window.localStorage.getItem('arina_auth_mode')).toBeNull();
  });

  it('starts a local development session with an isolated local user id', async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    screen.getByRole('button', { name: 'Local' }).click();

    await waitFor(() => {
      expect(screen.getByTestId('user-id').textContent).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    const userId = screen.getByTestId('user-id').textContent ?? '';
    expect(window.localStorage.getItem('arina_auth_mode')).toBe('local');
    expect(window.localStorage.getItem('arina_local_user_id')).toBe(userId);
    expect(window.localStorage.getItem('arina_user_id')).toBe(userId);
    expect(screen.getByTestId('access-token')).toHaveTextContent(`mock-token:${userId}`);
  });
});
