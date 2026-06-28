import { useCurrentFrame, interpolate } from 'remotion';
import { AppShell } from '../components/AppShell';
import { Caption } from '../components/Caption';
import { PersonaNode } from '../components/PersonaNode';
import {
  BASE, SURFACE, RAISED, HAIRLINE,
  TEXT_HI, TEXT_MID, TEXT_LO,
  ACCENT, ACCENT_DIM,
} from '../lib/colors';
import { FONT_SANS, FONT_MONO, loadFonts } from '../lib/fonts';

/* ---- helpers ---- */

const NODE_PALETTE = [
  '#6E78D9', '#C9974F', '#54B587', '#E06A6A',
  '#8B7EC8', '#5BA3D9', '#D97B6E', '#7EC8A4',
];

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

function getNodeColor(seed: string): string {
  return NODE_PALETTE[hashSeed(seed) % NODE_PALETTE.length];
}

function focusPulse(f: number, trigger: number, dur = 15) {
  const p = interpolate(f, [trigger, trigger + dur / 2, trigger + dur], [0, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return { scale: 1 + p * 0.05, glow: p };
}

/* ---- data ---- */

const PERSONAS = [
  { name: 'タクミ', stance: 'せっかち', seed: 'takumi-001', age: 28, gender: '男性', occupation: 'UXデザイナー', freeText: '直感や第一印象で素早く判断する。視覚的なインパクトやCTAの目立ちやすさを重視する。' },
  { name: 'ナオ', stance: '流行敏感', seed: 'nao-002', age: 24, gender: '女性', occupation: 'マーケター', freeText: '流行やビジュアルの洗練度に敏感。デザインの新しさやブランドイメージを重視する。' },
  { name: 'ヨウコ', stance: '慎重', seed: 'youko-003', age: 45, gender: '女性', occupation: '経営企画', freeText: 'リスクを避け、情報を十分に確認してから判断する。信頼性や安心感を重視する。' },
  { name: 'マサル', stance: '効率重視', seed: 'masaru-004', age: 38, gender: '男性', occupation: '営業マネージャー', freeText: '最短経路で目的を達成したい。導線のわかりやすさや操作ステップの少なさを重視する。' },
  { name: 'ソラ', stance: '流行敏感', seed: 'sora-005', age: 21, gender: '男性', occupation: '学生', freeText: '流行やビジュアルの洗練度に敏感。' },
  { name: 'ミウ', stance: '感度高', seed: 'miu-006', age: 32, gender: '女性', occupation: 'データアナリスト', freeText: '最新トレンドや詳細情報を積極的に収集する。' },
];

const GENDERS = ['男性', '女性', 'その他', '指定なし'];
const FREE_TEXT = '直感や第一印象で素早く判断する。視覚的なインパクトやCTAの目立ちやすさを重視する。';

/* ---- inline SVG icons ---- */

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={TEXT_LO} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEXT_HI} strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={TEXT_LO} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEXT_LO} strokeWidth="2" strokeLinecap="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}

/* ---- component ---- */

