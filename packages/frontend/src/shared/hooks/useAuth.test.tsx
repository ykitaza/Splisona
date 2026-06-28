import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';

vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(),
}));

import { fetchAuthSession } from 'aws-amplify/auth';
const mockFetchAuthSession = vi.mocked(fetchAuthSession);

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_COGNITO_USER_POOL_ID', 'test-pool');
  });

  it('isLoading が true でスタートする', () => {
    mockFetchAuthSession.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(true);
  });

  it('セッションにトークンがある場合は isAuthenticated が true になる', async () => {
    mockFetchAuthSession.mockResolvedValue({
      tokens: { accessToken: { toString: () => 'token' } },
    } as never);
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('セッションにトークンがない場合は isAuthenticated が false になる', async () => {
    mockFetchAuthSession.mockResolvedValue({ tokens: undefined } as never);
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('fetchAuthSession が失敗した場合は isAuthenticated が false になる', async () => {
    mockFetchAuthSession.mockRejectedValue(new Error('No session'));
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
  });
});
