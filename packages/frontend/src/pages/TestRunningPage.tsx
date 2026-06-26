import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProgress, getTest } from '../api/tests';
import { ArrowRight } from 'lucide-react';
import { usePersonas } from '../hooks/usePersonas';
import { API_BASE } from '../api/client';
import { ImageLightbox } from '../components/ImageLightbox';
import type { ProgressResponse, ABTest } from '../types';

const AVATAR_COLORS = [
  { bg: '#E8F0FB', text: '#3B7DD8' },
  { bg: '#FBF0E4', text: '#E0883A' },
  { bg: '#E6F4EC', text: '#2E9E5B' },
  { bg: '#F0F1F3', text: '#666666' },
  { bg: '#F4E6F4', text: '#9B59B6' },
  { bg: '#E6F4F4', text: '#2E9E9E' },
];

const SCATTER_POSITIONS = [
  { x: 12, y: 22 },
  { x: 32, y: 55 },
  { x: 52, y: 18 },
  { x: 70, y: 50 },
  { x: 22, y: 72 },
  { x: 55, y: 68 },
  { x: 82, y: 22 },
  { x: 84, y: 62 },
  { x: 42, y: 40 },
  { x: 65, y: 32 },
  { x: 18, y: 44 },
  { x: 76, y: 78 },
];

function DesignThumb({ label, imageKey, dotColor, scanning }: { label: string; imageKey?: string; dotColor: string; scanning?: boolean }) {
  const [lightbox, setLightbox] = useState(false);
  const src = imageKey ? `${API_BASE}/stub-upload/${imageKey}` : null;

  return (
    <>
      {lightbox && src && <ImageLightbox src={src} alt={`${label}プレビュー`} onClose={() => setLightbox(false)} />}
      <div
        className="flex flex-col gap-2 flex-1"
        style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 10, overflow: 'hidden' }}
      >
        <div className="flex items-center gap-2 px-4 pt-3 pb-0">
          <div style={{ width: 8, height: 8, borderRadius: 9999, background: dotColor, flexShrink: 0 }} />
          <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 13, fontWeight: 600 }}>
            {label}
          </span>
        </div>
        <div
          className="relative mx-3 mb-3 overflow-hidden rounded-md flex items-center justify-center"
          style={{ height: 120, background: '#F7F7F8', borderRadius: 6, cursor: src ? 'zoom-in' : 'default' }}
          onClick={() => { if (src) setLightbox(true); }}
        >
          {src ? (
            <img
              src={src}
              alt={`${label}プレビュー`}
              className="w-full h-full object-cover"
            />
          ) : (
            <span style={{ color: '#C4C4C8', fontFamily: 'Geist, sans-serif', fontSize: 12 }}>画像なし</span>
          )}
          {scanning && (
            <div
              className="absolute inset-0 pointer-events-none overflow-hidden"
              style={{ borderRadius: 6 }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: 48,
                  background: 'linear-gradient(to bottom, transparent, rgba(59,125,216,0.25) 50%, transparent)',
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
  const navigate = useNavigate();
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [test, setTest] = useState<ABTest | null>(null);
  const { personas } = usePersonas();

  useEffect(() => {
    if (!id) return;
    getTest(id).then(setTest).catch(() => {});
  }, [id]);

  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;

    async function poll() {
      try {
        const data = await getProgress(id!);
        if (!active) return;
        setProgress(data);
        if (data.status === 'completed' || data.status === 'failed') {
          setIsDone(true);
          return;
        }
      } catch {
        // ポーリング失敗は無視して継続
      }
      if (active) setTimeout(poll, 3000);
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

  return (
    <div className="flex flex-col gap-5 p-8 pb-10" style={{ height: '100%' }}>
      {/* Header */}
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

      {/* Design thumbnails */}
      <div className="flex gap-4">
        <DesignThumb
          label="A案"
          imageKey={test?.designAInput?.imageKey}
          dotColor="#3B7DD8"
          scanning={!isDone}
        />
        <DesignThumb
          label="B案"
          imageKey={test?.designBInput?.imageKey}
          dotColor="#E0883A"
          scanning={!isDone}
        />
      </div>

      {/* Persona stage */}
      <div
        className="relative overflow-hidden flex-1 rounded-md"
        style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 10, minHeight: 240 }}
      >
        {Array.from({ length: displayCount }).map((_, i) => {
          const persona = relevantPersonas[i];
          const name = persona?.displayName ?? `P${i + 1}`;
          const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
          const pos = SCATTER_POSITIONS[i % SCATTER_POSITIONS.length];
          const done = i < completed;

          return (
            <div
              key={i}
              className="absolute flex flex-col items-center gap-1.5"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)',
                transition: 'opacity 0.5s',
                opacity: done ? 1 : 0.35,
              }}
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 48, height: 48, background: color.bg, borderRadius: 9999 }}
              >
                <span style={{ color: color.text, fontFamily: 'Geist, sans-serif', fontSize: 17, fontWeight: 600 }}>
                  {name.charAt(0)}
                </span>
              </div>
              <span style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 11, whiteSpace: 'nowrap' }}>
                {name}
              </span>
              {done && (
                <span
                  className="rounded-full px-2 py-0.5"
                  style={{ background: '#E6F4EC', color: '#2E9E5B', fontFamily: 'Geist, sans-serif', fontSize: 10, fontWeight: 600 }}
                >
                  完了
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
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
            style={{ width: `${pct}%`, background: isDone ? '#2E9E5B' : '#3B7DD8' }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>
            {isDone ? '評価が完了しました' : `${pct}% 完了`}
          </span>
          {failed > 0 && (
            <span style={{ color: '#D64545', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>
              失敗: {failed}件
            </span>
          )}
        </div>
      </div>

      {/* Done CTA */}
      {isDone && (
        <div className="flex justify-end">
          <Link
            to={`/tests/${id}/report`}
            className="flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#0A0A0A', borderRadius: 6 }}
          >
            結果を見る
            <ArrowRight size={16} color="#FFFFFF" />
          </Link>
        </div>
      )}
    </div>
  );
}
