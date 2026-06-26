import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProgress } from '../api/tests';
import type { ProgressResponse } from '../types';

const PERSONA_ICONS = ['🧑‍💼', '👩‍🦰', '🧑‍🎓', '👵', '🧑', '👩‍💼', '🧓', '👩‍🦱'];

export function TestRunningPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<ProgressResponse | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;

    async function poll() {
      try {
        const data = await getProgress(id!);
        if (!active) return;
        setProgress(data);
        if (data.status === 'completed' || data.status === 'failed') {
          navigate(`/tests/${id}/report`);
          return;
        }
      } catch {
        // ポーリング失敗は無視して継続
      }
      if (active) setTimeout(poll, 3000);
    }

    poll();
    return () => { active = false; };
  }, [id, navigate]);

  const total = progress?.total ?? 0;
  const completed = progress?.completed ?? 0;
  const failed = progress?.failed ?? 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 p-8 pb-10 h-full">
      {/* Head */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 24, fontWeight: 600 }}>
            AIペルソナがレビュー中…
          </h1>
          <p style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 14 }}>
            ペルソナたちがA案・B案を見比べています
          </p>
        </div>
        <div
          className="flex items-center gap-2 rounded-full px-3 py-1.5"
          style={{ background: '#E8F0FB' }}
        >
          <div
            className="rounded-full"
            style={{ width: 8, height: 8, background: '#3B7DD8', animation: 'pulse 1.5s infinite' }}
          />
          <span style={{ color: '#3B7DD8', fontFamily: 'Geist, sans-serif', fontSize: 12, fontWeight: 600 }}>
            {progress ? `${completed} / ${total} 完了` : '準備中...'}
          </span>
        </div>
      </div>

      {/* Stage — persona icons */}
      <div
        className="relative overflow-hidden flex-1 rounded-md"
        style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 10, minHeight: 320 }}
      >
        <div className="flex items-center justify-center h-full">
          <div className="relative" style={{ width: '100%', height: 320 }}>
            {PERSONA_ICONS.slice(0, Math.max(3, total || 6)).map((icon, i) => {
              const done = i < completed;
              const positions = [
                { x: '8%', y: '20%' },
                { x: '28%', y: '50%' },
                { x: '50%', y: '15%' },
                { x: '68%', y: '45%' },
                { x: '22%', y: '70%' },
                { x: '52%', y: '65%' },
                { x: '80%', y: '20%' },
                { x: '82%', y: '60%' },
              ];
              const pos = positions[i % positions.length];
              return (
                <div
                  key={i}
                  className="absolute flex flex-col items-center gap-1"
                  style={{
                    left: pos.x,
                    top: pos.y,
                    transform: 'translate(-50%, -50%)',
                    transition: 'opacity 0.5s',
                    opacity: done ? 1 : 0.4,
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 52,
                      height: 52,
                      fontSize: 28,
                      background: done ? '#E8F0FB' : '#F0F1F3',
                      borderRadius: 9999,
                    }}
                  >
                    {icon}
                  </div>
                  {done && (
                    <span
                      className="rounded-full px-2 py-0.5 text-xs"
                      style={{ background: '#E6F4EC', color: '#2E9E5B', fontFamily: 'Geist, sans-serif', fontSize: 10, fontWeight: 600 }}
                    >
                      完了
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex flex-col gap-2">
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="overflow-hidden rounded-full"
          style={{ height: 6, background: '#F0F1F3' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: '#3B7DD8' }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>
            {pct}% 完了
          </span>
          {failed > 0 && (
            <span style={{ color: '#D64545', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>
              失敗: {failed}件
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
