import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TestListPage } from './TestListPage';

vi.mock('./useABTests', () => ({
  useABTests: vi.fn(() => ({
    tests: [
      {
        testId: 't1',
        userId: 'u1',
        title: 'LP比較テスト',
        status: 'completed',
        designAInput: { inputType: 'image_upload', imageKey: 'key-a' },
        designBInput: { inputType: 'image_upload', imageKey: 'key-b' },
        personaIds: ['p1', 'p2', 'p3'],
        createdAt: '2026-06-25T00:00:00Z',
        updatedAt: '2026-06-25T01:00:00Z',
        summary: { winner: 'A', supportRateA: 0.75, supportRateB: 0.25, supportRateNone: 0 },
      },
      {
        testId: 't2',
        userId: 'u1',
        title: 'ヘッダー改善',
        status: 'running',
        designAInput: { inputType: 'image_upload', imageKey: 'key-c' },
        designBInput: { inputType: 'image_upload', imageKey: 'key-d' },
        personaIds: ['p1'],
        createdAt: '2026-06-24T00:00:00Z',
        updatedAt: '2026-06-24T01:00:00Z',
      },
    ],
    isLoading: false,
    deleteTest: vi.fn(),
    deleteTests: vi.fn(),
  })),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/results']}>
      <Routes>
        <Route path="/results" element={<TestListPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TestListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('テスト名が表示される', () => {
    renderPage();
    expect(screen.getByText('LP比較テスト')).toBeInTheDocument();
    expect(screen.getByText('ヘッダー改善')).toBeInTheDocument();
  });

  it('タイトルが表示される', () => {
    renderPage();
    const heading = screen.getByText('A/Bテスト');
    expect(heading.tagName).toBe('H1');
  });

  it('検索バーが表示される', () => {
    renderPage();
    expect(screen.getByPlaceholderText('テストを検索...')).toBeInTheDocument();
  });

  it('「テストを選択」ボタンで選択モードに入る', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('テストを選択'));
    expect(screen.getByText('0件を選択中')).toBeInTheDocument();
    expect(screen.getByText('キャンセル')).toBeInTheDocument();
  });

  it('新規テストリンクが表示される', () => {
    renderPage();
    const link = screen.getByText('新規テスト').closest('a');
    expect(link).toHaveAttribute('href', '/tests/new');
  });
});
