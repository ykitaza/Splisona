import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';
import {
  SURFACE, RAISED, HAIRLINE,
  TEXT_HI, TEXT_MID, TEXT_LO,
  ACCENT, WIN_A, WIN_B, SUCCESS,
} from '../lib/colors';
import { FONT_SANS, FONT_MONO, loadFonts } from '../lib/fonts';
import { FPS } from '../lib/timing';
import { AppShell } from '../components/AppShell';
import { Caption } from '../components/Caption';
import { PersonaNode } from '../components/PersonaNode';

/* ── Data ────────────────────────────────────────────────── */

const PERSONAS = [
  { name: 'タクミ', type: '行動重視型',     winner: 'B' as const, seed: 'takumi-001' },
  { name: 'ナオ',   type: 'トレンド敏感型', winner: 'B' as const, seed: 'nao-002' },
  { name: 'ヨウコ', type: '慎重型',         winner: 'A' as const, seed: 'youko-003' },
  { name: 'マサル', type: '効率主義型',     winner: 'A' as const, seed: 'masaru-004' },
  { name: 'ソラ',   type: 'トレンド敏感型', winner: 'B' as const, seed: 'sora-005' },
  { name: 'ミウ',   type: '情報感度型',     winner: 'B' as const, seed: 'miu-006' },
  { name: 'アキラ', type: '行動重視型',     winner: 'B' as const, seed: 'akira-007' },
  { name: 'レイ',   type: '慎重型',         winner: 'A' as const, seed: 'rei-008' },
  { name: 'ユカ',   type: 'コスパ重視型',   winner: 'B' as const, seed: 'yuka-009' },
  { name: 'ダイチ', type: '効率主義型',     winner: 'B' as const, seed: 'daichi-010' },
  { name: 'アオイ', type: 'トレンド敏感型', winner: 'B' as const, seed: 'aoi-011' },
  { name: 'シュン', type: '情報感度型',     winner: 'B' as const, seed: 'shun-012' },
];

const TOTAL = PERSONAS.length;
const COMPLETION_FRAMES = [25, 45, 65, 85, 100, 115, 130, 145, 160, 175, 195, 215];
const EVAL_START = 5;
const ALL_DONE_FRAME = 230;
const TIME_SCALE = 12;

/* ── Log entries ─────────────────────────────────────────── */

interface LogEntry {
  frame: number;
  host: string;
  msg: string;
  color: 'lo' | 'mid' | 'hi';
}

const LOG_ENTRIES: LogEntry[] = [
  { frame: 2,   host: 'system@splisona', msg: 'セッション開始 sid=a8f3b2c1',              color: 'lo' },
  { frame: 5,   host: 'system@splisona', msg: 'デザインA/B 画像ロード完了',                color: 'lo' },
  { frame: 8,   host: 'system@splisona', msg: 'テスト開始 · 12体を並行評価',               color: 'mid' },
  { frame: 15,  host: 'タクミ@eval', msg: '評価中… (行動重視型)',            color: 'lo' },
  { frame: 25,  host: 'タクミ@eval', msg: '→ B案を支持 (確信度 85%)',       color: 'mid' },
  { frame: 35,  host: 'ナオ@eval',   msg: 'スコアリング完了',               color: 'lo' },
  { frame: 45,  host: 'ナオ@eval',   msg: '→ B案を支持 (確信度 80%)',       color: 'mid' },
  { frame: 55,  host: 'ヨウコ@eval', msg: 'デザイン比較分析中…',            color: 'lo' },
  { frame: 65,  host: 'ヨウコ@eval', msg: '→ A案を支持 (確信度 70%)',       color: 'mid' },
  { frame: 78,  host: 'マサル@eval', msg: '→ A案を支持 (確信度 75%)',       color: 'mid' },
  { frame: 92,  host: 'ソラ@eval',   msg: '→ B案を支持 (確信度 85%)',       color: 'mid' },
  { frame: 108, host: 'ミウ@eval',   msg: '→ B案を支持 (確信度 70%)',       color: 'mid' },
  { frame: 122, host: 'アキラ@eval', msg: '→ B案を支持 (確信度 75%)',       color: 'mid' },
  { frame: 138, host: 'レイ@eval',   msg: '→ A案を支持 (確信度 75%)',       color: 'mid' },
  { frame: 155, host: 'ユカ@eval',   msg: '→ B案を支持 (確信度 65%)',       color: 'mid' },
  { frame: 170, host: 'ダイチ@eval', msg: '→ B案を支持 (確信度 60%)',       color: 'mid' },
  { frame: 188, host: 'アオイ@eval', msg: '→ B案を支持 (確信度 95%)',       color: 'mid' },
  { frame: 208, host: 'シュン@eval', msg: '→ B案を支持 (確信度 90%)',       color: 'mid' },
  { frame: 218, host: 'system@splisona', msg: '全ペルソナ完了 · 集計中…',                  color: 'mid' },
  { frame: 222, host: 'system@splisona', msg: 'A案支持: 3 / B案支持: 9 / 引分: 0',         color: 'hi' },
  { frame: 226, host: 'system@splisona', msg: 'レポート書き込み完了',                       color: 'lo' },
  { frame: 230, host: 'system@splisona', msg: 'exit 0',                                    color: 'mid' },
];

