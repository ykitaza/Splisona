import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PersonaNode } from './PersonaNode';

describe('PersonaNode', () => {
  it('SVG 要素を描画する', () => {
    const { container } = render(<PersonaNode seed="test-seed" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('同じ seed で同じ SVG を生成する（決定論的）', () => {
    const { container: c1 } = render(<PersonaNode seed="deterministic" />);
    const { container: c2 } = render(<PersonaNode seed="deterministic" />);
    expect(c1.innerHTML).toBe(c2.innerHTML);
  });

  it('異なる seed で異なる SVG を生成する', () => {
    const { container: c1 } = render(<PersonaNode seed="alpha" />);
    const { container: c2 } = render(<PersonaNode seed="beta" />);
    expect(c1.innerHTML).not.toBe(c2.innerHTML);
  });

  it('size prop で SVG のサイズを指定できる', () => {
    const { container } = render(<PersonaNode seed="sized" size={64} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '64');
    expect(svg).toHaveAttribute('height', '64');
  });
});
