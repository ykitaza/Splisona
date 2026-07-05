import type { EvaluationScores } from '../types';

export const SCORE_LABELS: Record<keyof EvaluationScores, string> = {
  usability: '使いやすさ',
  aesthetics: '見た目',
  clarity: '明確さ',
  engagement: '訴求力',
  trust: '信頼感',
};
