import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProgress, getTest, getReport } from '../api/tests';
import { ArrowRight } from 'lucide-react';
import { usePersonas } from '../hooks/usePersonas';
import { API_BASE } from '../api/client';
import { ImageLightbox } from '../components/ImageLightbox';
import type { ProgressResponse, ABTest, EvaluationResult } from '../types';

type Zone = 'A' | 'B' | 'center';
const ZONE_X: Record<Zone, number> = { A: 22, center: 50, B: 78 };

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const SEED_SPACING = 64;
function sunflowerOffset(k: number): { dx: number; dy: number } {
  const r = SEED_SPACING * Math.sqrt(k);
  const theta = k * GOLDEN_ANGLE;
  return { dx: r * Math.cos(theta), dy: r * Math.sin(theta) };
}

const VERDICT_CHIP: Record<'A' | 'B' | 'none', { label: string; color: string; bg: string }> = {
  A: { label: 'A案', color: 'var(--color-win-a)', bg: 'var(--color-accent-dim)' },
  B: { label: 'B案', color: 'var(--color-win-b)', bg: 'var(--color-win-b-dim, rgba(201,151,79,0.15))' },
  none: { label: '互角', color: 'var(--color-text-lo)', bg: 'var(--color-raised)' },
};
const FAILED_CHIP = { label: '失敗', color: 'var(--color-danger)', bg: 'var(--color-danger-dim, rgba(214,69,69,0.15))' };
const THINKING_CHIP = { label: '検討中', color: 'var(--color-text-lo)', bg: 'var(--color-raised)' };

