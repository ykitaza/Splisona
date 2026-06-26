import { useState, useMemo } from 'react';
import type { EvaluationResult, Persona, EvaluationScores } from '../../types';
import { PERSONA_TYPE_LABELS } from '../../types';

const AXES: { key: keyof EvaluationScores; label: string }[] = [
  { key: 'usability', label: '使いやすさ' },
  { key: 'aesthetics', label: '見た目' },
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

function groupLabel(persona: Persona, groupBy: 'type' | 'gender' | 'ageGroup'): string {
  if (groupBy === 'type') return PERSONA_TYPE_LABELS[persona.type] ?? persona.type;
  if (groupBy === 'gender') return persona.gender ?? '不明';
  return ageGroup(persona.age);
}

interface AttributeHeatmapProps {
  evaluations: EvaluationResult[];
  personas: Persona[];
  groupBy: 'type' | 'gender' | 'ageGroup';
}

export function AttributeHeatmap({ evaluations, personas, groupBy }: AttributeHeatmapProps) {
  const [side, setSide] = useState<'A' | 'B'>('A');

  const data = useMemo(() => {
    const personaMap = new Map(personas.map((p) => [p.personaId, p]));
    const groups = new Map<string, { scores: Record<keyof EvaluationScores, number[]> }>();

    for (const ev of evaluations) {
      if (ev.status !== 'completed') continue;
      const persona = personaMap.get(ev.personaId);
      if (!persona) continue;
      const label = groupLabel(persona, groupBy);
      if (!groups.has(label)) {
        groups.set(label, {
          scores: { usability: [], aesthetics: [], clarity: [], engagement: [], trust: [] },
        });
      }
      const g = groups.get(label)!;
      const s = side === 'A' ? ev.scoresA : ev.scoresB;
      for (const axis of AXES) {
        g.scores[axis.key].push(s[axis.key] ?? 0);
      }
    }

    return Array.from(groups.entries()).map(([label, { scores }]) => ({
      label,
      avgs: Object.fromEntries(
        AXES.map((axis) => {
          const arr = scores[axis.key];
          return [axis.key, arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0];
        })
      ) as Record<keyof EvaluationScores, number>,
    }));
  }, [evaluations, personas, groupBy, side]);

  const allValues = data.flatMap((d) => AXES.map((a) => d.avgs[a.key]));
  const maxVal = Math.max(...allValues, 1);

  return (
    <div className="flex flex-col gap-3">
      {/* A/B toggle */}
      <div className="flex items-center gap-1">
        {(['A', 'B'] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="button"
            aria-label={s}
            aria-pressed={side === s}
            onClick={() => setSide(s)}
            className="rounded-md px-3 py-1 font-mono text-xs font-semibold transition-colors"
            style={{
              background: side === s ? 'var(--color-accent-dim, #6E78D926)' : 'transparent',
              color: side === s ? 'var(--color-accent, #6E78D9)' : 'var(--color-text-lo, #5B616B)',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th className="text-left text-text-lo font-mono text-xs py-2 pr-4" style={{ letterSpacing: '0.5px' }}>
                {groupBy === 'type' ? 'タイプ' : groupBy === 'gender' ? '性別' : '年齢層'}
              </th>
              {AXES.map((axis) => (
                <th key={axis.key} className="text-right text-text-lo font-mono text-xs py-2 px-2" style={{ letterSpacing: '0.5px', minWidth: 64 }}>
                  {axis.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.label} style={{ borderTop: '1px solid var(--color-hairline, #FFFFFF14)' }}>
                <td className="text-text-hi font-sans text-sm py-2.5 pr-4">{row.label}</td>
                {AXES.map((axis) => {
                  const val = row.avgs[axis.key];
                  const intensity = maxVal > 0 ? val / maxVal : 0;
                  return (
                    <td
                      key={axis.key}
                      className="text-right font-mono text-xs py-2.5 px-2"
                      style={{
                        color: 'var(--color-text-hi, #F2F4F7)',
                        background: `rgba(110, 120, 217, ${(intensity * 0.3).toFixed(2)})`,
                      }}
                    >
                      {val.toFixed(1)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