/* ── Inline SVG icons ────────────────────────────────────── */

function CheckIcon({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function SquareIcon({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="5" y="5" rx="2" />
    </svg>
  );
}

function ArrowRightIcon({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function focusPulse(f: number, trigger: number, dur = 15) {
  const p = interpolate(f, [trigger, trigger + dur / 2, trigger + dur], [0, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return { scale: 1 + p * 0.05, glow: p };
}

interface ZoomKF { trigger: number; x: number; y: number; zoom: number; inF?: number; hold?: number; outF?: number }

function cameraZoom(f: number, keyframes: ZoomKF[]) {
  let scale = 1; let ox = 960; let oy = 540;
  for (const kf of keyframes) {
    const dIn = kf.inF ?? 10; const dHold = kf.hold ?? 6; const dOut = kf.outF ?? 12;
    const total = dIn + dHold + dOut;
    if (f < kf.trigger || f >= kf.trigger + total) continue;
    const local = f - kf.trigger;
    let p: number;
    if (local < dIn) p = interpolate(local, [0, dIn], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    else if (local < dIn + dHold) p = 1;
    else p = interpolate(local, [dIn + dHold, total], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    scale = 1 + (kf.zoom - 1) * p; ox = kf.x; oy = kf.y; break;
  }
  return { scale, originX: ox, originY: oy };
}

/* ── Helpers ──────────────────────────────────────────────── */

function formatTime(f: number): string {
  const seconds = Math.floor((f / FPS) * TIME_SCALE);
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

/* ── Scene ────────────────────────────────────────────────── */

const LOG_LINE_H = 26.5;   // 13px * 1.5 lh + 7px gap
const MAX_VISIBLE = 22;

export const RunningScene: React.FC = () => {
  loadFonts();
  const frame = useCurrentFrame();

  const completed = COMPLETION_FRAMES.filter((f) => frame >= f).length;
  const pct = Math.round((completed / TOTAL) * 100);
  const allDone = frame >= ALL_DONE_FRAME;

  const statusColor = allDone ? SUCCESS : ACCENT;
  const statusGlow = allDone ? '#54B587AA' : '#6E78D9AA';
  const pulse = allDone ? 1 : 0.4 + 0.6 * Math.abs(Math.sin(frame * 0.08));

  const resultBtnFocus = focusPulse(frame, 250, 18);

  const cam = cameraZoom(frame, [
    { trigger: 245, x: 1380, y: 100, zoom: 1.5, inF: 8, hold: 12, outF: 12 },
  ]);

  const visibleLogs = LOG_ENTRIES.filter((l) => frame >= l.frame);
  const scrollOffset = Math.max(0, visibleLogs.length - MAX_VISIBLE) * LOG_LINE_H;

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        width: 1920, height: 1080,
        transform: `scale(${cam.scale})`,
        transformOrigin: `${cam.originX}px ${cam.originY}px`,
      }}>
      <AppShell activeNav="tests">
        <div style={{
          width: '100%', maxWidth: 864, margin: '0 auto', padding: '48px 24px',
          display: 'flex', flexDirection: 'column', gap: 32, height: '100%',
        }}>

          {/* ── Header ─────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {/* Status indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                  background: statusColor,
                  boxShadow: `0 0 8px ${statusGlow}`,
                  opacity: pulse,
                }} />
                <span style={{
                  fontFamily: FONT_MONO, fontSize: 11, color: statusColor,
                  letterSpacing: 1.5,
                }}>
                  {allDone ? 'COMPLETED' : 'RUNNING'}
                </span>
              </div>
              {/* Title */}
              <h1 style={{
                fontFamily: FONT_SANS, fontSize: 24, fontWeight: 600,
                color: TEXT_HI, margin: 0,
              }}>
                {allDone ? '評価完了' : '実行中'}
              </h1>
              {/* Test name + elapsed */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ fontFamily: FONT_SANS, fontSize: 13, color: TEXT_MID }}>
                  AURORA LP比較: ミニマル vs ボールド
                </span>
                <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: TEXT_LO }}>·</span>
                <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: TEXT_LO, letterSpacing: 0.3 }}>
                  {allDone ? '所要' : '経過'} {formatTime(frame)}
                </span>
              </div>
            </div>

            {/* Button */}
            {allDone ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                border: `1px solid ${HAIRLINE}`, borderRadius: 6,
                padding: '12px 16px',
                fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600, color: TEXT_HI,
                transform: `scale(${resultBtnFocus.scale})`,
                boxShadow: resultBtnFocus.glow > 0 ? `0 0 ${resultBtnFocus.glow * 20}px rgba(110,120,217,${resultBtnFocus.glow * 0.6})` : 'none',
              }}>
                <ArrowRightIcon color={TEXT_HI} size={14} />
                結果を見る
              </div>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: SURFACE, border: `1px solid ${HAIRLINE}`, borderRadius: 10,
                padding: '10px 15px',
                fontFamily: FONT_SANS, fontSize: 13, fontWeight: 500, color: TEXT_MID,
              }}>
                <SquareIcon color={TEXT_LO} size={14} />
                ここで締める
              </div>
            )}
          </div>

          {/* ── Progress ───────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                <span style={{
                  fontFamily: FONT_MONO, fontSize: 40, fontWeight: 600,
                  color: TEXT_HI, lineHeight: 1,
                }}>
                  {completed}
                </span>
                <span style={{
                  fontFamily: FONT_MONO, fontSize: 24, color: TEXT_LO, lineHeight: 1,
                }}>
                  / {TOTAL} 体 完了
                </span>
              </div>
              <span style={{
                fontFamily: FONT_MONO, fontSize: 18, fontWeight: 600, color: statusColor,
              }}>
                {pct}%
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: RAISED, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 999, background: statusColor,
                width: `${pct}%`,
              }} />
            </div>
          </div>

          {/* ── Columns ────────────────────────────── */}
          <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 48 }}>

            {/* Left – ロースター */}
            <div style={{ display: 'flex', flexDirection: 'column', width: 480, gap: 16 }}>
              <span style={{
                fontFamily: FONT_MONO, fontSize: 11, color: TEXT_LO, letterSpacing: 1.2,
              }}>
                ロースター
              </span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {PERSONAS.map((p, i) => {
                  const isCompleted = frame >= COMPLETION_FRAMES[i];
                  const isEvaluating = !isCompleted && frame >= EVAL_START;

                  const checkScale = isCompleted
                    ? spring({ frame: frame - COMPLETION_FRAMES[i], fps: FPS, config: { damping: 12, stiffness: 200 } })
                    : 0;

                  const evalPulse = 0.4 + 0.6 * Math.abs(Math.sin((frame + i * 10) * 0.1));

                  return (
                    <div key={p.seed}>
                      {i > 0 && <div style={{ height: 1, background: HAIRLINE }} />}
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 0', gap: 12,
                      }}>
                        {/* Left: avatar + text */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <PersonaNode seed={p.seed} size={20} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{
                              fontFamily: FONT_SANS, fontSize: 14, fontWeight: 500, color: TEXT_HI,
                            }}>
                              {p.name}
                            </span>
                            <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: TEXT_LO }}>
                              {p.type}
                            </span>
                          </div>
                        </div>

                        {/* Right: status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {isCompleted && (
                            <span style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              opacity: checkScale, transform: `scale(${checkScale})`,
                            }}>
                              <CheckIcon color={ACCENT} size={14} />
                              <span style={{
                                fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700,
                                color: p.winner === 'A' ? WIN_A : WIN_B,
                              }}>
                                {p.winner}案
                              </span>
                            </span>
                          )}
                          {isEvaluating && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                                background: ACCENT,
                                boxShadow: `0 0 6px ${ACCENT}`,
                                opacity: evalPulse,
                              }} />
                              <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: ACCENT }}>
                                評価中…
                              </span>
                            </span>
                          )}
                          {!isCompleted && !isEvaluating && (
                            <span style={{
                              fontFamily: FONT_MONO, fontSize: 11, color: TEXT_LO, letterSpacing: 0.5,
                            }}>
                              待機
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right – ライブログ */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: 16 }}>
              <span style={{
                fontFamily: FONT_MONO, fontSize: 11, color: TEXT_LO, letterSpacing: 1.2,
              }}>
                ライブログ
              </span>
              <div style={{
                display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0,
                background: SURFACE, border: `1px solid ${HAIRLINE}`, borderRadius: 8,
                padding: '16px 20px', overflow: 'hidden',
              }}>
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 7,
                  transform: `translateY(-${scrollOffset}px)`,
                }}>
                  {visibleLogs.map((entry, i) => {
                    const age = frame - entry.frame;
                    const opacity = interpolate(age, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
                    return (
                      <div key={i} style={{ display: 'flex', gap: 12, opacity }}>
                        <span style={{
                          fontFamily: FONT_MONO, fontSize: 13, color: TEXT_LO, flexShrink: 0,
                        }}>
                          [{formatTime(entry.frame)}]
                        </span>
                        <span style={{
                          fontFamily: FONT_MONO, fontSize: 13, lineHeight: 1.5,
                          color: entry.color === 'hi' ? TEXT_HI
                            : entry.color === 'mid' ? TEXT_MID
                            : TEXT_LO,
                        }}>
                          {entry.host}:~$ {entry.msg}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
      </div>

      {/* Caption overlay */}
      <div style={{
        position: 'absolute', bottom: 40, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
      }}>
        <Caption text="各ペルソナが、それぞれの視点で並列に評価" startFrame={20} />
      </div>
    </div>
  );
};
