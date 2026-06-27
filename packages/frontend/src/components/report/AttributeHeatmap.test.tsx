import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttributeHeatmap } from './AttributeHeatmap';
import type { EvaluationResult, Persona } from '../../types';

const personas: Persona[] = [
  { personaId: 'p1', userId: 'u1', displayName: 'ハルト', type: 'action_oriented', gender: '男性', age: 32, createdAt: '', updatedAt: '' },
  { personaId: 'p2', userId: 'u1', displayName: 'ミサキ', type: 'cautious', gender: '女性', age: 41, createdAt: '', updatedAt: '' },
  { personaId: 'p3', userId: 'u1', displayName: 'ソウタ', type: 'info_savvy', gender: '男性', age: 20, createdAt: '', updatedAt: '' },
];

const evaluations: EvaluationResult[] = [
  { personaId: 'p1', personaDisplayName: 'ハルト', winner: 'A', confidence: 80, reason: '', scoresA: { usability: 80, aesthetics: 70, clarity: 90, engagement: 60, trust: 75 }, scoresB: { usability: 50, aesthetics: 60, clarity: 50, engagement: 70, trust: 45 }, status: 'completed' },
  { personaId: 'p2', personaDisplayName: 'ミサキ', winner: 'B', confidence: 70, reason: '', scoresA: { usability: 40, aesthetics: 50, clarity: 55, engagement: 45, trust: 50 }, scoresB: { usability: 70, aesthetics: 80, clarity: 65, engagement: 75, trust: 70 }, status: 'completed' },
  { personaId: 'p3', personaDisplayName: 'ソウタ', winner: 'A', confidence: 90, reason: '', scoresA: { usability: 85, aesthetics: 75, clarity: 88, engagement: 70, trust: 82 }, scoresB: { usability: 55, aesthetics: 65, clarity: 48, engagement: 60, trust: 50 }, status: 'completed' },
];

describe('AttributeHeatmap', () => {
  it('タイプ別グルーピングでテーブルを描画する', () => {
    render(<AttributeHeatmap evaluations={evaluations} personas={personas} groupBy="type" />);
    expect(screen.getByText('行動重視型')).toBeInTheDocument();
    expect(screen.getByText('慎重型')).toBeInTheDocument();
  });

  it('性別でグルーピングできる', () => {
    render(<AttributeHeatmap evaluations={evaluations} personas={personas} groupBy="gender" />);
    expect(screen.getByText('男性')).toBeInTheDocument();
    expect(screen.getByText('女性')).toBeInTheDocument();
  });

  it('5 軸のヘッダーを表示する', () => {
    render(<AttributeHeatmap evaluations={evaluations} personas={personas} groupBy="type" />);
    expect(screen.getByText('使いやすさ')).toBeInTheDocument();
    expect(screen.getByText('信頼感')).toBeInTheDocument();
  });

  it('A/B トグルで視点を切り替えられる', async () => {
    const user = userEvent.setup();
    render(<AttributeHeatmap evaluations={evaluations} personas={personas} groupBy="type" />);

    const bButton = screen.getByRole('button', { name: 'B 勝率' });
    await user.click(bButton);
    expect(bButton).toHaveAttribute('aria-pressed', 'true');
  });
});
