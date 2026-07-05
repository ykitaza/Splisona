export function ScoreBars({ label, scoreA, scoreB }: { label: string; scoreA: number; scoreB: number }) {
  const total = scoreA + scoreB;
  const aRatio = total > 0 ? (scoreA / total) * 100 : 50;
  const bRatio = total > 0 ? (scoreB / total) * 100 : 50;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-text-mid font-sans text-sm">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-win-a font-mono text-xs font-semibold" style={{ minWidth: 44, textAlign: 'right' }}>
            A {scoreA.toFixed(1)}
          </span>
          <span className="text-win-b font-mono text-xs font-semibold" style={{ minWidth: 44, textAlign: 'right' }}>
            B {scoreB.toFixed(1)}
          </span>
        </div>
      </div>
      <div className="flex overflow-hidden rounded-full" style={{ height: 6, background: 'var(--color-raised, #1C1F23)' }}>
        <div style={{ width: `${aRatio}%`, height: '100%', background: 'var(--color-win-a, #6E78D9)' }} />
        <div style={{ width: `${bRatio}%`, height: '100%', background: 'var(--color-win-b, #C9974F)' }} />
      </div>
    </div>
  );
}
