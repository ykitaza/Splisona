import type { ReportResponse, EvaluationScores } from './types';
import type { DesignInput } from '@/features/test/types';
import type { Persona } from '@/features/persona/types';
import { PERSONA_TYPE_LABELS } from '@/features/persona/types';

const AXIS_LABELS: Record<keyof EvaluationScores, string> = {
  usability: '使いやすさ',
  aesthetics: '見た目',
  clarity: '明確さ',
  engagement: '訴求力',
  trust: '信頼感',
};

function sourceLabel(input: DesignInput): string {
  if (input.inputType === 'figma_url') return `Figma デザイン${input.figmaUrl ? `（${input.figmaUrl}）` : ''}`;
  if (input.inputType === 'site_url') return `Web サイトのスクリーンショット${input.siteUrl ? `（${input.siteUrl}）` : ''}`;
  return 'アップロードされたデザイン画像';
}

function axisLine(scores: EvaluationScores): string {
  return (Object.keys(AXIS_LABELS) as (keyof EvaluationScores)[])
    .map((k) => `${AXIS_LABELS[k]}${Math.round(scores[k])}`)
    .join(' / ');
}

/**
 * 実装プロンプトの先頭に付与するテスト概要ヘッダー。
 * 貼り付け先の AI が「デザインA/B」「◯◯点」等の文脈を理解できるようにする。
 */
export function buildPromptContext(report: ReportResponse, personas: Persona[]): string {
  const { abTest, summary, evaluations } = report;
  const designLine = (side: 'A' | 'B', input: DesignInput): string => {
    const ai = side === 'A' ? summary.improvementReport?.designSummaryA : summary.improvementReport?.designSummaryB;
    const url = input.inputType === 'figma_url' ? input.figmaUrl : input.inputType === 'site_url' ? input.siteUrl : undefined;
    if (ai) return url ? `${ai}（${url}）` : ai;
    return sourceLabel(input);
  };

  const typeCounts = new Map<string, number>();
  for (const ev of evaluations) {
    const p = personas.find((x) => x.personaId === ev.personaId);
    const label = p ? (PERSONA_TYPE_LABELS[p.type] ?? p.type) : '不明';
    typeCounts.set(label, (typeCounts.get(label) ?? 0) + 1);
  }
  const typeBreakdown = [...typeCounts.entries()].map(([label, n]) => `${label}${n}`).join(' / ');

  const supportA = Math.round(summary.supportRateA * summary.totalPersonas);
  const supportB = Math.round(summary.supportRateB * summary.totalPersonas);
  const draws = summary.totalPersonas - supportA - supportB;
  const winnerLine = summary.winner === 'tie'
    ? '引き分け'
    : `デザイン${summary.winner} の勝ち`;

  return [
    '# 背景: AI ペルソナによるデザイン A/B テストの結果を受けた改善タスク',
    '',
    'このプロンプトは、デザイン評価ツール「Splisona」が生成した改善提案です。',
    '2つのデザイン案を複数の AI ペルソナ（想定ユーザーの人格モデル）が見比べ、5つの評価軸（0〜100点）で採点しました。',
    '',
    '## テスト概要',
    `- テスト名: ${abTest.title || '無題のテスト'}`,
    `- デザインA: ${designLine('A', abTest.designAInput)}`,
    `- デザインB: ${designLine('B', abTest.designBInput)}`,
    `- 評価者: ${evaluations.length}体の AI ペルソナ（${typeBreakdown}）`,
    `- 結果: ${winnerLine}（A支持 ${supportA} / B支持 ${supportB} / 引分 ${draws}）`,
    `- 軸別平均点 A案: ${axisLine(summary.avgScores.A)}`,
    `- 軸別平均点 B案: ${axisLine(summary.avgScores.B)}`,
    ...(abTest.focusPoints ? ['', `## テスト時の注目ポイント`, abTest.focusPoints] : []),
    '',
    '以下の改善タスクに対応してください。文中の「◯◯点」は上記5軸の平均点、人名は評価した AI ペルソナの名前です。',
    '',
    '---',
  ].join('\n');
}
