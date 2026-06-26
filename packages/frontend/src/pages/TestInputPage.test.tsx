import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TestInputPage } from './TestInputPage';

vi.mock('../api/tests', () => ({
  createTest: vi.fn().mockResolvedValue({ testId: 'test-new' }),
  updateTest: vi.fn().mockResolvedValue({}),
  captureUrl: vi.fn().mockResolvedValue({ imageKey: 'cap-key' }),
  executeTest: vi.fn().mockResolvedValue(undefined),
  getUploadUrl: vi.fn().mockResolvedValue({ uploadUrl: 'http://upload', imageKey: 'up-key' }),
  uploadToS3: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../hooks/usePersonas', () => ({
  usePersonas: vi.fn(() => ({
    personas: [
      { personaId: 'p1', displayName: 'ハルト', type: 'general_consumer', age: 30, gender: '男性', source: 'default' },
      { personaId: 'p2', displayName: 'ミサキ', type: 'tech_savvy', age: 25, gender: '女性', source: 'default' },
    ],
    isLoading: false,
    createPersona: vi.fn(),
    deletePersona: vi.fn(),
  })),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tests/new']}>
      <Routes>
        <Route path="/tests/new" element={<TestInputPage />} />
        <Route path="/tests/:id/running" element={<div>実行中</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TestInputPage (統合後)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Stepper が表示されない', () => {
    renderPage();
    expect(screen.queryByText('ペルソナ選択')).not.toBeInTheDocument();
    expect(screen.queryByText('確認')).not.toBeInTheDocument();
  });

  it('ペルソナ選択ボタンが表示される', () => {
    renderPage();
    expect(screen.getByText(/ペルソナを選択/)).toBeInTheDocument();
  });

  it('変更ボタンをクリックするとモーダルが開く', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText('変更'));
    await waitFor(() => {
      expect(screen.getByTestId('modal-overlay')).toBeInTheDocument();
    });
  });

  it('「作成して実行」ボタンが表示される', () => {
    renderPage();
    expect(screen.getByText(/作成して実行/)).toBeInTheDocument();
  });
});
