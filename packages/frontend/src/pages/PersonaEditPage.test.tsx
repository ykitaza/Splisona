import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PersonaEditPage } from './PersonaEditPage';

vi.mock('../api/personas', () => ({
  createPersona: vi.fn(),
  updatePersona: vi.fn(),
  generateDraft: vi.fn(),
  uploadPersonaAvatar: vi.fn(),
  getAvatarUrl: vi.fn((key: string) => `http://localhost:3001/images/${key}`),
}));

import { createPersona } from '../api/personas';
const mockCreatePersona = vi.mocked(createPersona);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/personas/new']}>
      <Routes>
        <Route path="/personas/new" element={<PersonaEditPage />} />
        <Route path="/personas" element={<div>ペルソナ一覧</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PersonaEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('表示名未入力時にバリデーションエラーが表示される', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /保存/i }));

    expect(screen.getByText(/表示名は必須です/i)).toBeInTheDocument();
    expect(mockCreatePersona).not.toHaveBeenCalled();
  });

  it('ヘッダーに新規ペルソナのEyebrowが表示される', () => {
    renderPage();

    expect(screen.getByText('新規ペルソナ')).toBeInTheDocument();
    expect(screen.getByText('ペルソナを作成')).toBeInTheDocument();
  });
});
