import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { RadarChart } from './RadarChart';
import type { EvaluationScores } from '../../types';

const scoresA: EvaluationScores = { usability: 80, aesthetics: 60, clarity: 90, engagement: 70, trust: 85 };
const scoresB: EvaluationScores = { usability: 50, aesthetics: 75, clarity: 60, engagement: 80, trust: 55 };

describe('RadarChart', () => {
  it('SVG 要素をレンダリングする', () => {
    const { container } = render(<RadarChart scoresA={scoresA} scoresB={scoresB} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('5 軸のラベルを表示する', () => {
    const { container } = render(<RadarChart scoresA={scoresA} scoresB={scoresB} />);
    const texts = container.querySelectorAll('text');
    const labels = Array.from(texts).map((t) => t.textContent);
    expect(labels).toContain('使いやすさ');
    expect(labels).toContain('見た目');
    expect(labels).toContain('分かりやすさ');
    expect(labels).toContain('行動喚起');
    expect(labels).toContain('信頼感');
  });

  it('A/B 両方のデータポリゴンを描画する', () => {
    const { container } = render(<RadarChart scoresA={scoresA} scoresB={scoresB} />);
    const allPolygons = container.querySelectorAll('polygon');
    const gridPolygons = container.querySelectorAll('polygon[data-ring]');
    const dataPolygons = allPolygons.length - gridPolygons.length;
    expect(dataPolygons).toBe(2);
  });

  it('size プロパティで SVG サイズを変更できる', () => {
    const { container } = render(<RadarChart scoresA={scoresA} scoresB={scoresB} size={300} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('300');
    expect(svg?.getAttribute('height')).toBe('300');
  });

  it('グリッドリングを描画する', () => {
    const { container } = render(<RadarChart scoresA={scoresA} scoresB={scoresB} />);
    const paths = container.querySelectorAll('polygon[data-ring]');
    expect(paths.length).toBeGreaterThanOrEqual(3);
  });
});
