import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SignInPage } from './SignInPage';

vi.mock('aws-amplify/auth', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

import { signIn } from 'aws-amplify/auth';
const mockSignIn = vi.mocked(signIn);

function renderSignInPage() {
  return render(
    <MemoryRouter initialEntries={['/signin']}>
      <Routes>
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/personas" element={<div>ペルソナ一覧</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SignInPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_COGNITO_USER_POOL_ID', 'test-pool');
  });

  it('メールとパスワードの入力フィールドが表示される', () => {
    renderSignInPage();
    expect(screen.getByLabelText(/メールアドレス/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/パスワード/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /サインイン/i })).toBeInTheDocument();
  });

  it('有効な認証情報でサインインするとペルソナ一覧へ遷移する', async () => {
    mockSignIn.mockResolvedValue({ isSignedIn: true, nextStep: { signInStep: 'DONE' } } as never);
    renderSignInPage();

    await userEvent.type(screen.getByLabelText(/メールアドレス/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/パスワード/i), 'Password123!');
    await userEvent.click(screen.getByRole('button', { name: /サインイン/i }));

    await waitFor(() => {
      expect(screen.getByText('ペルソナ一覧')).toBeInTheDocument();
    });
  });

  it('無効な認証情報ではエラーメッセージを表示する', async () => {
    mockSignIn.mockRejectedValue(new Error('Incorrect username or password.'));
    renderSignInPage();

    await userEvent.type(screen.getByLabelText(/メールアドレス/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/パスワード/i), 'wrongpassword');
    await userEvent.click(screen.getByRole('button', { name: /サインイン/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('メールが空の場合はフォームを送信しない', async () => {
    renderSignInPage();
    await userEvent.click(screen.getByRole('button', { name: /サインイン/i }));
    expect(mockSignIn).not.toHaveBeenCalled();
  });
});
