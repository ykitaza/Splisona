import React from 'react';
import { useCurrentFrame, interpolate, Img, staticFile } from 'remotion';
import { AppShell } from '../components/AppShell';
import { Caption } from '../components/Caption';
import { PersonaNode } from '../components/PersonaNode';
import {
  BASE, SURFACE, RAISED, HAIRLINE,
  TEXT_HI, TEXT_MID, TEXT_LO,
  ACCENT, WIN_B,
} from '../lib/colors';
import { loadFonts, FONT_SANS, FONT_MONO } from '../lib/fonts';

/* ── seed data ──────────────────────────────────────────── */

const TYPED_URL = 'https://aurora-brand.com/lp-v2';
const TYPED_URL_B = 'https://figma.com/design/aX3k/AURORA-LP-Bold';

const PERSONAS = [
  { name: 'タクミ', type: '行動重視型', seed: 'takumi' },
  { name: 'ナオ', type: 'トレンド敏感型', seed: 'nao' },
  { name: 'ヨウコ', type: '慎重型', seed: 'youko' },
  { name: 'マサル', type: '効率主義型', seed: 'masaru' },
  { name: 'ソラ', type: 'トレンド敏感型', seed: 'sora' },
  { name: 'ミウ', type: '情報感度型', seed: 'miu' },
  { name: 'アキラ', type: '行動重視型', seed: 'akira' },
  { name: 'レイ', type: '慎重型', seed: 'rei' },
  { name: 'ユカ', type: 'コスパ重視型', seed: 'yuka' },
  { name: 'ダイチ', type: '効率主義型', seed: 'daichi' },
  { name: 'アオイ', type: 'トレンド敏感型', seed: 'aoi' },
  { name: 'シュン', type: '情報感度型', seed: 'shun' },
];

/* ── inline SVG icons ───────────────────────────────────── */

function XIcon({ size = 14, color = TEXT_LO }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

function Link2Icon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={TEXT_LO} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 17H7A5 5 0 0 1 7 7h2" /><path d="M15 7h2a5 5 0 1 1 0 10h-2" /><line x1="8" x2="16" y1="12" y2="12" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT_MID} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEXT_HI} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}

function CheckIcon({ size = 10, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SlidersHIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT_MID} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="21" x2="14" y1="4" y2="4" /><line x1="10" x2="3" y1="4" y2="4" />
      <line x1="21" x2="12" y1="12" y2="12" /><line x1="8" x2="3" y1="12" y2="12" />
      <line x1="21" x2="16" y1="20" y2="20" /><line x1="12" x2="3" y1="20" y2="20" />
      <line x1="14" x2="14" y1="2" y2="6" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="16" x2="16" y1="18" y2="22" />
    </svg>
  );
}

/* ── form panel (A/B) ───────────────────────────────────── */

