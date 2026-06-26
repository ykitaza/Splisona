import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PersonaUnifiedPage } from './PersonaUnifiedPage';

vi.mock('../api/personas', () => ({
  getPersona: vi.fn().mockResolvedValue({
    personaId: 'p-1',
    userId: 'u-1',
    displayName: 'ハルト',
    type: 'action_oriented',
    age: 32,
    gender: '男性',
    occupation: '営業職',
    freeText: '時間に追われるビジネスマン',
    createdAt: '2026-06-25T00:00:00Z',
    updatedAt: '2026-06-25T01:00:00Z',
  }),
  updatePersona: vi.fn().mockResolvedValue({}),
  deletePersona: vi.fn().mockResolvedValue(undefined),
  sendInterviewMessage: vi.fn().mockResolvedValue('回答テキスト'),
  generateDraft: vi.fn().mockResolvedValue({ freeText: 'generated' }),
  uploadPersonaAvatar: vi.fn().mockResolvedValue('avatar-key'),
  getAvatarUrl: vi.fn((key: string) => `/avatar/${key}`),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/personas/p-1']}>
      <Routes>
        <Route path="/personas/:id" element={<PersonaUnifiedPage />} />
        <Route path="/personas" element={<div>一覧</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PersonaUnifiedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ペルソナ名と2タブが表示される', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('ハルト').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText('編集')).toBeInTheDocument();
    expect(screen.getByText('インタビュー')).toBeInTheDocument();
  });

  it('編集タブでフォームが表示される', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('ハルト').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByLabelText(/ペルソナ名/)).toBeInTheDocument();
  });

  it('インタビュータブに切替できる', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('インタビュー')).toBeInTheDocument();
    });

    await user.click(screen.getByText('インタビュー'));
    expect(screen.getByPlaceholderText(/メッセージを入力/)).toBeInTheDocument();
  });

  it('右カラムにタイプと人物像が表示される', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('時間に追われるビジネスマン').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('FieldSlider でスライダーが表示される', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('ハルト').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getAllByRole('slider').length).toBeGreaterThanOrEqual(2);
  });

  it('sticky フッターに削除・キャンセル・保存ボタンがある', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('ハルト').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText('削除')).toBeInTheDocument();
    expect(screen.getByText('キャンセル')).toBeInTheDocument();
    expect(screen.getByText('保存')).toBeInTheDocument();
  });

  it('合成プロンプトプレビューの折りたたみが存在する', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('ハルト').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText('合成プロンプト')).toBeInTheDocument();
  });

  it('インタビュータブでメッセージ送信するとChatBubbleが表示される', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('インタビュー')).toBeInTheDocument();
    });

    await user.click(screen.getByText('インタビュー'));
    const textarea = screen.getByPlaceholderText(/メッセージを入力/);
    await user.type(textarea, 'テストメッセージ');
    await user.click(screen.getByRole('button', { name: '' })); // send button

    await waitFor(() => {
      expect(screen.getByText('テストメッセージ')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('回答テキスト')).toBeInTheDocument();
    });
  });
});
