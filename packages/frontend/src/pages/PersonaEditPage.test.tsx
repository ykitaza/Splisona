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

  it('保存失敗時にAPIエラーメッセージがアラートとして表示される', async () => {
    mockCreatePersona.mockRejectedValue(new ApiError(503, 'Service Unavailable'));
    renderNewPage();

    await userEvent.type(screen.getByLabelText(/表示名/i), 'ハルト');
    await userEvent.click(screen.getByRole('button', { name: /保存/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'AIサービスが一時的に利用できません。しばらく後でお試しください'
      );
    });
  });

  it('displayName未入力時にバリデーションエラーが表示される', async () => {
    renderNewPage();

    await userEvent.click(screen.getByRole('button', { name: /保存/i }));

    expect(screen.getByText(/表示名は必須です/i)).toBeInTheDocument();
    expect(mockCreatePersona).not.toHaveBeenCalled();
  });

  it('有効なデータで保存するとペルソナ一覧へ遷移する', async () => {
    mockCreatePersona.mockResolvedValue(samplePersona);
    renderNewPage();

    await userEvent.type(screen.getByLabelText(/表示名/i), 'ハルト');
    await userEvent.click(screen.getByRole('button', { name: /保存/i }));

    await waitFor(() => {
      expect(screen.getByText('ペルソナ一覧')).toBeInTheDocument();
    });

    expect(mockCreatePersona).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'ハルト' })
    );
  });
});

describe('PersonaEditPage - 編集', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPersona.mockResolvedValue(samplePersona);
  });

  it('既存データがフォームに表示される', async () => {
    renderEditPage();

    await waitFor(() => {
      expect((screen.getByLabelText(/表示名/i) as HTMLInputElement).value).toBe('ハルト');
    });
  });

  it('AIアシストボタンで下書きがfreeTextに反映される', async () => {
    mockGetPersona.mockResolvedValue(samplePersona);
    mockGenerateDraft.mockResolvedValue({
      freeText: 'AI生成の説明文',
      suggestedDescription: '提案説明',
    });
    renderEditPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /AIアシスト/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /AIアシスト/i }));

    await waitFor(() => {
      expect((screen.getByLabelText(/自由記述/i) as HTMLTextAreaElement).value).toBe('AI生成の説明文');
    });
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

  it('更新保存するとペルソナ一覧へ遷移する', async () => {
    mockUpdatePersona.mockResolvedValue({ ...samplePersona, displayName: '新しい名前' });
    renderEditPage();

    await waitFor(() => {
      expect((screen.getByLabelText(/表示名/i) as HTMLInputElement).value).toBe('ハルト');
    });

    await userEvent.clear(screen.getByLabelText(/表示名/i));
    await userEvent.type(screen.getByLabelText(/表示名/i), '新しい名前');
    await userEvent.click(screen.getByRole('button', { name: /保存/i }));

    await waitFor(() => {
      expect(screen.getByText('ペルソナ一覧')).toBeInTheDocument();
    });
  });
});
