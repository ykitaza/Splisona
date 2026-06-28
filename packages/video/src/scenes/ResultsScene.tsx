import { useCurrentFrame, interpolate, Img, staticFile } from 'remotion';
import { AppShell } from '../components/AppShell';
import { Caption } from '../components/Caption';
import { PersonaNode } from '../components/PersonaNode';
import {
  BASE, HAIRLINE, TEXT_HI, TEXT_MID, TEXT_LO,
  ACCENT, ACCENT_DIM, WIN_A, WIN_B, RAISED, SURFACE,
} from '../lib/colors';
import { FONT_SANS, FONT_MONO, loadFonts } from '../lib/fonts';

/* ── Inline SVG Icons ── */

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={TEXT_MID} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={TEXT_MID} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

function LightbulbIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  );
}

function CheckIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 3 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ChevronDownIcon({ rotation = 0 }: { rotation?: number }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEXT_LO} strokeWidth="2" strokeLinecap="round" style={{ transition: 'transform 0.15s', transform: `rotate(${rotation}deg)`, flexShrink: 0 }}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/* ── Static Data ── */

const PERSONAS = [
  { id: 'p01', name: 'タクミ', type: 'UXデザイナー', winner: 'B', confidence: 85, reason: 'B案のビジュアル階層が明瞭で、CTAの視認性が高い' },
  { id: 'p02', name: 'ナオ', type: 'マーケター', winner: 'B', confidence: 80, reason: 'B案はCVR向上に直結する情報配置になっている' },
  { id: 'p03', name: 'ヨウコ', type: '経営企画', winner: 'A', confidence: 70, reason: 'A案の方が信頼感のあるトーンでブランドに合致' },
  { id: 'p04', name: 'マサル', type: 'システム管理者', winner: 'A', confidence: 75, reason: 'A案はナビゲーション構造が論理的で使いやすい' },
  { id: 'p05', name: 'ソラ', type: '学生', winner: 'B', confidence: 85, reason: 'B案のインパクトが強く、最初の印象で引き込まれた' },
  { id: 'p06', name: 'ミウ', type: 'グラフィックデザイナー', winner: 'B', confidence: 70, reason: 'B案の配色とタイポグラフィのバランスが洗練されている' },
  { id: 'p07', name: 'アキラ', type: 'プロダクトマネージャー', winner: 'B', confidence: 75, reason: 'B案はユーザー行動を促す設計になっている' },
  { id: 'p08', name: 'レイ', type: '情報アーキテクト', winner: 'A', confidence: 75, reason: 'A案の情報設計が体系的で長文コンテンツに適している' },
  { id: 'p09', name: 'ユカ', type: 'フリーランス', winner: 'B', confidence: 65, reason: 'B案の方がモバイルでの操作感が良さそう' },
  { id: 'p10', name: 'ダイチ', type: '中小企業経営者', winner: 'B', confidence: 60, reason: 'B案は要点が伝わりやすく、限られた時間でも理解できる' },
  { id: 'p11', name: 'アオイ', type: '大学生', winner: 'B', confidence: 95, reason: 'B案のデザインが現代的で親しみやすい' },
  { id: 'p12', name: 'シュン', type: 'SNSマーケター', winner: 'B', confidence: 90, reason: 'B案はSNSでのシェア時に映えるビジュアル構成' },
];

const REASONS_A = [
  '信頼感のある落ち着いたトーン',
  '論理的なナビゲーション構造',
  '長文コンテンツの情報設計が体系的',
];

const REASONS_B = [
  'ビジュアル階層が明瞭でCTA視認性が高い',
  'インパクトのある第一印象でCVRに直結',
  '配色・タイポグラフィが洗練されている',
  'モバイルでの操作性に優れる',
];

const SCORES_A: Record<string, number> = { usability: 75, aesthetics: 60, clarity: 80, engagement: 55, trust: 70 };
const SCORES_B: Record<string, number> = { usability: 85, aesthetics: 90, clarity: 75, engagement: 90, trust: 80 };

const RADAR_AXES = [
  { key: 'usability', label: '使いやすさ' },
  { key: 'aesthetics', label: '見た目' },
  { key: 'clarity', label: '分かりやすさ' },
  { key: 'engagement', label: '行動喚起' },
  { key: 'trust', label: '信頼感' },
];

