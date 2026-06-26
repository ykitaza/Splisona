import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';
import type { ABTest } from '../types';

vi.mock('../hooks/useABTests');
import { useABTests } from '../hooks/useABTests';
const mockUseABTests = vi.mocked(useABTests);

const completedTest: ABTest = {
  testId: 'test-1',
  userId: 'user-1',
  title: 'ランディングページ比較',
  status: 'completed',
  designAInput: { inputType: 'image_upload' },
  designBInput: { inputType: 'image_upload' },
  personaIds: [],
  createdAt: '2026-06-20T00:00:00Z',
  updatedAt: '2026-06-20T01:00:00Z',
};

const runningTest: ABTest = {
  ...completedTest,
  testId: 'test-2',
  title: '決済フロー比較',
  status: 'running',
};

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/tests/:id/report" element={<div>レポート</div>} />
        <Route path="/tests/:id/running" element={<div>実行中</div>} />
        <Route path="/tests/new" element={<div>テスト作成</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('テスト一覧がカード形式で表示される', () => {
    mockUseABTests.mockReturnValue({ tests: [completedTest, runningTest], isLoading: false, error: null });
    renderDashboard();

    expect(screen.getByText('ランディングページ比較')).toBeInTheDocument();
    expect(screen.getByText('決済フロー比較')).toBeInTheDocument();
    expect(screen.getByText('完了')).toBeInTheDocument();
    expect(screen.getByText('実行中')).toBeInTheDocument();
  });

  it('完了テストをクリックするとレポート画面へ遷移する', async () => {
    mockUseABTests.mockReturnValue({ tests: [completedTest], isLoading: false, error: null });
    renderDashboard();

    await userEvent.click(screen.getByText('ランディングページ比較'));

    expect(screen.getByText('レポート')).toBeInTheDocument();
  });

  it('実行中テストをクリックすると進捗画面へ遷移する', async () => {
    mockUseABTests.mockReturnValue({ tests: [runningTest], isLoading: false, error: null });
    renderDashboard();

    await userEvent.click(screen.getByText('決済フロー比較'));

    expect(screen.getByText('実行中')).toBeInTheDocument();
  });

  it('テストが空の場合にEmptyStateと作成リンクを表示する', async () => {
    mockUseABTests.mockReturnValue({ tests: [], isLoading: false, error: null });
    renderDashboard();

    expect(screen.getByText(/テストがありません/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: /テストを作成する/i }));
    expect(screen.getByText('テスト作成')).toBeInTheDocument();
  });

  it('ローディング中はスピナーが表示される', () => {
    mockUseABTests.mockReturnValue({ tests: [], isLoading: true, error: null });
    renderDashboard();

    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
