import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

describe('Modal', () => {
  it('open=true で children を表示する', () => {
    render(<Modal open onClose={vi.fn()}>モーダル内容</Modal>);
    expect(screen.getByText('モーダル内容')).toBeInTheDocument();
  });

  it('open=false で何も表示しない', () => {
    render(<Modal open={false} onClose={vi.fn()}>モーダル内容</Modal>);
    expect(screen.queryByText('モーダル内容')).not.toBeInTheDocument();
  });

  it('背景クリックで onClose を呼ぶ', async () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose}>内容</Modal>);
    await userEvent.click(screen.getByTestId('modal-overlay'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('コンテンツクリックでは onClose を呼ばない', async () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose}>内容</Modal>);
    await userEvent.click(screen.getByText('内容'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ESC キーで onClose を呼ぶ', async () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose}>内容</Modal>);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
