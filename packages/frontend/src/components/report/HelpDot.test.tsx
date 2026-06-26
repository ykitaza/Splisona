import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HelpDot } from './HelpDot';

describe('HelpDot', () => {
  it('? マークを表示する', () => {
    render(<HelpDot content="テスト説明" />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('ホバーでポップオーバーを表示する', () => {
    render(<HelpDot content="テスト説明" />);
    const wrapper = screen.getByText('?').parentElement!;
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByText('テスト説明')).toBeInTheDocument();
  });

  it('ホバー解除でポップオーバーを閉じる', () => {
    render(<HelpDot content="テスト説明" />);
    const wrapper = screen.getByText('?').parentElement!;
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByText('テスト説明')).toBeInTheDocument();
    fireEvent.mouseLeave(wrapper);
    expect(screen.queryByText('テスト説明')).not.toBeInTheDocument();
  });

  it('title プロパティが渡されたらポップオーバー内に表示する', () => {
    render(<HelpDot title="方法論" content="評価手法の説明" />);
    const wrapper = screen.getByText('?').parentElement!;
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByText('方法論')).toBeInTheDocument();
    expect(screen.getByText('評価手法の説明')).toBeInTheDocument();
  });
});
