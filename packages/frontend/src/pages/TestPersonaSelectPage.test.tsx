import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TestPersonaSelectPage } from './TestPersonaSelectPage';
import { testDraft } from '../lib/testDraft';
import type { Persona } from '../types';

vi.mock('../lib/testDraft', () => ({
  testDraft: {
    get: vi.fn(() => ({ title: 'テスト', fileA: null, fileB: null, personaIds: [] })),
    setTitle: vi.fn(),
    setFile: vi.fn(),
    setPersonaIds: vi.fn(),
    reset: vi.fn(),
  },
}));

vi.mock('../hooks/usePersonas');
import { usePersonas } from '../hooks/usePersonas';
const mockUsePersonas = vi.mocked(usePersonas);

const defaultMutations = {
  createPersona: vi.fn(),
  updatePersona: vi.fn(),
  deletePersona: vi.fn(),
  generateDraft: vi.fn(),
};

const samplePersonas: Persona[] = [
  {
    personaId: 'p-1',
    userId: 'u-1',
    displayName: 'ハルト',
    type: 'business',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
  },
  {
    personaId: 'p-2',
    userId: 'u-1',
    displayName: 'ミサキ',
    type: 'consumer',
    createdAt: '2026-06-02T00:00:00Z',
    updatedAt: '2026-06-02T00:00:00Z',
  },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tests/new/personas']}>
      <Routes>
        <Route path="/tests/new/personas" element={<TestPersonaSelectPage />} />
        <Route path="/tests/new/confirm" element={<div>確認画面</div>} />
        <Route path="/tests/new" element={<div>デザイン入力</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('TestPersonaSelectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ペルソナ一覧がチェックボックス付きで表示される', () => {
    mockUsePersonas.mockReturnValue({ personas: samplePersonas, isLoading: false, error: null, ...defaultMutations });
    renderPage();

    expect(screen.getByRole('checkbox', { name: /ハルト/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /ミサキ/i })).toBeInTheDocument();
  });

  it('ペルソナ未選択のとき次へボタンが無効', () => {
    mockUsePersonas.mockReturnValue({ personas: samplePersonas, isLoading: false, error: null, ...defaultMutations });
    renderPage();

    expect(screen.getByRole('button', { name: /次へ/i })).toBeDisabled();
  });

  it('ペルソナを選択すると選択数が更新される', async () => {
    mockUsePersonas.mockReturnValue({ personas: samplePersonas, isLoading: false, error: null, ...defaultMutations });
    renderPage();

    await userEvent.click(screen.getByRole('checkbox', { name: /ハルト/i }));
    expect(screen.getByText(/1件選択/i)).toBeInTheDocument();
  });

  it('1件以上選択で次へボタンが有効になる', async () => {
    mockUsePersonas.mockReturnValue({ personas: samplePersonas, isLoading: false, error: null, ...defaultMutations });
    renderPage();

    await userEvent.click(screen.getByRole('checkbox', { name: /ハルト/i }));
    expect(screen.getByRole('button', { name: /次へ/i })).not.toBeDisabled();
  });

  it('次へをクリックするとsetPersonaIdsを呼び確認画面へ遷移する', async () => {
    mockUsePersonas.mockReturnValue({ personas: samplePersonas, isLoading: false, error: null, ...defaultMutations });
    renderPage();

    await userEvent.click(screen.getByRole('checkbox', { name: /ハルト/i }));
    await userEvent.click(screen.getByRole('button', { name: /次へ/i }));

    expect(testDraft.setPersonaIds).toHaveBeenCalledWith(['p-1']);
    expect(screen.getByText('確認画面')).toBeInTheDocument();
  });

  it('ローディング中はスピナーが表示される', () => {
    mockUsePersonas.mockReturnValue({ personas: [], isLoading: true, error: null, ...defaultMutations });
    renderPage();

    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
