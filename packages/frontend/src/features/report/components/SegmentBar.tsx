export function SegmentBar({ countA, countB, countNone }: { countA: number; countB: number; countNone: number }) {
  const total = countA + countB + countNone;
  if (total === 0) return null;
  return (
    <div data-testid="segment-bar" className="flex flex-col" style={{ gap: 12 }}>
      <div className="flex overflow-hidden" style={{ height: 16, borderRadius: 999, gap: 2 }}>
        {countA > 0 && <div style={{ flex: countA, background: '#6E78D9A0' }} />}
        {countB > 0 && <div style={{ flex: countB, background: '#C9974FA0' }} />}
        {countNone > 0 && <div style={{ flex: countNone, background: '#3A3D4280' }} />}
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#6E78D9A0' }} />
          <span className="text-text-mid font-mono text-xs" style={{ letterSpacing: 0.3 }}>A 勝利 · {countA}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-text-mid font-mono text-xs" style={{ letterSpacing: 0.3 }}>{countB} · B 勝利</span>
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#C9974FA0' }} />
        </span>
        {countNone > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#3A3D4280' }} />
            <span className="text-text-mid font-mono text-xs" style={{ letterSpacing: 0.3 }}>引分 · {countNone}</span>
          </span>
        )}
      </div>
    </div>
  );
}
