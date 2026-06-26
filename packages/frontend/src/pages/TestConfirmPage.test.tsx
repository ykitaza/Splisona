import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TestConfirmPage } from './TestConfirmPage';
import { testDraft } from '../lib/testDraft';

vi.mock('../lib/testDraft', () => ({
  testDraft: {
    get: vi.fn(() => ({
      title: 'LPテスト',
      fileA: new File(['a'], 'a.png', { type: 'image/png' }),
      fileB: new File(['b'], 'b.png', { type: 'image/png' }),
      personaIds: ['p-1', 'p-2'],
    })),
    setTitle: vi.fn(),
    setFile: vi.fn(),
    setPersonaIds: vi.fn(),
    reset: vi.fn(),
  },
}));

vi.mock('../api/tests', () => ({
  createTest: vi.fn(),
  getUploadUrl: vi.fn(),
  uploadToS3: vi.fn(),
  updateTest: vi.fn(),
  executeTest: vi.fn(),
}));

import { createTest, getUploadUrl, uploadToS3, updateTest, executeTest } from '../api/tests';
const mockCreateTest = vi.mocked(createTest);
const mockGetUploadUrl = vi.mocked(getUploadUrl);
const mockUploadToS3 = vi.mocked(uploadToS3);
const mockUpdateTest = vi.mocked(updateTest);
const mockExecuteTest = vi.mocked(executeTest);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tests/new/confirm']}>
      <Routes>
        <Route path="/tests/new/confirm" element={<TestConfirmPage />} />
        <Route path="/tests/:id/running" element={<div>実行中</div>} />
        <Route path="/tests/new/personas" element={<div>ペルソナ選択</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('TestConfirmPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(testDraft.get).mockReturnValue({
      title: 'LPテスト',
      fileA: new File(['a'], 'a.png', { type: 'image/png' }),
      fileB: new File(['b'], 'b.png', { type: 'image/png' }),
      personaIds: ['p-1', 'p-2'],
    });
  });

  it('テストタイトルと選択ペルソナ数が表示される', () => {
    renderPage();
    expect(screen.getByText('LPテスト')).toBeInTheDocument();
    expect(screen.getByText(/2件/i)).toBeInTheDocument();
  });

  it('テスト実行ボタンが表示される', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /テスト実行/i })).toBeInTheDocument();
  });

  it('テスト実行ボタンをクリックするとAPIを呼び実行中画面へ遷移する', async () => {
    const mockTest = {
      testId: 'test-abc',
      userId: 'u-1',
      title: 'LPテスト',
      status: 'draft' as const,
      designAInput: { inputType: 'image_upload' as const },
      designBInput: { inputType: 'image_upload' as const },
      personaIds: [],
      createdAt: '',
      updatedAt: '',
    };
    mockCreateTest.mockResolvedValue(mockTest);
    mockGetUploadUrl
      .mockResolvedValueOnce({ uploadUrl: 'https://s3.example.com/a', imageKey: 'key-a' })
      .mockResolvedValueOnce({ uploadUrl: 'https://s3.example.com/b', imageKey: 'key-b' });
    mockUploadToS3.mockResolvedValue(undefined);
    mockUpdateTest.mockResolvedValue({ ...mockTest, status: 'draft' });
    mockExecuteTest.mockResolvedValue({ started: true });

    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /テスト実行/i }));

    await waitFor(() => {
      expect(screen.getByText('実行中')).toBeInTheDocument();
    });

    expect(mockCreateTest).toHaveBeenCalledTimes(1);
    expect(mockGetUploadUrl).toHaveBeenCalledTimes(2);
    expect(mockUploadToS3).toHaveBeenCalledTimes(2);
    expect(mockUpdateTest).toHaveBeenCalledTimes(1);
    expect(mockExecuteTest).toHaveBeenCalledWith('test-abc');
    expect(testDraft.reset).toHaveBeenCalled();
  });

  it('API失敗時にエラーメッセージが表示される', async () => {
    mockCreateTest.mockRejectedValue(new Error('サーバーエラー'));

    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /テスト実行/i }));

    await waitFor(() => {
      expect(screen.getByText(/サーバーエラー/i)).toBeInTheDocument();
    });
  });
});
