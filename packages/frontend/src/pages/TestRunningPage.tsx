import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProgress, getTest, getReport } from '../api/tests';
import { ArrowRight } from 'lucide-react';
import { usePersonas } from '../hooks/usePersonas';
import { API_BASE } from '../api/client';
import { ImageLightbox } from '../components/ImageLightbox';
import type { ProgressResponse, ABTest, EvaluationResult } from '../types';

const AVATAR_COLORS = [
  { bg: '#E8F0FB', text: '#3B7DD8' },
  { bg: '#FBF0E4', text: '#E0883A' },
  { bg: '#E6F4EC', text: '#2E9E5B' },
  { bg: '#F0F1F3', text: '#666666' },
  { bg: '#F4E6F4', text: '#9B59B6' },
  { bg: '#E6F4F4', text: '#2E9E9E' },
];

// スタンス軸: 左=A案支持 / 中央=迷い・中立 / 右=B案支持
type Zone = 'A' | 'B' | 'center';
const ZONE_X: Record<Zone, number> = { A: 22, center: 50, B: 78 };

// ひまわりの種の配置（黄金角フィロタキシス）: クラスター中心からのpxオフセット
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ≈137.5°
const SEED_SPACING = 64; // 種の間隔(px)。アバター48px+吹き出しの重なりを抑える距離
function sunflowerOffset(k: number): { dx: number; dy: number } {
  const r = SEED_SPACING * Math.sqrt(k); // k=0 は中心
  const theta = k * GOLDEN_ANGLE;
  return { dx: r * Math.cos(theta), dy: r * Math.sin(theta) };
}

const VERDICT_CHIP: Record<'A' | 'B' | 'none', { label: string; bg: string; text: string }> = {
  A: { label: '👍 A案', bg: '#E8F0FB', text: '#3B7DD8' },
  B: { label: '👍 B案', bg: '#FBF0E4', text: '#E0883A' },
  none: { label: '🤝 互角', bg: '#F0F1F3', text: '#666666' },
};

const FAILED_CHIP = { label: '⚠️ 失敗', bg: '#FBEAEA', text: '#D64545' };

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

        // 実行中でも、確定済みの評価だけを逐次取り込み、確定した子から片側へ移動させる
        try {
          const report = await getReport(id!);
          if (!active) return;
          const map: Record<string, EvaluationResult> = {};
          for (const ev of report.evaluations) {
            if (ev.status === 'completed' || ev.status === 'failed') map[ev.personaId] = ev;
          }
          setResults(map);
        } catch {
          // レポート取得失敗は無視して継続
        }

        if (data.status === 'completed' || data.status === 'failed') {
          setIsDone(true);
          return;
        }
      } catch {
        // ポーリング失敗は無視して継続
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

  // 各ペルソナのゾーン（A/中央/B）を決め、ゾーンごとにひまわり配置のインデックスを割り当てる。
  // 結果が来た子からゾーンが確定し、未確定の子は中央クラスターに残る。
  const zoneSeen: Record<Zone, number> = { A: 0, center: 0, B: 0 };
  const stageItems = Array.from({ length: displayCount }).map((_, i) => {
    const persona = relevantPersonas[i];
    const result = persona ? results[persona.personaId] : undefined;
    const winner = result?.status === 'completed' ? result.winner : undefined;
    const isFailed = result?.status === 'failed';
    // 失敗・互角は中央のまま（A/Bに寄せない）
    const zone: Zone = winner === 'A' ? 'A' : winner === 'B' ? 'B' : 'center';
    const seedIndex = zoneSeen[zone]++;
    return { i, persona, result, winner, isFailed, zone, seedIndex };
  });

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

      {/* Persona stage: 左=A案 / 中央=迷い / 右=B案 のスタンス軸 */}
      <div
        className="relative overflow-hidden flex-1 rounded-md"
        style={{
          background: 'linear-gradient(90deg, #E8F0FB 0%, #FFFFFF 50%, #FBF0E4 100%)',
          border: '1px solid #E6E6E8',
          borderRadius: 10,
          minHeight: 240,
        }}
      >
        {/* 軸ラベル */}
        <span
          className="absolute"
          style={{ left: 16, top: 12, color: '#3B7DD8', fontFamily: 'Geist, sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}
        >
          A案 支持
        </span>
        <span
          className="absolute"
          style={{ right: 16, top: 12, color: '#E0883A', fontFamily: 'Geist, sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}
        >
          B案 支持
        </span>

        {stageItems.map(({ i, persona, result, winner, isFailed, zone, seedIndex }) => {
          const name = persona?.displayName ?? `P${i + 1}`;
          const color = AVATAR_COLORS[i % AVATAR_COLORS.length];

          // ゾーン中心(左/中央/右)からのひまわり配置オフセット(px)
          const { dx, dy } = sunflowerOffset(seedIndex);
          // 結果が来た子は確定（揺れ停止）、まだの子は中央で揺れ続ける
          const wavering = !result;
          const chip = result
            ? (winner ? VERDICT_CHIP[winner] : isFailed ? FAILED_CHIP : VERDICT_CHIP.none)
            : null;

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
                style={{
                  animation: wavering ? `persona-waver ${2 + (i % 3) * 0.4}s ease-in-out ${i * 0.18}s infinite` : 'none',
                }}
                className="flex flex-col items-center gap-1.5"
              >
                {/* 吹き出しステータス（アイコンの上） */}
                {(() => {
                  const b = chip ?? { label: '🤔 検討中', bg: '#F0F1F3', text: '#9A9A9F' };
                  return (
                    <div
                      className="relative px-2.5 py-1"
                      style={{
                        background: b.bg,
                        borderRadius: 12,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        marginBottom: 2,
                      }}
                    >
                      <span style={{ color: b.text, fontFamily: 'Geist, sans-serif', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {b.label}
                      </span>
                      {/* 尻尾 */}
                      <div
                        className="absolute"
                        style={{
                          left: '50%',
                          bottom: -3,
                          width: 8,
                          height: 8,
                          background: b.bg,
                          transform: 'translateX(-50%) rotate(45deg)',
                          borderRadius: 1,
                        }}
                      />
                    </div>
                  );
                })()}
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{ width: 48, height: 48, background: color.bg, borderRadius: 9999 }}
                >
                  <span style={{ color: color.text, fontFamily: 'Geist, sans-serif', fontSize: 17, fontWeight: 600 }}>
                    {name.charAt(0)}
                  </span>
                </div>
              </div>
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
