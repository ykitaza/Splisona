import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TestRunningPage } from './TestRunningPage';

vi.mock('../api/tests', () => ({
  getProgress: vi.fn(),
}));

import { getProgress } from '../api/tests';
const mockGetProgress = vi.mocked(getProgress);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tests/test-123/running']}>
      <Routes>
        <Route path="/tests/:id/running" element={<TestRunningPage />} />
        <Route path="/tests/:id/report" element={<div>レポート</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('TestRunningPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('実行中の進捗が表示される', async () => {
    mockGetProgress.mockResolvedValue({ total: 10, completed: 3, failed: 0, status: 'running' });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/3 \/ 10/i)).toBeInTheDocument();
    });
  });

  it('進捗バーが表示される', async () => {
    mockGetProgress.mockResolvedValue({ total: 10, completed: 5, failed: 0, status: 'running' });
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('status=completedになるとレポート画面へ自動遷移する', async () => {
    mockGetProgress.mockResolvedValue({ total: 10, completed: 10, failed: 0, status: 'completed' });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('レポート')).toBeInTheDocument();
    });
  });

  it('失敗件数が表示される', async () => {
    mockGetProgress.mockResolvedValue({ total: 10, completed: 8, failed: 2, status: 'running' });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/失敗: 2/i)).toBeInTheDocument();
    });
  });
});
