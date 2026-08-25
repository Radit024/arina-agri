import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUnclassifiedTransactions } from '@/hooks/useUnclassifiedTransactions';
import { migrationApi } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  migrationApi: {
    getUnclassifiedTransactions: vi.fn(),
  },
}));

const mockUseAuth = vi.fn();
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

beforeEach(() => {
  vi.mocked(migrationApi.getUnclassifiedTransactions).mockReset();
  mockUseAuth.mockReset();
});

describe('useUnclassifiedTransactions', () => {
  it('does not call the API in guest mode', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'guest-user' }, loading: false, isGuestMode: true });

    const { result } = renderHook(() => useUnclassifiedTransactions('project-123'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(migrationApi.getUnclassifiedTransactions).not.toHaveBeenCalled();
    expect(result.current.unclassified).toEqual([]);
    expect(result.current.count).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('fetches unclassified transactions for signed-in users', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, loading: false, isGuestMode: false });
    vi.mocked(migrationApi.getUnclassifiedTransactions).mockResolvedValue([]);

    const { result } = renderHook(() => useUnclassifiedTransactions('project-123'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(migrationApi.getUnclassifiedTransactions).toHaveBeenCalledWith('project-123');
  });
});