function DesignThumb({ label, imageKey, accentColor, scanning }: { label: string; imageKey?: string; accentColor: string; scanning?: boolean }) {
  const [lightbox, setLightbox] = useState(false);
  const src = imageKey ? `${API_BASE}/stub-upload/${imageKey}` : null;

  return (
    <>
      {lightbox && src && <ImageLightbox src={src} alt={`${label}プレビュー`} onClose={() => setLightbox(false)} />}
      <div className="flex flex-col gap-2 flex-1 overflow-hidden rounded-md" style={{ borderLeft: `2px solid ${accentColor}` }}>
        <div className="flex items-center gap-2 px-4 pt-3">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: accentColor }} />
          <span className="text-text-hi font-sans text-xs font-semibold">{label}</span>
        </div>
        <div
          className="relative mx-3 mb-3 overflow-hidden rounded flex items-center justify-center"
          style={{ height: 120, background: 'var(--color-raised)', cursor: src ? 'zoom-in' : 'default' }}
          onClick={() => { if (src) setLightbox(true); }}
        >
          {src ? (
            <img src={src} alt={`${label}プレビュー`} className="w-full h-full object-cover" />
          ) : (
            <span className="text-text-lo font-sans text-xs">画像なし</span>
          )}
          {scanning && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: 48,
                  background: `linear-gradient(to bottom, transparent, ${accentColor}40 50%, transparent)`,
                  animation: 'ai-scan 1.8s ease-in-out infinite',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function TestRunningPage() {
  const { id } = useParams<{ id: string }>();
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [test, setTest] = useState<ABTest | null>(null);
  const { personas } = usePersonas();

  useEffect(() => {
    if (!id) return;
    getTest(id).then(setTest).catch(() => {});
  }, [id]);

  const [isDone, setIsDone] = useState(false);
  const [results, setResults] = useState<Record<string, EvaluationResult>>({});

  useEffect(() => {
    if (!id) return;
    let active = true;

    async function poll() {
      try {
        const data = await getProgress(id!);
        if (!active) return;
        setProgress(data);

        try {
          const report = await getReport(id!);
          if (!active) return;
          const map: Record<string, EvaluationResult> = {};
          for (const ev of report.evaluations) {
            if (ev.status === 'completed' || ev.status === 'failed') map[ev.personaId] = ev;
          }
          setResults(map);
        } catch {
          // ignore
        }

        if (data.status === 'completed' || data.status === 'failed') {
          setIsDone(true);
          return;
        }
      } catch {
        // ignore
      }
      if (active) setTimeout(poll, 2000);
    }

    poll();
    return () => { active = false; };
  }, [id]);

  const total = progress?.total ?? 0;
  const completed = progress?.completed ?? 0;
  const failed = progress?.failed ?? 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const personaIds = test?.personaIds ?? [];
  const relevantPersonas = personaIds
    .map((pid) => personas.find((p) => p.personaId === pid))
    .filter(Boolean) as typeof personas;

  const displayCount = personaIds.length || 6;

  const zoneSeen: Record<Zone, number> = { A: 0, center: 0, B: 0 };
  const stageItems = Array.from({ length: displayCount }).map((_, i) => {
    const persona = relevantPersonas[i];
    const result = persona ? results[persona.personaId] : undefined;
    const winner = result?.status === 'completed' ? result.winner : undefined;
    const isFailed = result?.status === 'failed';
    const zone: Zone = winner === 'A' ? 'A' : winner === 'B' ? 'B' : 'center';
    const seedIndex = zoneSeen[zone]++;
    return { i, persona, result, winner, isFailed, zone, seedIndex };
  });

  return (
    <div className="flex flex-col gap-5 p-8 pb-10" style={{ height: '100%' }}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-text-hi font-sans text-lg font-semibold">AIペルソナがレビュー中…</h1>
          <p className="text-text-lo font-sans text-sm">ペルソナたちがA案・B案を見比べています</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-accent-dim px-3 py-1.5">
          <div className="rounded-full w-2 h-2 bg-accent" style={{ animation: 'pulse 1.5s infinite' }} />
          <span className="text-accent font-sans text-xs font-semibold">
            {progress ? `${completed} / ${total} 完了` : '準備中...'}
          </span>
        </div>
      </div>

      <div className="flex gap-4">
        <DesignThumb label="A案" imageKey={test?.designAInput?.imageKey} accentColor="var(--color-win-a, #6E78D9)" scanning={!isDone} />
        <DesignThumb label="B案" imageKey={test?.designBInput?.imageKey} accentColor="var(--color-win-b, #C9974F)" scanning={!isDone} />
      </div>

      <div
        className="relative overflow-hidden flex-1 rounded-md"
        style={{
          background: 'linear-gradient(90deg, var(--color-accent-dim) 0%, var(--color-base) 50%, var(--color-win-b-dim, rgba(201,151,79,0.15)) 100%)',
          border: '1px solid var(--color-hairline)',
          minHeight: 240,
        }}
      >
        <span className="absolute text-win-a font-mono text-xs font-semibold" style={{ left: 16, top: 12, letterSpacing: 0.5 }}>
          A案 支持
        </span>
        <span className="absolute text-win-b font-mono text-xs font-semibold" style={{ right: 16, top: 12, letterSpacing: 0.5 }}>
          B案 支持
        </span>

        {stageItems.map(({ i, persona, result, winner, isFailed, zone, seedIndex }) => {
          const name = persona?.displayName ?? `P${i + 1}`;
          const { dx, dy } = sunflowerOffset(seedIndex);
          const wavering = !result;
          const chip = result
            ? (winner ? VERDICT_CHIP[winner] : isFailed ? FAILED_CHIP : VERDICT_CHIP.none)
            : THINKING_CHIP;

          return (
            <div
              key={i}
              className="absolute flex flex-col items-center gap-1.5"
              style={{
                left: `${ZONE_X[zone]}%`,
                top: '50%',
                transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`,
                transition: 'left 1.6s cubic-bezier(0.22, 1, 0.36, 1), transform 1.6s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <div
                style={{ animation: wavering ? `persona-waver ${2 + (i % 3) * 0.4}s ease-in-out ${i * 0.18}s infinite` : 'none' }}
                className="flex flex-col items-center gap-1.5"
              >
                <div className="relative px-2.5 py-1 rounded-xl" style={{ background: chip.bg, marginBottom: 2 }}>
                  <span className="font-sans text-xs font-semibold whitespace-nowrap" style={{ color: chip.color, fontSize: 10 }}>
                    {chip.label}
                  </span>
                  <div className="absolute" style={{ left: '50%', bottom: -3, width: 8, height: 8, background: chip.bg, transform: 'translateX(-50%) rotate(45deg)', borderRadius: 1 }} />
                </div>
                <div className="flex items-center justify-center rounded-full bg-raised" style={{ width: 48, height: 48 }}>
                  <span className="text-text-mid font-sans font-semibold" style={{ fontSize: 17 }}>
                    {name.charAt(0)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="overflow-hidden rounded-full"
          style={{ height: 6, background: 'var(--color-raised)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: isDone ? 'var(--color-win-b)' : 'var(--color-accent)' }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-lo font-sans text-sm">
            {isDone ? '評価が完了しました' : `${pct}% 完了`}
          </span>
          {failed > 0 && (
            <span className="text-danger font-sans text-sm">失敗: {failed}件</span>
          )}
        </div>
      </div>

      {isDone && (
        <div className="flex justify-end">
          <Link
            to={`/tests/${id}/report`}
            className="flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-white font-sans text-sm font-semibold transition-opacity hover:opacity-90"
          >
            結果を見る
            <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </div>
  );
}
