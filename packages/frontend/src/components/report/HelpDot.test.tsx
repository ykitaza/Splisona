import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HelpDot } from './HelpDot';

describe('HelpDot', () => {
  it('? マークを表示する', () => {
    render(<HelpDot content="テスト説明" />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('クリックでポップオーバーを表示する', async () => {
    const user = userEvent.setup();
    render(<HelpDot content="テスト説明" />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByText('テスト説明')).toBeInTheDocument();
  });

  it('再クリックでポップオーバーを閉じる', async () => {
    const user = userEvent.setup();
    render(<HelpDot content="テスト説明" />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByText('テスト説明')).toBeInTheDocument();

    await user.click(screen.getByRole('button'));
    expect(screen.queryByText('テスト説明')).not.toBeInTheDocument();
  });

  it('title プロパティが渡されたらポップオーバー内に表示する', async () => {
    const user = userEvent.setup();
    render(<HelpDot title="方法論" content="評価手法の説明" />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByText('方法論')).toBeInTheDocument();
    expect(screen.getByText('評価手法の説明')).toBeInTheDocument();
  });
});
