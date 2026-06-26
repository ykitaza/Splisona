import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatBubble } from './ChatBubble';

describe('ChatBubble', () => {
  it('メッセージ内容を表示する', () => {
    render(<ChatBubble role="user" content="こんにちは" />);
    expect(screen.getByText('こんにちは')).toBeInTheDocument();
  });

  it('user ロールは右寄せになる', () => {
    const { container } = render(<ChatBubble role="user" content="ユーザー" />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('justify-end');
  });

  it('assistant ロールは左寄せになる', () => {
    const { container } = render(<ChatBubble role="assistant" content="アシスタント" />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('justify-start');
  });
});
