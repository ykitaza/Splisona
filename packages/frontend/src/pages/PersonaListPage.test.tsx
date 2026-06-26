import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PersonaListPage } from './PersonaListPage';
import type { Persona } from '../types';

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
    occupation: '営業職',
    age: 32,
    gender: '男性',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
  },
  {
    personaId: 'p-2',
    userId: 'u-1',
    displayName: 'ミサキ',
    type: 'consumer',
    occupation: '専業主婦',
    age: 41,
    gender: '女性',
    createdAt: '2026-06-02T00:00:00Z',
    updatedAt: '2026-06-02T00:00:00Z',
  },
];

function renderPersonaList() {
  return render(
    <MemoryRouter initialEntries={['/personas']}>
      <Routes>
        <Route path="/personas" element={<PersonaListPage />} />
        <Route path="/personas/new" element={<div>ペルソナ作成</div>} />
        <Route path="/personas/:id/edit" element={<div>ペルソナ編集</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PersonaListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ペルソナカードがグリッド表示される', () => {
    mockUsePersonas.mockReturnValue({ personas: samplePersonas, isLoading: false, error: null, ...defaultMutations });
    renderPersonaList();

    expect(screen.getByText('ハルト')).toBeInTheDocument();
    expect(screen.getByText('ミサキ')).toBeInTheDocument();
    expect(screen.getByText('営業職')).toBeInTheDocument();
    expect(screen.getByText('専業主婦')).toBeInTheDocument();
  });

  it('ペルソナがない場合にEmptyStateが表示される', () => {
    mockUsePersonas.mockReturnValue({ personas: [], isLoading: false, error: null, ...defaultMutations });
    renderPersonaList();

    expect(screen.getByText(/ペルソナがありません/i)).toBeInTheDocument();
  });

  it('新規作成ボタンをクリックするとペルソナ作成画面へ遷移する', async () => {
    // ペルソナあり状態にするとヘッダーボタンのみが "ペルソナを作成" に一致する
    mockUsePersonas.mockReturnValue({ personas: samplePersonas, isLoading: false, error: null, ...defaultMutations });
    renderPersonaList();

    await userEvent.click(screen.getByRole('link', { name: /ペルソナを作成/i }));
    expect(screen.getByText('ペルソナ作成')).toBeInTheDocument();
  });
});
