import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PersonaEditPage } from './PersonaEditPage';
import { ApiError } from '../api/client';

vi.mock('../api/personas', () => ({
  getPersona: vi.fn(),
  createPersona: vi.fn(),
  updatePersona: vi.fn(),
  deletePersona: vi.fn(),
  generateDraft: vi.fn(),
  uploadPersonaAvatar: vi.fn(),
  getPersonaUploadUrl: vi.fn(),
  getAvatarUrl: vi.fn((key: string) => `http://localhost:3001/stub-upload/${key}`),
}));

import { getPersona, createPersona, updatePersona, deletePersona, generateDraft } from '../api/personas';
const mockGetPersona = vi.mocked(getPersona);
const mockCreatePersona = vi.mocked(createPersona);
const mockUpdatePersona = vi.mocked(updatePersona);
const mockDeletePersona = vi.mocked(deletePersona);
const mockGenerateDraft = vi.mocked(generateDraft);

const samplePersona = {
  personaId: 'p-1',
  userId: 'u-1',
  displayName: 'ハルト',
  type: 'business' as const,
  occupation: '営業職',
  age: 32,
  gender: '男性',
  freeText: 'せっかちなビジネスマン',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

function renderNewPage() {
  return render(
    <MemoryRouter initialEntries={['/personas/new']}>
      <Routes>
        <Route path="/personas/new" element={<PersonaEditPage />} />
        <Route path="/personas" element={<div>ペルソナ一覧</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function renderEditPage() {
  return render(
    <MemoryRouter initialEntries={['/personas/p-1/edit']}>
      <Routes>
        <Route path="/personas/:id/edit" element={<PersonaEditPage />} />
        <Route path="/personas" element={<div>ペルソナ一覧</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PersonaEditPage - 新規作成', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displayName未入力時にバリデーションエラーが表示される', async () => {
    renderNewPage();

    await userEvent.click(screen.getByRole('button', { name: /保存/i }));

    expect(screen.getByText(/表示名は必須です/i)).toBeInTheDocument();
    expect(mockCreatePersona).not.toHaveBeenCalled();
  });
});

describe('PersonaEditPage - 編集', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPersona.mockResolvedValue(samplePersona);
  });

  it('削除ボタンをクリックすると削除されペルソナ一覧へ遷移する', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockDeletePersona.mockResolvedValue({ deleted: true });
    renderEditPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /削除/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /削除/i }));

    await waitFor(() => {
      expect(screen.getByText('ペルソナ一覧')).toBeInTheDocument();
    });

    expect(mockDeletePersona).toHaveBeenCalledWith('p-1');
  });
});