function FormPanel({
  side, urlText, showCursor, loading, captured, spinAngle, imgSrc, activeTab = 'url',
}: {
  side: 'A' | 'B';
  urlText: string;
  showCursor: boolean;
  loading: boolean;
  captured: boolean;
  spinAngle: number;
  imgSrc?: string;
  activeTab?: 'image' | 'figma' | 'url';
}) {
  const dotColor = side === 'A' ? ACCENT : WIN_B;
  const hasUrl = urlText.length > 0;
  const tabs = [
    { id: 'image', label: '画像', active: activeTab === 'image' },
    { id: 'figma', label: 'Figma', active: activeTab === 'figma' },
    { id: 'url', label: 'URL', active: activeTab === 'url' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: dotColor }} />
        <span style={{ fontFamily: FONT_SANS, fontSize: 18, fontWeight: 600, color: TEXT_HI }}>{side}案</span>
        <div style={{ flex: 1 }} />
        {captured && (
          <span style={{ fontFamily: FONT_SANS, fontSize: 12, fontWeight: 500, color: side === 'A' ? ACCENT : WIN_B }}>入力済</span>
        )}
      </div>

      {/* tab bar */}
      <div style={{
        display: 'flex', alignItems: 'center',
        border: `1px solid ${HAIRLINE}`, background: SURFACE,
        borderRadius: 10, padding: 3, gap: 2,
      }}>
        {tabs.map((t) => (
          <div key={t.id} style={{
            borderRadius: 6, padding: '8px 12px',
            background: t.active ? RAISED : 'transparent',
            fontFamily: FONT_MONO, fontSize: 12, letterSpacing: 0.3,
            color: t.active ? TEXT_HI : TEXT_LO,
          }}>
            {t.label}
          </div>
        ))}
      </div>

      {/* URL input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: BASE, border: `1px solid ${HAIRLINE}`,
        borderRadius: 10, padding: '0 12px',
      }}>
        <Link2Icon />
        <div style={{
          flex: 1, padding: '10px 0',
          fontFamily: FONT_MONO, fontSize: 13,
          color: hasUrl ? TEXT_HI : TEXT_LO,
          display: 'flex', alignItems: 'center',
        }}>
          {hasUrl ? urlText : 'https://example.com'}
          {showCursor && (
            <span style={{ display: 'inline-block', width: 1, height: 16, background: TEXT_HI, marginLeft: 1 }} />
          )}
        </div>
      </div>

      {/* preview area */}
      <div style={{
        height: 200, borderRadius: 8, background: RAISED, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              border: `2px solid ${TEXT_LO}`, borderTopColor: 'transparent',
              transform: `rotate(${spinAngle}deg)`,
            }} />
            <span style={{ fontFamily: FONT_SANS, fontSize: 12, color: TEXT_LO }}>取得中...</span>
          </div>
        ) : captured && imgSrc ? (
          <Img src={imgSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' as const }} />
        ) : captured ? (
          <div style={{
            width: '100%', height: '100%', padding: 16,
            display: 'flex', flexDirection: 'column', gap: 8,
            background: 'linear-gradient(180deg, #1a1e2a 0%, #20242e 100%)',
          }}>
            <div style={{ width: '50%', height: 10, borderRadius: 3, background: 'rgba(255,255,255,0.15)' }} />
            <div style={{ width: '80%', height: 7, borderRadius: 2, background: 'rgba(255,255,255,0.07)' }} />
            <div style={{ width: '65%', height: 7, borderRadius: 2, background: 'rgba(255,255,255,0.07)' }} />
            <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
              <div style={{ width: 80, height: 50, borderRadius: 4, background: 'rgba(110,120,217,0.2)' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ width: '70%', height: 6, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }} />
                <div style={{ width: '50%', height: 6, borderRadius: 2, background: 'rgba(255,255,255,0.05)' }} />
              </div>
            </div>
            <div style={{ marginTop: 'auto', width: '35%', height: 14, borderRadius: 4, background: 'rgba(110,120,217,0.25)' }} />
          </div>
        ) : (
          <span style={{ fontFamily: FONT_SANS, fontSize: 12, color: TEXT_LO }}>
            {hasUrl ? '「スクリーンショットを取得」を押してください' : 'URLを入力してください'}
          </span>
        )}
      </div>

      {/* capture button */}
      {hasUrl && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          borderRadius: 6, background: RAISED, border: `1px solid ${HAIRLINE}`,
          padding: '8px 0', opacity: loading ? 0.4 : 1,
        }}>
          <CameraIcon />
          <span style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT_HI }}>
            {captured ? 'スクリーンショットを再取得' : 'スクリーンショットを取得'}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── focus pulse helper ─────────────────────────────────── */