const HEATMAP_COLS = ['使いやすさ', '魅力', '分かりやすさ', '行動喚起', '信頼感'];

const HEATMAP_ROWS = [
  { label: '行動重視型', count: 3, scores: [82, 88, 72, 85, 75] },
  { label: '慎重型', count: 2, scores: [60, 55, 85, 50, 80] },
  { label: '情報感度型', count: 2, scores: [78, 82, 80, 75, 72] },
  { label: '効率主義型', count: 2, scores: [85, 70, 90, 80, 78] },
  { label: 'コスパ重視型', count: 1, scores: [70, 75, 65, 72, 68] },
  { label: 'トレンド敏感型', count: 2, scores: [90, 95, 70, 92, 75] },
];

/* ── Radar Chart (SVG) ── */

function radarAngle(i: number) {
  return -Math.PI / 2 + (i * 2 * Math.PI) / 5;
}

function radarPt(i: number, radius: number, cx: number, cy: number): [number, number] {
  const a = radarAngle(i);
  return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
}

function RadarChart({ drawProgress }: { drawProgress: number }) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) * 0.72;
  const rings = 4;
  const max = 100;

  function polygonPoints(scores: Record<string, number>, progress: number) {
    return RADAR_AXES.map((axis, i) => {
      const val = Math.min(scores[axis.key] ?? 0, max) * progress;
      const [x, y] = radarPt(i, (r * val) / max, cx, cy);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
  }

  function ringPoints(ringRadius: number) {
    return Array.from({ length: 5 }, (_, i) => {
      const [x, y] = radarPt(i, ringRadius, cx, cy);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {Array.from({ length: rings }, (_, k) => (
        <polygon
          key={`ring-${k}`}
          points={ringPoints((r * (k + 1)) / rings)}
          fill="none"
          stroke={HAIRLINE}
          strokeWidth={1}
        />
      ))}
      {Array.from({ length: 5 }, (_, i) => {
        const [x, y] = radarPt(i, r, cx, cy);
        return <line key={`spoke-${i}`} x1={cx} y1={cy} x2={x} y2={y} stroke={HAIRLINE} strokeWidth={1} />;
      })}
      <polygon
        points={polygonPoints(SCORES_B, drawProgress)}
        fill={WIN_B}
        fillOpacity={0.2}
        stroke={WIN_B}
        strokeWidth={2}
        strokeOpacity={drawProgress}
      />
      <polygon
        points={polygonPoints(SCORES_A, drawProgress)}
        fill={ACCENT}
        fillOpacity={0.2}
        stroke={ACCENT}
        strokeWidth={2}
        strokeOpacity={drawProgress}
      />
      {RADAR_AXES.map((axis, i) => {
        const [x, y] = radarPt(i, r + 22, cx, cy);
        return (
          <text
            key={axis.key}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={TEXT_MID}
            fontFamily={FONT_SANS}
            fontSize={12}
          >
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
}

/* ── Scene ── */

export const ResultsScene: React.FC = () => {
  loadFonts();
  const frame = useCurrentFrame();
  const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

  const fadeIn = interpolate(frame, [0, 20], [0, 1], clamp);
  const scale = interpolate(frame, [60, 75, 82, 90], [1, 1.05, 1.05, 1], clamp);
  const scrollY = interpolate(frame, [0, 90, 140, 200, 260, 340, 400], [0, 0, -300, -700, -1100, -1500, -1750], clamp);
  const radarProgress = interpolate(frame, [150, 195], [0, 1], clamp);

  /* Metadata expansion on first row (タクミ) */
  const EXPAND_TRIGGER = 380;
  const expandProgress = interpolate(frame, [EXPAND_TRIGGER, EXPAND_TRIGGER + 18], [0, 1], clamp);
  const chevronRotation = expandProgress * 180;

  const captions = [
    { cond: frame < 140, text: '12人中9人がデザインBを支持', start: 10 },
    { cond: frame >= 140 && frame < 220, text: '5軸スコアと、ペルソナごとの評価理由', start: 150 },
    { cond: frame >= 220 && frame < 310, text: '属性×評価軸のクロス分析で傾向を発見', start: 225 },
    { cond: frame >= 310 && frame < 400, text: '”誰が、なぜ選んだか” が全員分わかる', start: 315 },
    { cond: frame >= 400, text: '使ったモデルとプロンプトまで追跡できる', start: 405 },
  ];
  const activeCaption = captions.find((c) => c.cond);

  return (
    <AppShell activeNav="tests">
      <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
        {/* Scrollable content */}
        <div style={{
          maxWidth: 864, margin: '0 auto', padding: '48px 24px',
          display: 'flex', flexDirection: 'column', gap: 32,
          opacity: fadeIn,
          transform: `translateY(${scrollY}px) scale(${scale})`,
          transformOrigin: 'top center',
        }}>
          {/* ── Section 1: Title + Winner + Segment Bar ── */}

          {/* Title / breadcrumb */}
          <span style={{ fontFamily: FONT_SANS, fontSize: 15, fontWeight: 600, color: TEXT_HI }}>
            AURORA LP比較: ミニマル vs ボールド
          </span>

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span style={{ fontFamily: FONT_SANS, fontSize: 24, fontWeight: 600, color: TEXT_HI }}>
                結果レポート
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_LO }}>·</span>
                <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_LO, letterSpacing: 0.3 }}>12 ペルソナ</span>
                <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_LO }}>·</span>
                <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_LO, letterSpacing: 0.3 }}>2026/06/15 実行</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: SURFACE, border: `1px solid ${HAIRLINE}`,
                borderRadius: 10, padding: '10px 15px',
              }}>
                <DownloadIcon />
                <span style={{ fontFamily: FONT_SANS, fontSize: 13, fontWeight: 500, color: TEXT_MID }}>書き出し</span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: SURFACE, border: `1px solid ${HAIRLINE}`,
                borderRadius: 10, padding: '10px 15px',
              }}>
                <RefreshIcon />
                <span style={{ fontFamily: FONT_SANS, fontSize: 13, fontWeight: 500, color: TEXT_MID }}>条件を変えて再テスト</span>
              </div>
            </div>
          </div>

          {/* 総合結果 card */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 16,
            background: BASE, border: `1px solid ${HAIRLINE}`,
            borderRadius: 14, padding: 20,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_LO, letterSpacing: 1.2 }}>総合結果</span>
              <span style={{ fontFamily: FONT_SANS, fontSize: 24 }}>
                <span style={{ fontWeight: 700, color: WIN_B }}>デザイン B</span>
                <span style={{ fontWeight: 600, color: TEXT_HI }}> の勝ち</span>
              </span>
              <span style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT_MID }}>
                12人中9人がデザイン B を支持
              </span>
            </div>
            {/* Segment bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', overflow: 'hidden', height: 16, borderRadius: 999, gap: 2 }}>
                <div style={{ flex: 3, background: '#6E78D9A0' }} />
                <div style={{ flex: 9, background: '#C9974FA0' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#6E78D9A0' }} />
                  <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_MID, letterSpacing: 0.3 }}>A 勝利 · 3</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_MID, letterSpacing: 0.3 }}>9 · B 勝利</span>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#C9974FA0' }} />
                </span>
              </div>
            </div>
            {/* Reason callout */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 16px', borderRadius: 6, background: ACCENT_DIM,
            }}>
              <LightbulbIcon />
              <span style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT_HI, lineHeight: 1.6 }}>
                主な理由: B案はビジュアル階層が明瞭で、CTAの視認性が高く、モバイルでの操作性にも優れるため、幅広いペルソナから支持を集めました。
              </span>
            </div>
          </div>

          {/* ── Section 2: Design Comparison ── */}

          <div style={{ height: 1, background: HAIRLINE }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_LO, letterSpacing: 1.2 }}>比較したデザイン</span>
            <div style={{ display: 'flex', gap: 32 }}>
              {/* A */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, paddingLeft: 16, borderLeft: `2px solid ${HAIRLINE}` }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 600, color: TEXT_HI, letterSpacing: 0.5 }}>A案</span>
                <div style={{
                  height: 180, borderRadius: 10, border: `1px solid ${HAIRLINE}`,
                  overflow: 'hidden',
                }}>
                  <Img
                    src={staticFile('screenshots/design-a.png')}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ height: 1, background: HAIRLINE }} />
                <span style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT_MID }}>12人中3人が支持</span>
              </div>
              {/* B (winner) */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, paddingLeft: 16, borderLeft: `2px solid ${WIN_B}` }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 600, color: TEXT_HI, letterSpacing: 0.5 }}>B案</span>
                <div style={{
                  height: 180, borderRadius: 10, border: `1px solid ${HAIRLINE}`,
                  overflow: 'hidden',
                }}>
                  <Img
                    src={staticFile('screenshots/design-b.png')}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ height: 1, background: HAIRLINE }} />
                <span style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT_MID }}>12人中9人が支持</span>
              </div>
            </div>
          </div>

          {/* ── Section 3: Analysis 2-column ── */}

          <div style={{ display: 'flex', gap: 24 }}>
            {/* Left: 評価のまとめ */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 24 }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_LO, letterSpacing: 1.2 }}>評価のまとめ</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 24 }}>
                {/* A reasons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span style={{ fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, color: WIN_A }}>A が支持された理由</span>
                  {REASONS_A.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                      <CheckIcon color={WIN_A} />
                      <span style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT_MID, lineHeight: 1.5 }}>{r}</span>
                    </div>
                  ))}
                </div>
                {/* B reasons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span style={{ fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, color: WIN_B }}>B が評価された点</span>
                  {REASONS_B.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                      <CheckIcon color={WIN_B} />
                      <span style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT_MID, lineHeight: 1.5 }}>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Right: 評価軸別の比較 + Radar */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 24 }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_LO, letterSpacing: 1.2 }}>評価軸別の比較</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: WIN_A }} />
                  <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_MID }}>A案</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: WIN_B }} />
                  <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_MID }}>B案</span>
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
                <RadarChart drawProgress={radarProgress} />
              </div>
            </div>
          </div>

          {/* ── Section: Attribute Heatmap ── */}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600, color: TEXT_HI }}>属性別ヒートマップ</span>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  border: `1px solid ${HAIRLINE}`, borderRadius: 6, padding: 3, background: BASE,
                }}>
                  {['タイプ', '性別', '年齢層'].map((label, idx) => (
                    <span key={label} style={{
                      fontFamily: FONT_SANS, fontSize: 12, borderRadius: 4, padding: '4px 12px',
                      background: idx === 0 ? RAISED : 'transparent',
                      color: idx === 0 ? TEXT_HI : TEXT_LO,
                    }}>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 2,
                border: `1px solid ${HAIRLINE}`, borderRadius: 6, padding: 3, background: BASE,
              }}>
                {(['A', 'B'] as const).map((s) => (
                  <span key={s} style={{
                    fontFamily: FONT_MONO, fontSize: 12, fontWeight: 600, borderRadius: 4, padding: '4px 12px',
                    background: s === 'B' ? 'rgba(201, 151, 79, 0.15)' : 'transparent',
                    color: s === 'B' ? WIN_B : TEXT_LO,
                  }}>
                    {s} スコア
                  </span>
                ))}
              </div>
            </div>

            {/* Table */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Column headers */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${HAIRLINE}` }}>
                <div style={{ width: 140, flexShrink: 0 }} />
                {HEATMAP_COLS.map((label) => (
                  <div key={label} style={{ flex: 1, textAlign: 'center' as const }}>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_LO, letterSpacing: 0.5 }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Rows */}
              {HEATMAP_ROWS.map((row, ri) => {
                const hmRowStart = 220 + ri * 8;
                const hmRowOpacity = interpolate(frame, [hmRowStart, hmRowStart + 12], [0, 1], clamp);
                return (
                  <div key={row.label} style={{
                    display: 'flex', alignItems: 'center',
                    padding: '10px 0', borderBottom: `1px solid ${HAIRLINE}`,
                    opacity: hmRowOpacity,
                  }}>
                    <div style={{ width: 140, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600, color: TEXT_HI }}>{row.label}</span>
                      <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_LO }}>n={row.count}</span>
                    </div>
                    {row.scores.map((score, ci) => {
                      const alpha = score / 100;
                      return (
                        <div key={ci} style={{ flex: 1, padding: '0 4px' }}>
                          <div style={{
                            height: 36, borderRadius: 4,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: `rgba(201, 151, 79, ${(alpha * 0.45).toFixed(3)})`,
                            fontFamily: FONT_MONO, fontSize: 12,
                            color: alpha > 0.4 ? '#ffffff' : TEXT_MID,
                          }}>
                            {score}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Section 4: Persona Breakdown Table ── */}

          <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_LO, letterSpacing: 1.2 }}>ペルソナ別の評価</span>

          <div style={{ background: BASE, border: `1px solid ${HAIRLINE}`, borderRadius: 14, overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px',
              borderBottom: `1px solid ${HAIRLINE}`,
            }}>
              <div style={{ width: 250 }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: TEXT_LO, letterSpacing: 0.8 }}>PERSONA</span>
              </div>
              <div style={{ width: 96 }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: TEXT_LO, letterSpacing: 0.8 }}>勝者</span>
              </div>
              <div style={{ width: 64 }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: TEXT_LO, letterSpacing: 0.8 }}>確信度</span>
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: TEXT_LO, letterSpacing: 0.8 }}>コメント</span>
              </div>
            </div>

            {/* Persona rows */}
            {PERSONAS.map((p, i) => {
              const rowStart = 290 + i * 7;
              const rowOpacity = interpolate(frame, [rowStart, rowStart + 15], [0, 1], clamp);
              const rowY = interpolate(frame, [rowStart, rowStart + 15], [10, 0], clamp);
              const isExpandTarget = i === 0;
              return (
                <div key={p.id}>
                  {i > 0 && <div style={{ height: 1, background: HAIRLINE }} />}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px',
                    opacity: rowOpacity, transform: `translateY(${rowY}px)`,
                    background: isExpandTarget && expandProgress > 0 ? RAISED : 'transparent',
                  }}>
                    {/* Persona cell */}
                    <div style={{ width: 250, display: 'flex', alignItems: 'center', gap: 11 }}>
                      <PersonaNode seed={p.id} size={20} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontFamily: FONT_SANS, fontSize: 14, fontWeight: 500, color: TEXT_HI }}>{p.name}</span>
                        <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: TEXT_LO }}>{p.type}</span>
                      </div>
                    </div>
                    {/* Winner badge */}
                    <div style={{ width: 96 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700,
                        borderRadius: 999, padding: '4px 11px',
                        background: p.winner === 'A' ? '#6E78D922' : '#C9974F22',
                        color: p.winner === 'A' ? WIN_A : WIN_B,
                      }}>
                        {p.winner}案
                      </span>
                    </div>
                    {/* Confidence */}
                    <div style={{ width: 64 }}>
                      <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_MID }}>{p.confidence}%</span>
                    </div>
                    {/* Reason */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontFamily: FONT_SANS, fontSize: 14, color: TEXT_MID, lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                        overflow: 'hidden',
                      }}>
                        {p.reason}
                      </span>
                    </div>
                    {/* Chevron */}
                    <div style={{ width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ChevronDownIcon rotation={isExpandTarget ? chevronRotation : 0} />
                    </div>
                  </div>
                  {/* Expanded metadata panel */}
                  {isExpandTarget && expandProgress > 0 && (
                    <div style={{
                      display: 'flex', flexDirection: 'column', gap: 16,
                      background: RAISED, padding: '8px 16px 20px 297px',
                      opacity: expandProgress,
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: TEXT_LO, letterSpacing: 0.5 }}>使用モデル</span>
                        <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_MID }}>gemini-2.5-flash</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: TEXT_LO, letterSpacing: 0.5 }}>解決済みプロンプト</span>
                        <span style={{ fontFamily: FONT_SANS, fontSize: 13, color: TEXT_MID, lineHeight: 1.5 }}>
                          ペルソナ「タクミ」として、デザイン A と B を比較し、5軸で評価してください。
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: TEXT_LO, letterSpacing: 0.5 }}>コメント全文</span>
                        <span style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT_HI, lineHeight: 1.5 }}>
                          {p.reason}。B案はビジュアル階層が明瞭でCTAボタンの配置が最適化されており、初見ユーザーの直感的な操作を促進する設計になっている。
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Caption overlay */}
        <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          {activeCaption && <Caption text={activeCaption.text} startFrame={activeCaption.start} />}
        </div>
      </div>
    </AppShell>
  );
};
