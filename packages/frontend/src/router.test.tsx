import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routeConfig } from './router';

vi.mock('aws-amplify/auth', () => ({
  signOut: vi.fn(),
  fetchAuthSession: vi.fn().mockResolvedValue({ tokens: { idToken: { payload: { sub: 'u-1' } } } }),
}));
vi.mock('./hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, userId: 'u-1', isLoading: false }),
}));
vi.mock('./hooks/usePersonas', () => ({
  usePersonas: () => ({ personas: [], isLoading: false, error: null, createPersona: vi.fn(), updatePersona: vi.fn(), deletePersona: vi.fn(), generateDraft: vi.fn() }),
}));

function renderRoute(path: string) {
  const router = createMemoryRouter(routeConfig, { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}

describe('ルーティング再編', () => {
  it('/ から /personas にリダイレクトされる', async () => {
    renderRoute('/');
    await waitFor(() => {
      expect(screen.getByText(/ペルソナ/)).toBeInTheDocument();
    });
  });

  it('/dashboard から /personas にリダイレクトされる', async () => {
    renderRoute('/dashboard');
    await waitFor(() => {
      expect(screen.getByText(/ペルソナ/)).toBeInTheDocument();
    });
  });
});
