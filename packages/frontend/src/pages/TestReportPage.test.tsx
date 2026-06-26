import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TestReportPage } from './TestReportPage';
import type { ReportResponse } from '../types';

vi.mock('../api/tests', () => ({
  getReport: vi.fn(),
  exportTest: vi.fn(),
  executeTest: vi.fn(),
}));

import { getReport, executeTest } from '../api/tests';
const mockGetReport = vi.mocked(getReport);
const mockExecuteTest = vi.mocked(executeTest);

const mockReport: ReportResponse = {
  abTest: {
    testId: 'test-1',
    userId: 'u-1',
    title: 'LP比較テスト',
    status: 'completed',
    designAInput: { inputType: 'image_upload', imageKey: 'key-a' },
    designBInput: { inputType: 'image_upload', imageKey: 'key-b' },
    personaIds: ['p-1', 'p-2'],
    createdAt: '2026-06-25T00:00:00Z',
    updatedAt: '2026-06-25T01:00:00Z',
  },
  summary: {
    winner: 'A',
    supportRateA: 0.75,
    supportRateB: 0.25,
    totalPersonas: 4,
    completedPersonas: 4,
    avgScores: {
      A: { usability: 8, aesthetics: 7, clarity: 9, engagement: 8 },
      B: { usability: 6, aesthetics: 7, clarity: 6, engagement: 6 },
    },
    winnersReasonSummary: '',
  },
  evaluations: [
    {
      personaId: 'p-1',
      personaDisplayName: 'ハルト',
      winner: 'A',
      confidence: 85,
      reason: 'シンプルで見やすい',
      scores: { usability: 8, aesthetics: 7, clarity: 9, engagement: 8 },
      status: 'completed',
    },
    {
      personaId: 'p-2',
      personaDisplayName: 'ミサキ',
      winner: 'B',
      confidence: 60,
      reason: 'カラフルで好き',
      scores: { usability: 6, aesthetics: 8, clarity: 6, engagement: 7 },
      status: 'completed',
    },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tests/test-1/report']}>
      <Routes>
        <Route path="/tests/:id/report" element={<TestReportPage />} />
        <Route path="/tests/:id/running" element={<div>実行中</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('TestReportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('テストタイトルが表示される', async () => {
    mockGetReport.mockResolvedValue(mockReport);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('LP比較テスト')).toBeInTheDocument();
    });
  });

  it('勝者バッジが表示される', async () => {
    mockGetReport.mockResolvedValue(mockReport);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/デザインA 勝利/i)).toBeInTheDocument();
    });
  });

  it('支持率が表示される', async () => {
    mockGetReport.mockResolvedValue(mockReport);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/75%/i)).toBeInTheDocument();
      expect(screen.getByText(/25%/i)).toBeInTheDocument();
    });
  });

  it('ペルソナ別評価テーブルが表示される', async () => {
    mockGetReport.mockResolvedValue(mockReport);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('ハルト')).toBeInTheDocument();
      expect(screen.getByText('ミサキ')).toBeInTheDocument();
    });
  });

  it('再実行ボタンをクリックすると実行中画面へ遷移する', async () => {
    mockGetReport.mockResolvedValue(mockReport);
    mockExecuteTest.mockResolvedValue({ started: true });
    renderPage();

    await waitFor(() => screen.getByText('LP比較テスト'));
    await userEvent.click(screen.getByRole('button', { name: /再実行/i }));

    await waitFor(() => {
      expect(screen.getByText('実行中')).toBeInTheDocument();
    });
    expect(mockExecuteTest).toHaveBeenCalledWith('test-1');
  });

  it('ローディング中はスピナーが表示される', () => {
    mockGetReport.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