function focusPulse(f: number, trigger: number, dur = 15) {
  const p = interpolate(f, [trigger, trigger + dur / 2, trigger + dur], [0, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return { scale: 1 + p * 0.05, glow: p };
}

/* ── camera zoom helper ────────────────────────────────── */

interface ZoomKF { trigger: number; x: number; y: number; zoom: number; inF?: number; hold?: number; outF?: number }

function cameraZoom(f: number, keyframes: ZoomKF[]) {
  let scale = 1;
  let ox = 960;
  let oy = 540;
  for (const kf of keyframes) {
    const dIn = kf.inF ?? 10;
    const dHold = kf.hold ?? 6;
    const dOut = kf.outF ?? 12;
    const total = dIn + dHold + dOut;
    if (f < kf.trigger || f >= kf.trigger + total) continue;
    const local = f - kf.trigger;
    let p: number;
    if (local < dIn) p = interpolate(local, [0, dIn], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    else if (local < dIn + dHold) p = 1;
    else p = interpolate(local, [dIn + dHold, total], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    scale = 1 + (kf.zoom - 1) * p;
    ox = kf.x;
    oy = kf.y;
    break;
  }
  return { scale, originX: ox, originY: oy };
}

/* ── main scene ─────────────────────────────────────────── */

export const TestCreationScene: React.FC = () => {
  loadFonts();
  const frame = useCurrentFrame();

  /* fade in */
  const formOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  /* A typewriter (50 frames, ~2x faster) */
  const typeStartA = 30;
  const typeEndA = 80;
  const typedCharsA = Math.floor(
    interpolate(frame, [typeStartA, typeEndA], [0, TYPED_URL.length], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    }),
  );
  const typedTextA = TYPED_URL.slice(0, typedCharsA);
  const typeCursorOnA = frame >= typeStartA && frame < typeEndA + 15;
  const typeCursorVisibleA = typeCursorOnA && Math.floor(frame / 15) % 2 === 0;

  /* A capture animation */
  const isLoadingA = frame >= 85 && frame < 120;
  const isCapturedA = frame >= 120;
  const spinAngle = (frame * 12) % 360;

  /* B typewriter (50 frames, ~2x faster) */
  const typeStartB = 130;
  const typeEndB = 175;
  const typedCharsB = Math.floor(
    interpolate(frame, [typeStartB, typeEndB], [0, TYPED_URL_B.length], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    }),
  );
  const typedTextB = TYPED_URL_B.slice(0, typedCharsB);
  const typeCursorOnB = frame >= typeStartB && frame < typeEndB + 15;
  const typeCursorVisibleB = typeCursorOnB && Math.floor(frame / 15) % 2 === 0;

  /* B capture animation */
  const isLoadingB = frame >= 180 && frame < 210;
  const isCapturedB = frame >= 210;

  /* persona section */
  const personaOpacity = interpolate(frame, [215, 225], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const personaTranslateY = interpolate(frame, [215, 225], [12, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  /* persona modal — zoom→間→モーダル開→チェック→zoom→間→確定 */
  const modalOpacity = interpolate(frame, [265, 270, 380, 386], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const showModal = frame >= 265 && frame < 386;
  const checkedCount = frame < 275 ? 0
    : Math.min(12, Math.floor((frame - 275) / 3) + 1);

  /* focus pulse effects (no capture buttons) */
  const changeFocus = focusPulse(frame, 235, 16);
  const confirmFocus = focusPulse(frame, 365, 16);
  const runFocus = focusPulse(frame, 420, 20);

  /* caption */
  const caption = frame < 215
    ? 'URL や Figma リンクを入れるだけ。自動キャプチャ。'
    : '12体のペルソナで一括評価';
  const captionStart = frame < 215 ? 5 : 215;

  const CONTENT_MAX_W = 864;

  /* camera zoom — only on key transition moments */
  const cam = cameraZoom(frame, [
    { trigger: 230, x: 1320, y: 680, zoom: 1.4, inF: 8, hold: 12, outF: 10 },  // 変更ボタン → モーダル開
    { trigger: 415, x: 1400, y: 760, zoom: 1.4, inF: 8, hold: 10, outF: 14 },  // テスト実行 → 次シーンへ
  ]);

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden' }}>
      <div style={{
        width: 1920, height: 1080,
        transform: `scale(${cam.scale})`,
        transformOrigin: `${cam.originX}px ${cam.originY}px`,
      }}>
      <AppShell activeNav="tests">
        {/* ── Test Creation Form ── */}
        <div style={{ position: 'absolute', inset: 0, opacity: formOpacity }}>
          <div style={{
              width: '100%', maxWidth: CONTENT_MAX_W, margin: '0 auto',
              padding: '48px 24px', display: 'flex', flexDirection: 'column', gap: 32,
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: RAISED,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 12px rgba(255,255,255,0.09)',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                      <circle cx="10" cy="12" r="2" fill={TEXT_HI} />
                      <circle cx="22" cy="12" r="2" fill={TEXT_HI} />
                      <circle cx="11" cy="20" r="1.5" fill={TEXT_HI} />
                      <circle cx="16" cy="21.5" r="1.5" fill={TEXT_HI} />
                      <circle cx="21" cy="20" r="1.5" fill={TEXT_HI} />
                    </svg>
                  </div>
                  <span style={{ fontFamily: FONT_SANS, fontSize: 24, fontWeight: 600, color: TEXT_HI }}>
                    新しい A/B テスト
                  </span>
                </div>
                <div style={{
                  width: 34, height: 34, borderRadius: 6,
                  border: `1px solid ${HAIRLINE}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <XIcon size={17} color={TEXT_MID} />
                </div>
              </div>

              {/* 比較対象 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_LO, letterSpacing: 1.2 }}>
                  比較対象
                </span>
                <div style={{ display: 'flex', gap: 48 }}>
                  <FormPanel
                    side="A"
                    urlText={typedTextA}
                    showCursor={typeCursorVisibleA}
                    loading={isLoadingA}
                    captured={isCapturedA}
                    spinAngle={spinAngle}
                    imgSrc={staticFile('screenshots/design-a.png')}
                  />
                  <FormPanel
                    side="B"
                    urlText={typedTextB}
                    showCursor={typeCursorVisibleB}
                    loading={isLoadingB}
                    captured={isCapturedB}
                    spinAngle={spinAngle}
                    imgSrc={staticFile('screenshots/design-b.png')}
                    activeTab="figma"
                  />
                </div>
              </div>

              {/* 対象ペルソナ */}
              <div style={{
                opacity: personaOpacity,
                transform: `translateY(${personaTranslateY}px)`,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_LO, letterSpacing: 1.2 }}>
                    対象ペルソナ
                  </span>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 0',
                    borderTop: `1px solid ${HAIRLINE}`,
                    borderBottom: `1px solid ${HAIRLINE}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ position: 'relative', width: 58, height: 28 }}>
                        {checkedCount > 0
                          ? PERSONAS.slice(0, Math.min(3, checkedCount)).map((p, i) => (
                              <div key={p.seed} style={{
                                position: 'absolute', width: 26, height: 26, top: 1,
                                left: i * 17, zIndex: i,
                                borderRadius: '50%', overflow: 'hidden',
                                boxShadow: `0 0 0 2px ${BASE}`,
                              }}>
                                <PersonaNode seed={p.seed} size={26} />
                              </div>
                            ))
                          : [0, 1, 2].map((i) => (
                              <div key={i} style={{
                                position: 'absolute', width: 26, height: 26, top: 1,
                                left: i * 17, zIndex: i,
                                borderRadius: '50%',
                                border: `1px solid ${HAIRLINE}`,
                                boxShadow: `0 0 0 2px ${BASE}`,
                                background: SURFACE,
                              }} />
                            ))
                        }
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontFamily: FONT_SANS, fontSize: 14, fontWeight: 500, color: TEXT_HI }}>
                          {checkedCount}体を選択中
                        </span>
                        {checkedCount > 0 && (
                          <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_LO }}>
                            {checkedCount === 1 ? 'タクミ' : `タクミ 他${checkedCount - 1}名`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      borderRadius: 10, padding: '8px 16px',
                      border: `1px solid ${HAIRLINE}`,
                      transform: `scale(${changeFocus.scale})`,
                      boxShadow: changeFocus.glow > 0 ? `0 0 ${changeFocus.glow * 18}px rgba(110,120,217,${changeFocus.glow * 0.6})` : 'none',
                    }}>
                      <SlidersHIcon />
                      <span style={{ fontFamily: FONT_SANS, fontSize: 13, fontWeight: 500, color: TEXT_MID }}>
                        変更
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: 8,
              }}>
                <span style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT_LO }}>キャンセル</span>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  borderRadius: 6, padding: '10px 16px',
                  border: `1px solid ${HAIRLINE}`,
                  transform: `scale(${runFocus.scale})`,
                  boxShadow: runFocus.glow > 0 ? `0 0 ${runFocus.glow * 24}px rgba(110,120,217,${runFocus.glow * 0.7})` : 'none',
                }}>
                  <PlayIcon />
                  <span style={{ fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600, color: TEXT_HI }}>
                    テスト実行
                  </span>
                </div>
              </div>
          </div>
        </div>

        {/* ── Persona Selection Modal Overlay ── */}
        {showModal && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(5,6,7,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: modalOpacity,
            zIndex: 10,
          }}>
            <div style={{
              width: 520,
              background: SURFACE,
              border: `1px solid ${HAIRLINE}`,
              borderRadius: 14,
              boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {/* Modal header */}
              <div style={{ padding: '20px 20px 16px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: FONT_SANS, fontSize: 18, fontWeight: 600, color: TEXT_HI }}>
                    ペルソナを選択
                  </span>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    border: `1px solid ${HAIRLINE}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <XIcon size={16} color={TEXT_MID} />
                  </div>
                </div>
                <span style={{ fontFamily: FONT_SANS, fontSize: 13, color: TEXT_MID }}>
                  このテストで評価させる人格を選びます
                </span>
              </div>

              {/* Tab bar */}
              <div style={{
                padding: '0 20px 16px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {['デフォルト', 'カスタム'].map((label, i) => (
                    <div key={label} style={{
                      borderRadius: 999, padding: '6px 12px',
                      background: i === 0 ? RAISED : 'transparent',
                      border: i === 0 ? `1px solid ${HAIRLINE}` : '1px solid transparent',
                      fontFamily: FONT_SANS, fontSize: 13,
                      color: i === 0 ? TEXT_HI : TEXT_MID,
                    }}>
                      {label}
                    </div>
                  ))}
                </div>
                <span style={{ fontFamily: FONT_SANS, fontSize: 13, fontWeight: 500, color: ACCENT }}>
                  全選択
                </span>
              </div>

              {/* Persona list */}
              <div style={{
                padding: '0 12px 12px 12px',
                display: 'flex', flexDirection: 'column',
              }}>
                {PERSONAS.map((persona, idx) => {
                  const isChecked = idx < checkedCount;
                  const checkScale = isChecked ? interpolate(
                    frame,
                    [275 + idx * 3, 275 + idx * 3 + 2],
                    [0.5, 1],
                    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
                  ) : 1;
                  return (
                    <div key={persona.seed} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '8px 12px', borderRadius: 10,
                      background: isChecked ? 'rgba(110,120,217,0.08)' : 'transparent',
                    }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 6, flexShrink: 0,
                        background: isChecked ? ACCENT : 'transparent',
                        border: isChecked ? 'none' : `1.5px solid ${TEXT_LO}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transform: `scale(${checkScale})`,
                      }}>
                        {isChecked && <CheckIcon size={10} />}
                      </div>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                        <PersonaNode seed={persona.seed} size={28} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: 2 }}>
                        <span style={{ fontFamily: FONT_SANS, fontSize: 14, fontWeight: 500, color: TEXT_HI }}>
                          {persona.name}
                        </span>
                        <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_LO }}>
                          {persona.type}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderTop: `1px solid ${HAIRLINE}`,
                padding: '16px 20px 20px 20px',
              }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: TEXT_MID }}>
                  {checkedCount}体選択済み
                </span>
                <div style={{
                  borderRadius: 8, padding: '8px 16px',
                  border: `1px solid ${HAIRLINE}`,
                  fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, color: TEXT_HI,
                  transform: `scale(${confirmFocus.scale})`,
                  boxShadow: confirmFocus.glow > 0 ? `0 0 ${confirmFocus.glow * 18}px rgba(110,120,217,${confirmFocus.glow * 0.6})` : 'none',
                }}>
                  確定
                </div>
              </div>
            </div>
          </div>
        )}
      </AppShell>
      </div>

      <div style={{
        position: 'absolute', bottom: 100, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', zIndex: 50,
      }}>
        <Caption text={caption} startFrame={captionStart} />
      </div>
    </div>
  );
};