export const PersonaScene: React.FC = () => {
  loadFonts();
  const frame = useCurrentFrame();

  /* cut: fade from black */
  const cutOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  /* phase transitions (shifted +30 for cut) */
  const listOpacity = interpolate(frame, [25, 40, 125, 140], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const editOpacity = interpolate(frame, [130, 145], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  /* Phase 1: card focus on タクミ */
  const cardFocus = focusPulse(frame, 115, 18);

  /* Phase 2: age slider 28 → 35 */
  const ageValue = Math.round(
    interpolate(frame, [185, 205], [28, 35], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  );
  const ageSliderFocus = focusPulse(frame, 180, 30);

  /* Phase 2: occupation typing */
  const occBase = 'UXデザイナー';
  const occTarget = 'プロダクトマネージャー';
  function getOccupationValue(): string {
    if (frame < 225) return occBase;
    const delEnd = 235;
    if (frame < delEnd) {
      const p = interpolate(frame, [225, delEnd], [occBase.length, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      return occBase.slice(0, Math.ceil(p));
    }
    const p = interpolate(frame, [delEnd, 270], [0, occTarget.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return occTarget.slice(0, Math.floor(p));
  }
  const occValue = getOccupationValue();
  const occEditing = frame >= 220 && frame < 275;

  /* Phase 2: AI draft generation */
  const AI_DRAFT = 'ROIとユーザー体験のバランスを常に意識する。データドリブンな意思決定を好み、A/Bテストの結果を重視する。';
  const aiFocus = focusPulse(frame, 275, 15);
  const aiLoading = frame >= 283 && frame < 293;
  const aiTypeLen = frame >= 293
    ? Math.floor(interpolate(frame, [293, 315], [0, AI_DRAFT.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }))
    : -1;

  /* Phase 2: save button focus */
  const saveFocus = focusPulse(frame, 330, 18);

  /* caption */
  const caption = frame < 130
    ? '評価者のプロファイルを自由にカスタマイズ'
    : frame < 275
      ? '年齢・職業・価値観まで細かく設定できる'
      : 'AIがペルソナの特性を自動で記述';

  return (
    <div style={{ position: 'relative', opacity: cutOpacity }}>
      <AppShell activeNav="personas">
        {/* ===== Phase 1: Persona List ===== */}
        {frame < 140 && (
          <div style={{ position: 'absolute', inset: 0, opacity: listOpacity }}>
            <div style={{ maxWidth: 1024, margin: '0 auto', padding: '48px 32px', display: 'flex', flexDirection: 'column', gap: 32 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: FONT_SANS, fontSize: 24, fontWeight: 600, color: TEXT_HI }}>
                    ペルソナ管理
                  </span>
                  <span style={{
                    fontFamily: FONT_MONO, fontSize: 12, color: TEXT_MID,
                    background: RAISED, borderRadius: 6, padding: '4px 8px',
                  }}>
                    8
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Search */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: 220,
                    borderRadius: 10, background: SURFACE, border: `1px solid ${HAIRLINE}`, padding: '8px 12px',
                  }}>
                    <SearchIcon />
                    <span style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT_LO }}>ペルソナを検索</span>
                  </div>
                  {/* New persona button */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    borderRadius: 6, border: `1px solid ${HAIRLINE}`, padding: '12px 16px',
                    fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600, color: TEXT_HI,
                  }}>
                    <PlusIcon />
                    新規ペルソナ
                  </div>
                </div>
              </div>

              {/* Filter tabs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {['すべて', 'デフォルト', 'カスタム'].map((label, i) => (
                  <div key={label} style={{
                    borderRadius: 999, padding: '8px 16px',
                    background: i === 0 ? RAISED : 'transparent',
                    border: i === 0 ? `1px solid ${HAIRLINE}` : '1px solid transparent',
                    fontFamily: FONT_MONO, fontSize: 12, letterSpacing: 0.5,
                    color: i === 0 ? TEXT_HI : TEXT_LO,
                  }}>
                    {label}
                  </div>
                ))}
              </div>

              {/* Card grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                {PERSONAS.map((p, i) => {
                  const stagger = interpolate(frame, [35 + i * 6, 47 + i * 6], [0, 1], {
                    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
                  });
                  const isTarget = i === 0;
                  const cf = isTarget ? cardFocus : { scale: 1, glow: 0 };
                  const glowColor = getNodeColor(p.seed);
                  const demographics = `${p.age}  ·  ${p.gender}  ·  ${p.occupation}`;

                  return (
                    <div key={p.seed} style={{
                      display: 'flex', flexDirection: 'column', gap: 12,
                      background: SURFACE, borderRadius: 14, padding: '16px 20px',
                      border: isTarget && cf.glow > 0
                        ? `1px solid rgba(110,120,217,${0.3 * cf.glow})`
                        : '1px solid #FFFFFF0F',
                      opacity: stagger,
                      transform: `scale(${cf.scale})`,
                      boxShadow: isTarget && cf.glow > 0
                        ? `0 0 ${cf.glow * 20}px rgba(110,120,217,${cf.glow * 0.15})`
                        : 'none',
                    }}>
                      {/* Top: avatar + name + badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: 12,
                          background: RAISED, border: '1px solid #FFFFFF1F',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: `0 0 12px ${glowColor}40`,
                          flexShrink: 0,
                        }}>
                          <PersonaNode seed={p.seed} size={28} />
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                          <span style={{ fontFamily: FONT_SANS, fontSize: 16, fontWeight: 600, color: TEXT_HI }}>
                            {p.name}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              fontFamily: FONT_MONO, fontSize: 10,
                              background: ACCENT_DIM, color: ACCENT,
                              borderRadius: 5, padding: '3px 9px',
                            }}>
                              {p.stance}
                            </span>
                            <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: TEXT_LO, letterSpacing: 0.5 }}>
                              DEFAULT
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* freeText (3-line clamp) */}
                      <span style={{
                        fontFamily: FONT_SANS, fontSize: 14, color: TEXT_MID, lineHeight: 1.5,
                        display: '-webkit-box', WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical' as never, overflow: 'hidden',
                      }}>
                        {p.freeText}
                      </span>

                      {/* Demographics */}
                      <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_LO, letterSpacing: 0.3 }}>
                        {demographics}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===== Phase 2: Persona Edit (two-column) ===== */}
        {frame >= 130 && (
          <div style={{ position: 'absolute', inset: 0, opacity: editOpacity }}>
            <div style={{ maxWidth: 864, margin: '0 auto', padding: '48px 24px', display: 'flex', flexDirection: 'column', gap: 32 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_LO, letterSpacing: 1.5 }}>
                    新規ペルソナ
                  </span>
                  <span style={{ fontFamily: FONT_SANS, fontSize: 24, fontWeight: 600, color: TEXT_HI }}>
                    ペルソナを作成
                  </span>
                </div>
                <div style={{
                  width: 32, height: 32, borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <XIcon />
                </div>
              </div>

              {/* Two columns */}
              <div style={{ display: 'flex', gap: 48 }}>
                {/* Left: Form */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 32 }}>
                  {/* Avatar + displayName */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: 16,
                      background: RAISED, border: '1px solid #FFFFFF1F',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 0 12px ${getNodeColor('takumi-001')}40`,
                      flexShrink: 0,
                    }}>
                      <PersonaNode seed="takumi-001" size={38} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT_MID }}>表示名</span>
                      <div style={{ borderBottom: `1px solid ${HAIRLINE}`, paddingBottom: 8 }}>
                        <span style={{ fontFamily: FONT_SANS, fontSize: 16, color: TEXT_HI }}>タクミ</span>
                      </div>
                    </div>
                  </div>

                  {/* Section: 基本情報 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_LO, letterSpacing: 0.5 }}>基本情報</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT_MID }}>タイプ</span>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        borderBottom: `1px solid ${HAIRLINE}`, padding: '8px 0',
                      }}>
                        <span style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT_HI }}>行動重視型</span>
                        <ChevronDownIcon />
                      </div>
                    </div>
                  </div>

                  {/* Section: 属性 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_LO, letterSpacing: 0.5 }}>属性</span>

                    {/* 年齢: range slider */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT_MID }}>年齢</span>
                        <span style={{ fontFamily: FONT_MONO, fontSize: 14, color: ACCENT }}>{ageValue}歳</span>
                      </div>
                      <div style={{
                        position: 'relative', height: 20,
                        display: 'flex', alignItems: 'center',
                        transform: `scale(${ageSliderFocus.scale})`,
                      }}>
                        {/* track */}
                        <div style={{ width: '100%', height: 4, borderRadius: 2, background: RAISED }} />
                        {/* filled */}
                        <div style={{
                          position: 'absolute', left: 0, height: 4, borderRadius: 2,
                          background: ACCENT,
                          width: `${((ageValue - 18) / (80 - 18)) * 100}%`,
                        }} />
                        {/* thumb */}
                        <div style={{
                          position: 'absolute',
                          left: `${((ageValue - 18) / (80 - 18)) * 100}%`,
                          width: 16, height: 16, borderRadius: '50%',
                          background: ACCENT, border: `2px solid ${BASE}`,
                          transform: 'translateX(-50%)',
                          boxShadow: ageSliderFocus.glow > 0
                            ? `0 0 ${ageSliderFocus.glow * 12}px rgba(110,120,217,${ageSliderFocus.glow * 0.5})`
                            : 'none',
                        }} />
                      </div>
                    </div>

                    {/* 性別: button group */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <span style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT_MID }}>性別</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {GENDERS.map((g) => {
                          const selected = g === '男性';
                          return (
                            <div key={g} style={{
                              flex: 1, textAlign: 'center' as const,
                              borderRadius: 10, padding: '8px 0',
                              border: selected ? `1px solid ${ACCENT}` : `1px solid ${HAIRLINE}`,
                              background: selected ? ACCENT_DIM : 'transparent',
                              fontFamily: FONT_SANS, fontSize: 14,
                              color: selected ? ACCENT : TEXT_LO,
                              fontWeight: selected ? 600 : 400,
                            }}>
                              {g}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 職業: underline input */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT_MID }}>職業</span>
                      <div style={{
                        borderBottom: occEditing ? `1px solid ${ACCENT}` : `1px solid ${HAIRLINE}`,
                        paddingBottom: 8,
                      }}>
                        <span style={{ fontFamily: FONT_SANS, fontSize: 16, color: TEXT_HI }}>
                          {occValue}
                          {occEditing && frame % 30 < 15 && (
                            <span style={{
                              display: 'inline-block', width: 1, height: 16,
                              background: TEXT_HI, marginLeft: 1, verticalAlign: 'middle',
                            }} />
                          )}
                        </span>
                      </div>
                    </div>

                    {/* 年収: dropdown */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT_MID }}>年収</span>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        borderBottom: `1px solid ${HAIRLINE}`, padding: '8px 0',
                      }}>
                        <span style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT_HI }}>520万円</span>
                        <ChevronDownIcon />
                      </div>
                    </div>

                    {/* 学歴: dropdown */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT_MID }}>学歴</span>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        borderBottom: `1px solid ${HAIRLINE}`, padding: '8px 0',
                      }}>
                        <span style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT_HI }}>大卒</span>
                        <ChevronDownIcon />
                      </div>
                    </div>
                  </div>

                  {/* Section: 自由記述 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_LO, letterSpacing: 0.5 }}>自由記述</span>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        borderRadius: 6, padding: '4px 8px',
                        transform: `scale(${aiFocus.scale})`,
                        boxShadow: aiFocus.glow > 0
                          ? `0 0 ${aiFocus.glow * 14}px rgba(110,120,217,${aiFocus.glow * 0.5})`
                          : 'none',
                        background: aiLoading ? ACCENT_DIM : 'transparent',
                      }}>
                        {aiLoading ? (
                          <span style={{ fontFamily: FONT_SANS, fontSize: 12, color: ACCENT, fontWeight: 500 }}>生成中…</span>
                        ) : (
                          <>
                            <SparklesIcon />
                            <span style={{ fontFamily: FONT_SANS, fontSize: 12, color: ACCENT, fontWeight: 500 }}>AIで下書き</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ borderBottom: `1px solid ${HAIRLINE}`, paddingBottom: 8, minHeight: 52 }}>
                      <span style={{ fontFamily: FONT_SANS, fontSize: 16, color: TEXT_HI, lineHeight: 1.6 }}>
                        {aiTypeLen >= 0 ? (
                          <>
                            {AI_DRAFT.slice(0, aiTypeLen)}
                            {aiTypeLen < AI_DRAFT.length && frame % 30 < 15 && (
                              <span style={{
                                display: 'inline-block', width: 1, height: 16,
                                background: ACCENT, marginLeft: 1, verticalAlign: 'middle',
                              }} />
                            )}
                          </>
                        ) : aiLoading ? (
                          <span style={{ color: TEXT_LO }}>…</span>
                        ) : (
                          FREE_TEXT
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Preview */}
                <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_LO, letterSpacing: 0.5 }}>プレビュー</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 96, height: 96, borderRadius: 24,
                      background: RAISED, border: '1px solid #FFFFFF1F',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 0 16px ${getNodeColor('takumi-001')}40`,
                    }}>
                      <PersonaNode seed="takumi-001" size={56} />
                    </div>
                    <span style={{ fontFamily: FONT_SANS, fontSize: 18, fontWeight: 600, color: TEXT_HI }}>
                      タクミ
                    </span>
                    <span style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT_MID }}>
                      行動重視型
                    </span>
                    <span style={{
                      fontFamily: FONT_SANS, fontSize: 14, color: TEXT_MID,
                      lineHeight: 1.6, textAlign: 'center' as const,
                    }}>
                      {aiTypeLen >= AI_DRAFT.length ? AI_DRAFT : FREE_TEXT}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12,
                borderTop: `1px solid ${HAIRLINE}`, paddingTop: 16,
              }}>
                <div style={{
                  fontFamily: FONT_SANS, fontSize: 14, fontWeight: 500, color: TEXT_MID,
                  borderRadius: 10, border: `1px solid ${HAIRLINE}`, padding: '10px 16px',
                }}>
                  キャンセル
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600, color: '#fff',
                  borderRadius: 10, background: ACCENT, padding: '10px 24px',
                  transform: `scale(${saveFocus.scale})`,
                  boxShadow: saveFocus.glow > 0
                    ? `0 0 ${saveFocus.glow * 16}px rgba(110,120,217,${saveFocus.glow * 0.5})`
                    : 'none',
                }}>
                  <CheckIcon />
                  保存する
                </div>
              </div>
            </div>
          </div>
        )}
      </AppShell>

      {/* Caption overlay */}
      <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 50 }}>
        <Caption text={caption} startFrame={frame < 130 ? 35 : 140} />
      </div>
    </div>
  );
};
