import type { EvaluationScores } from '../../types';

const AXES: { key: keyof EvaluationScores; label: string }[] = [
  { key: 'usability', label: '使いやすさ' },
  { key: 'aesthetics', label: '見た目' },
  { key: 'clarity', label: '分かりやすさ' },
  { key: 'engagement', label: '行動喚起' },
  { key: 'trust', label: '信頼感' },
];

const N = AXES.length;
const RINGS = 4;
const MAX = 100;

function angle(i: number) {
  return -Math.PI / 2 + (i * 2 * Math.PI) / N;
}

function pt(i: number, radius: number, cx: number, cy: number): [number, number] {
  const a = angle(i);
  return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
}

function polygonPoints(scores: EvaluationScores, r: number, cx: number, cy: number) {
  return AXES.map((axis, i) => {
    const val = Math.min((scores[axis.key] ?? 0), MAX);
    const [x, y] = pt(i, (r * val) / MAX, cx, cy);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

function ringPoints(ringRadius: number, cx: number, cy: number) {
  return Array.from({ length: N }, (_, i) => {
    const [x, y] = pt(i, ringRadius, cx, cy);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

interface RadarChartProps {
  scoresA: EvaluationScores;
  scoresB: EvaluationScores;
  size?: number;
}

export function RadarChart({ scoresA, scoresB, size = 300 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (Math.min(size, size) / 2) * 0.72;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid rings */}
      {Array.from({ length: RINGS }, (_, k) => {
        const rr = (r * (k + 1)) / RINGS;
        return (
          <polygon
            key={`ring-${k}`}
            data-ring={k + 1}
            points={ringPoints(rr, cx, cy)}
            fill="none"
            stroke="var(--color-hairline, #FFFFFF1F)"
            strokeWidth={1}
          />
        );
      })}

      {/* Spokes */}
      {Array.from({ length: N }, (_, i) => {
        const [x, y] = pt(i, r, cx, cy);
        return (
          <line
            key={`spoke-${i}`}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="var(--color-hairline, #FFFFFF1F)"
            strokeWidth={1}
          />
        );
      })}

      {/* B polygon (behind) */}
      <polygon
        points={polygonPoints(scoresB, r, cx, cy)}
        fill="var(--color-win-b, #C9974F)"
        fillOpacity={0.2}
        stroke="var(--color-win-b, #C9974F)"
        strokeWidth={2}
      />

      {/* A polygon (front) */}
      <polygon
        points={polygonPoints(scoresA, r, cx, cy)}
        fill="var(--color-accent, #6E78D9)"
        fillOpacity={0.2}
        stroke="var(--color-accent, #6E78D9)"
        strokeWidth={2}
      />

      {/* Labels */}
      {AXES.map((axis, i) => {
        const [x, y] = pt(i, r + 20, cx, cy);
        return (
          <text
            key={axis.key}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--color-text-mid, #9BA1AC)"
            fontFamily="var(--font-sans, 'Geist', sans-serif)"
            fontSize={11}
          >
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
}
