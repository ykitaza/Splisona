// ペルソナの出自フィルタ（一覧／選択画面で共有）

export const SOURCE_FILTERS = [
  { key: 'all', label: 'すべて' },
  { key: 'default', label: 'デフォルト' },
  { key: 'preset', label: 'プリセット' },
  { key: 'ai', label: 'AI生成' },
  { key: 'manual', label: '手動作成' },
] as const;

export type SourceFilterKey = (typeof SOURCE_FILTERS)[number]['key'];

export function categoryOf(p: { source?: string; freeText?: string }): SourceFilterKey {
  if (p.source === 'default') return 'default';
  if (p.source === 'preset') return 'preset';
  if (p.source === 'ai' || (!p.source && !!p.freeText)) return 'ai';
  return 'manual';
}
