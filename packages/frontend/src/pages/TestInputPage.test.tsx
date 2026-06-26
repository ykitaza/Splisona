import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TestInputPage } from './TestInputPage';
import { testDraft } from '../lib/testDraft';

vi.mock('../lib/testDraft', () => ({
  testDraft: {
    get: vi.fn(() => ({ title: '', fileA: null, fileB: null, personaIds: [] })),
    setTitle: vi.fn(),
    setFile: vi.fn(),
    setPersonaIds: vi.fn(),
    reset: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tests/new']}>
      <Routes>
        <Route path="/tests/new" element={<TestInputPage />} />
        <Route path="/tests/new/personas" element={<div>ペルソナ選択</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('TestInputPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(testDraft.get).mockReturnValue({ title: '', fileA: null, fileB: null, personaIds: [] });
  });

  it('タイトル入力欄とA/B画像アップロードエリアが表示される', () => {
    renderPage();
    expect(screen.getByLabelText(/テストタイトル/i)).toBeInTheDocument();
    expect(screen.getByText(/デザインA/i)).toBeInTheDocument();
    expect(screen.getByText(/デザインB/i)).toBeInTheDocument();
  });

  it('タイトルが空のとき次へボタンが無効', () => {
    renderPage();
    const nextBtn = screen.getByRole('button', { name: /次へ/i });
    expect(nextBtn).toBeDisabled();
  });

  it('タイトル入力でsetTitleが呼ばれる', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText(/テストタイトル/i), 'LP比較テスト');
    expect(testDraft.setTitle).toHaveBeenCalled();
  });

  it('ファイル選択でsetFileが呼ばれる', async () => {
    renderPage();
    const fileInputs = screen.getAllByTestId('file-input');
    const file = new File(['image'], 'design-a.png', { type: 'image/png' });
    await userEvent.upload(fileInputs[0], file);
    expect(testDraft.setFile).toHaveBeenCalledWith('A', file);
  });

  it('タイトルと両ファイル選択後に次へボタンが有効になる', () => {
    const fileA = new File(['a'], 'a.png', { type: 'image/png' });
    const fileB = new File(['b'], 'b.png', { type: 'image/png' });
    vi.mocked(testDraft.get).mockReturnValue({ title: 'テスト', fileA, fileB, personaIds: [] });

    renderPage();
    expect(screen.getByRole('button', { name: /次へ/i })).not.toBeDisabled();
  });

  it('次へをクリックするとペルソナ選択画面へ遷移する', async () => {
    const fileA = new File(['a'], 'a.png', { type: 'image/png' });
    const fileB = new File(['b'], 'b.png', { type: 'image/png' });
    vi.mocked(testDraft.get).mockReturnValue({ title: 'テスト', fileA, fileB, personaIds: [] });

    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /次へ/i }));
    expect(screen.getByText('ペルソナ選択')).toBeInTheDocument();
  });
});
