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

vi.mock('../hooks/usePersonas', () => ({
  usePersonas: vi.fn(() => ({ personas: [], isLoading: false, createPersona: vi.fn(), deletePersona: vi.fn() })),
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
    supportRateNone: 0,
    totalPersonas: 4,
    completedPersonas: 4,
    avgScores: {
      A: { usability: 8, aesthetics: 7, clarity: 9, engagement: 8, trust: 7 },
      B: { usability: 6, aesthetics: 7, clarity: 6, engagement: 6, trust: 5 },
    },
    winnersReasonSummary: '',
    reasonSummaryA: ['情報の優先順位が明確で迷わない'],
    reasonSummaryB: ['ビジュアルのインパクトが強い'],
  },
  evaluations: [
    {
      personaId: 'p-1',
      personaDisplayName: 'ハルト',
      winner: 'A',
      confidence: 85,
      reason: 'シンプルで見やすい',
      scoresA: { usability: 80, aesthetics: 70, clarity: 90, engagement: 80, trust: 75 },
      scoresB: { usability: 55, aesthetics: 65, clarity: 50, engagement: 60, trust: 45 },
      status: 'completed',
    },
    {
      personaId: 'p-2',
      personaDisplayName: 'ミサキ',
      winner: 'B',
      confidence: 60,
      reason: 'カラフルで好き',
      scoresA: { usability: 60, aesthetics: 55, clarity: 60, engagement: 58, trust: 55 },
      scoresB: { usability: 70, aesthetics: 85, clarity: 65, engagement: 75, trust: 70 },
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

  it('ペルソナ別評価テーブルが表示される', async () => {
    mockGetReport.mockResolvedValue(mockReport);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('ハルト')).toBeInTheDocument();
      expect(screen.getByText('ミサキ')).toBeInTheDocument();
    });
  });

  it('ローディング中はスピナーが表示される', () => {
    mockGetReport.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('3セグメントバーが表示され DonutChart が存在しない', async () => {
    mockGetReport.mockResolvedValue(mockReport);
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('segment-bar')).toBeInTheDocument();
    });

    expect(screen.queryByText('🏆 WINNER')).not.toBeInTheDocument();
  });

  it('5軸の評価ラベルが表示される（信頼感を含む）', async () => {
    mockGetReport.mockResolvedValue(mockReport);
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('信頼感').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('N人中M人がAを支持のテキストが表示される', async () => {
    mockGetReport.mockResolvedValue(mockReport);
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText(/4人中3人が支持/).length).toBeGreaterThanOrEqual(1);
    });
  });
});
