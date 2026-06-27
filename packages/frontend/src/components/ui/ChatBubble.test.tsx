import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ChatBubble } from './ChatBubble';

describe('ChatBubble', () => {
  it('メッセージ内容を表示する', () => {
    render(<ChatBubble role="user" content="こんにちは" />);
    expect(screen.getByText('こんにちは')).toBeInTheDocument();
  });

  it('user ロールは左寄せになる', () => {
    const { container } = render(<ChatBubble role="user" content="ユーザー" />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('justify-start');
  });

  it('assistant ロールは左寄せになる', () => {
    const { container } = render(<ChatBubble role="assistant" content="アシスタント" />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('justify-start');
  });

  it('user ロールは話者名「あなた」を表示する', () => {
    render(<ChatBubble role="user" content="ユーザー" />);
    expect(screen.getByText('あなた')).toBeInTheDocument();
  });

  it('assistant ロールはdisplayNameを話者名として表示する', () => {
    render(<ChatBubble role="assistant" content="アシスタント" displayName="ハルト" />);
    expect(screen.getByText('ハルト')).toBeInTheDocument();
  });
});
