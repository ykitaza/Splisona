import { useState, useMemo } from 'react';
import type { EvaluationResult, Persona, EvaluationScores } from '../../types';
import { PERSONA_TYPE_LABELS } from '../../types';

const AXES: { key: keyof EvaluationScores; label: string }[] = [
  { key: 'usability', label: '使いやすさ' },
  { key: 'aesthetics', label: '魅力' },
  { key: 'clarity', label: '分かりやすさ' },
  { key: 'engagement', label: '行動喚起' },
  { key: 'trust', label: '信頼感' },
];

function ageGroup(age?: number): string {
  if (!age) return '不明';
  if (age < 20) return '〜19';
  if (age < 30) return '20代';
  if (age < 40) return '30代';
  if (age < 50) return '40代';
  return '50〜';
}

type GroupByKey = 'type' | 'gender' | 'ageGroup';

function groupLabel(persona: Persona, groupBy: GroupByKey): string {
  if (groupBy === 'type') return PERSONA_TYPE_LABELS[persona.type] ?? persona.type;
  if (groupBy === 'gender') return persona.gender ?? '不明';
  return ageGroup(persona.age);
}

const GROUP_OPTIONS: { key: GroupByKey; label: string }[] = [
  { key: 'type', label: 'タイプ' },
  { key: 'gender', label: '性別' },
  { key: 'ageGroup', label: '年齢層' },
];

interface AttributeHeatmapProps {
  evaluations: EvaluationResult[];
  personas: Persona[];
  groupBy?: GroupByKey;
}

export function AttributeHeatmap({ evaluations, personas, groupBy: initialGroupBy = 'type' }: AttributeHeatmapProps) {
  const [side, setSide] = useState<'A' | 'B'>('A');
  const [groupBy, setGroupBy] = useState<GroupByKey>(initialGroupBy);

  const data = useMemo(() => {
    const personaMap = new Map(personas.map((p) => [p.personaId, p]));
    const groups = new Map<string, { count: number; winRates: Record<keyof EvaluationScores, { wins: number; total: number }> }>();

    for (const ev of evaluations) {
      if (ev.status !== 'completed' || !ev.scoresA || !ev.scoresB) continue;
      const persona = personaMap.get(ev.personaId);
      if (!persona) continue;
      const label = groupLabel(persona, groupBy);
      if (!groups.has(label)) {
        const empty = () => ({ wins: 0, total: 0 });
        groups.set(label, {
          count: 0,
          winRates: { usability: empty(), aesthetics: empty(), clarity: empty(), engagement: empty(), trust: empty() },
        });
      }
      const g = groups.get(label)!;
      g.count++;
      for (const axis of AXES) {
        const a = ev.scoresA[axis.key] ?? 0;
        const b = ev.scoresB[axis.key] ?? 0;
        g.winRates[axis.key].total++;
        if (side === 'A' && a > b) g.winRates[axis.key].wins++;
        if (side === 'B' && b > a) g.winRates[axis.key].wins++;
        if (a === b) g.winRates[axis.key].wins += 0.5;
      }
    }

    return Array.from(groups.entries()).map(([label, { count, winRates }]) => ({
      label,
      count,
      rates: Object.fromEntries(
        AXES.map((axis) => {
          const { wins, total } = winRates[axis.key];
          return [axis.key, total > 0 ? Math.round((wins / total) * 100) : 0];
        })
      ) as Record<keyof EvaluationScores, number>,
    }));
  }, [evaluations, personas, groupBy, side]);

  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center" style={{ gap: 16 }}>
          <span className="text-text-hi font-sans font-semibold" style={{ fontSize: 14 }}>属性別ヒートマップ</span>
          <div className="flex items-center border border-hairline" style={{ gap: 2, borderRadius: 6, padding: 3, background: 'var(--color-base)' }}>
            {GROUP_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setGroupBy(opt.key)}
                className="font-sans text-xs transition-colors"
                style={{
                  borderRadius: 4, padding: '4px 12px',
                  background: groupBy === opt.key ? 'var(--color-raised)' : 'transparent',
                  color: groupBy === opt.key ? 'var(--color-text-hi)' : 'var(--color-text-lo)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center border border-hairline" style={{ gap: 2, borderRadius: 6, padding: 3, background: 'var(--color-base)' }}>
          {(['A', 'B'] as const).map((s) => {
            const c = s === 'A' ? '#6E78D9' : '#C9974F';
            const bg = s === 'A' ? 'rgba(110, 120, 217, 0.15)' : 'rgba(201, 151, 79, 0.15)';
            return (
              <button
                key={s}
                type="button"
                aria-label={`${s} 勝率`}
                aria-pressed={side === s}
                onClick={() => setSide(s)}
                className="font-mono text-xs font-semibold transition-colors"
                style={{
                  borderRadius: 4, padding: '4px 12px',
                  background: side === s ? bg : 'transparent',
                  color: side === s ? c : 'var(--color-text-lo)',
                }}
              >
                {s} 勝率
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="flex flex-col">
        {/* Column headers */}
        <div className="flex items-center" style={{ padding: '8px 0', borderBottom: '1px solid var(--color-hairline)' }}>
          <div style={{ width: 140, flexShrink: 0 }} />
          {AXES.map((axis) => (
            <div key={axis.key} className="flex-1 text-center">
              <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 0.5 }}>{axis.label}</span>
            </div>
          ))}
        </div>

        {/* Rows */}
        {data.map((row) => (
          <div
            key={row.label}
            className="flex items-center"
            style={{ padding: '10px 0', borderBottom: '1px solid var(--color-hairline)' }}
          >
            <div className="flex items-center flex-shrink-0" style={{ width: 140, gap: 6 }}>
              <span className="text-text-hi font-sans text-sm font-semibold">{row.label}</span>
              <span className="text-text-lo font-mono text-xs">n={row.count}</span>
            </div>
            {AXES.map((axis) => {
              const pct = row.rates[axis.key];
              const alpha = pct / 100;
              return (
                <div key={axis.key} className="flex-1" style={{ padding: '0 4px' }}>
                  <div
                    className="flex items-center justify-center font-mono text-xs"
                    style={{
                      height: 36,
                      borderRadius: 4,
                      background: `rgba(${side === 'A' ? '110, 120, 217' : '201, 151, 79'}, ${alpha * 0.45})`,
                      color: alpha > 0.4 ? 'var(--color-text-hi)' : 'var(--color-text-mid)',
                      transition: 'background 0.3s',
                    }}
                  >
                    {pct}%
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
