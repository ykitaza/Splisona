import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthGuard } from './AuthGuard';

vi.mock('@/shared/hooks/useAuth');

import { useAuth } from '@/shared/hooks/useAuth';
const mockUseAuth = vi.mocked(useAuth);

function renderWithRouter(authenticated: boolean, loading = false) {
  mockUseAuth.mockReturnValue({ isAuthenticated: authenticated, isLoading: loading });
  return render(
    <MemoryRouter initialEntries={['/personas']}>
      <Routes>
        <Route path="/signin" element={<div>サインイン画面</div>} />
        <Route element={<AuthGuard />}>
          <Route path="/personas" element={<div>ペルソナ一覧</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('AuthGuard', () => {
  it('未認証ユーザーはサインイン画面へリダイレクトされる', () => {
    renderWithRouter(false);
    expect(screen.getByText('サインイン画面')).toBeInTheDocument();
    expect(screen.queryByText('ペルソナ一覧')).not.toBeInTheDocument();
  });

  it('ローディング中はスピナーを表示する', () => {
    renderWithRouter(false, true);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
