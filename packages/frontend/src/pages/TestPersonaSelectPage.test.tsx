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
    type: 'action_oriented',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
  },
  {
    personaId: 'p-2',
    userId: 'u-1',
    displayName: 'ミサキ',
    type: 'cautious',
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

  it('ペルソナ未選択のとき次へボタンが無効', () => {
    mockUsePersonas.mockReturnValue({ personas: samplePersonas, isLoading: false, error: null, ...defaultMutations });
    renderPage();

    expect(screen.getByRole('button', { name: /次へ/i })).toBeDisabled();
  });

  it('ローディング中はスピナーが表示される', () => {
    mockUsePersonas.mockReturnValue({ personas: [], isLoading: true, error: null, ...defaultMutations });
    renderPage();

    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
