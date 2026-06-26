import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PersonaDetailPage } from './PersonaDetailPage';

vi.mock('../api/personas', () => ({
  getPersona: vi.fn(),
  sendInterviewMessage: vi.fn(),
}));

import { getPersona, sendInterviewMessage } from '../api/personas';
const mockGetPersona = vi.mocked(getPersona);
const mockSendInterviewMessage = vi.mocked(sendInterviewMessage);

const samplePersona = {
  personaId: 'p-1',
  userId: 'u-1',
  displayName: 'ハルト',
  type: 'business' as const,
  occupation: '営業職',
  age: 32,
  gender: '男性',
  freeText: 'せっかちなビジネスマン',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

function createMockStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

function renderDetailPage() {
  return render(
    <MemoryRouter initialEntries={['/personas/p-1']}>
      <Routes>
        <Route path="/personas/:id" element={<PersonaDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PersonaDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPersona.mockResolvedValue(samplePersona);
  });

  it('ペルソナの表示名・タイプ・職業が表示される', async () => {
    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByText('ハルト')).toBeInTheDocument();
    });
    expect(screen.getByText(/ビジネスパーソン/)).toBeInTheDocument();
    expect(screen.getByText(/営業職/)).toBeInTheDocument();
  });

  it('メッセージ送信後にストリーミングレスポンスが表示される', async () => {
    mockSendInterviewMessage.mockResolvedValue(createMockStream('こんにちは！よろしくお願いします。'));
    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    await userEvent.type(screen.getByRole('textbox'), 'こんにちは');
    await userEvent.click(screen.getByRole('button', { name: /送信/i }));

    await waitFor(() => {
      expect(screen.getByText('こんにちは！よろしくお願いします。')).toBeInTheDocument();
    });

    expect(mockSendInterviewMessage).toHaveBeenCalledWith('p-1', [
      { role: 'user', content: 'こんにちは' },
    ]);
  });

  it('生成中はインジケーターが表示されテキストボックスが無効になる', async () => {
    let resolveStream!: (stream: ReadableStream<Uint8Array> | null) => void;
    mockSendInterviewMessage.mockReturnValue(new Promise((r) => { resolveStream = r; }));
    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    await userEvent.type(screen.getByRole('textbox'), 'こんにちは');
    await userEvent.click(screen.getByRole('button', { name: /送信/i }));

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeDisabled();

    resolveStream(createMockStream('回答'));
  });

  it('送信失敗時に再試行ボタンが表示される', async () => {
    mockSendInterviewMessage.mockRejectedValue(new Error('接続エラー'));
    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    await userEvent.type(screen.getByRole('textbox'), 'こんにちは');
    await userEvent.click(screen.getByRole('button', { name: /送信/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /再試行/i })).toBeInTheDocument();
    });
  });
});
