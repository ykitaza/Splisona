import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SegmentControl } from './SegmentControl';

const options = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: 'other', label: 'その他' },
];

describe('SegmentControl', () => {
  it('全選択肢を表示する', () => {
    render(<SegmentControl options={options} selected="male" onChange={vi.fn()} />);
    expect(screen.getByText('男性')).toBeInTheDocument();
    expect(screen.getByText('女性')).toBeInTheDocument();
    expect(screen.getByText('その他')).toBeInTheDocument();
  });

  it('選択中のボタンに aria-pressed=true が設定される', () => {
    render(<SegmentControl options={options} selected="female" onChange={vi.fn()} />);
    expect(screen.getByText('女性').closest('button')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('男性').closest('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('非選択ボタンをクリックすると onChange を呼ぶ', async () => {
    const onChange = vi.fn();
    render(<SegmentControl options={options} selected="male" onChange={onChange} />);
    await userEvent.click(screen.getByText('女性'));
    expect(onChange).toHaveBeenCalledWith('female');
  });
});
