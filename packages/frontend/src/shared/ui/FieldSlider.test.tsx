import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FieldSlider } from './FieldSlider';

describe('FieldSlider', () => {
  it('ラベルと現在値を表示する', () => {
    render(<FieldSlider label="年齢" value={25} min={0} max={100} onChange={vi.fn()} />);
    expect(screen.getByText('年齢')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('slider の input が正しい min/max/step/value を持つ', () => {
    render(<FieldSlider value={50} min={10} max={90} step={5} onChange={vi.fn()} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '10');
    expect(slider).toHaveAttribute('max', '90');
    expect(slider).toHaveAttribute('step', '5');
    expect(slider).toHaveValue('50');
  });

  it('値変更時に onChange を呼ぶ', () => {
    const onChange = vi.fn();
    render(<FieldSlider value={50} min={0} max={100} onChange={onChange} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '75' } });
    expect(onChange).toHaveBeenCalledWith(75);
  });
});
