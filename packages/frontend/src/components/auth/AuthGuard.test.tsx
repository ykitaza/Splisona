import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthGuard } from './AuthGuard';

vi.mock('../../hooks/useAuth');

import { useAuth } from '../../hooks/useAuth';
const mockUseAuth = vi.mocked(useAuth);

function renderWithRouter(authenticated: boolean, loading = false) {
  mockUseAuth.mockReturnValue({ isAuthenticated: authenticated, isLoading: loading });
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/signin" element={<div>サインイン画面</div>} />
        <Route element={<AuthGuard />}>
          <Route path="/dashboard" element={<div>ダッシュボード</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('AuthGuard', () => {
  it('認証済みユーザーはコンテンツを表示できる', () => {
    renderWithRouter(true);
    expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
  });

  it('未認証ユーザーはサインイン画面へリダイレクトされる', () => {
    renderWithRouter(false);
    expect(screen.getByText('サインイン画面')).toBeInTheDocument();
    expect(screen.queryByText('ダッシュボード')).not.toBeInTheDocument();
  });

  it('ローディング中はスピナーを表示する', () => {
    renderWithRouter(false, true);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
