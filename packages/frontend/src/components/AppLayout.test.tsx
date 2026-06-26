import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './AppLayout';

vi.mock('aws-amplify/auth', () => ({ signOut: vi.fn() }));

function renderLayout(path = '/personas') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/personas" element={<div>ペルソナ一覧</div>} />
          <Route path="/tests/new" element={<div>テスト作成</div>} />
          <Route path="/results" element={<div>結果一覧</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('AppLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true });
  });

  describe('ナビゲーション項目', () => {
    it('「ペルソナ」「A/Bテスト」「結果」の3項目が表示される', () => {
      renderLayout();

      expect(screen.getByText('ペルソナ')).toBeInTheDocument();
      expect(screen.getByText('A/Bテスト')).toBeInTheDocument();
      expect(screen.getByText('結果')).toBeInTheDocument();
    });

    it('「ダッシュボード」ナビ項目が存在しない', () => {
      renderLayout();

      expect(screen.queryByText('ダッシュボード')).not.toBeInTheDocument();
    });

    it('ナビ項目が正しいルートにリンクしている', () => {
      renderLayout();

      const personaLink = screen.getByText('ペルソナ').closest('a');
      const testLink = screen.getByText('A/Bテスト').closest('a');
      const resultLink = screen.getByText('結果').closest('a');
      expect(personaLink).toHaveAttribute('href', '/personas');
      expect(testLink).toHaveAttribute('href', '/tests/new');
      expect(resultLink).toHaveAttribute('href', '/results');
    });
  });

  describe('ダークテーマ', () => {
    it('サイドバーが bg-surface で描画される', () => {
      const { container } = renderLayout();
      const sidebar = container.querySelector('aside');
      expect(sidebar?.className).toContain('bg-surface');
    });

    it('メインコンテンツ領域が bg-base で描画される', () => {
      const { container } = renderLayout();
      const main = container.querySelector('main');
      expect(main?.className).toContain('bg-base');
    });

    it('ルートコンテナが bg-base で描画される', () => {
      const { container } = renderLayout();
      const root = container.firstElementChild;
      expect(root?.className).toContain('bg-base');
    });
  });

  describe('AboutModal', () => {
    it('AboutModal がダークトークンで描画される', async () => {
      renderLayout();
      const user = userEvent.setup();

      const accountButton = screen.getByRole('button', { name: /アカウントメニュー/i });
      await user.click(accountButton);

      await user.click(screen.getByText('Chorus について'));

      const modalContent = screen.getByTestId('about-modal-content');
      expect(modalContent.className).toContain('bg-surface');
    });
  });
});
