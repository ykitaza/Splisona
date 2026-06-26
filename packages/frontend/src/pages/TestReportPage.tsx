import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Download, RefreshCw, Lightbulb, Image, PenTool, Globe, Trophy, Check } from 'lucide-react';
import { ImageLightbox } from '../components/ImageLightbox';
import { getReport, executeTest, exportTest } from '../api/tests';
import { API_BASE } from '../api/client';
import type { ReportResponse, EvaluationScores, DesignInput } from '../types';

const SCORE_LABELS: Record<keyof EvaluationScores, string> = {
  usability: '使いやすさ',
  aesthetics: '見た目',
  clarity: '明確さ',
  engagement: '訴求力',
};

function DonutChart({ rateA, rateB, rateNone }: { rateA: number; rateB: number; rateNone: number }) {
  const size = 120;
  const r = 44;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dashA = circumference * rateA;
  const dashB = circumference * rateB;
  const dashNone = circumference * rateNone;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E6E6E8" strokeWidth={16} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#3B7DD8" strokeWidth={16}
          strokeDasharray={`${dashA} ${circumference}`} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E0883A" strokeWidth={16}
          strokeDasharray={`${dashB} ${circumference}`}
          strokeDashoffset={-dashA} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#C4C4C8" strokeWidth={16}
          strokeDasharray={`${dashNone} ${circumference}`}
          strokeDashoffset={-(dashA + dashB)} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 16, fontWeight: 700 }}>
          {Math.round(rateA * 100)}%
        </span>
      </div>
    </div>
  );
}

function ScoreBar({ label, scoreA, scoreB }: { label: string; scoreA: number; scoreB: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>{label}</span>
        <div className="flex items-center gap-3">
          <span style={{ color: '#3B7DD8', fontFamily: 'Geist Mono, monospace', fontSize: 12, fontWeight: 600, minWidth: 44, textAlign: 'right' }}>
            A {scoreA.toFixed(1)}
          </span>
          <span style={{ color: '#E0883A', fontFamily: 'Geist Mono, monospace', fontSize: 12, fontWeight: 600, minWidth: 44, textAlign: 'right' }}>
            B {scoreB.toFixed(1)}
          </span>
        </div>
      </div>
      <div className="flex gap-1" style={{ height: 6 }}>
        <div className="overflow-hidden rounded-full flex-1" style={{ background: '#F0F1F3' }}>
          <div style={{ width: `${(scoreA / 10) * 100}%`, height: '100%', background: '#3B7DD8', borderRadius: 9999 }} />
        </div>
        <div className="overflow-hidden rounded-full flex-1" style={{ background: '#F0F1F3' }}>
          <div style={{ width: `${(scoreB / 10) * 100}%`, height: '100%', background: '#E0883A', borderRadius: 9999 }} />
        </div>
      </div>
    </div>
  );
}

function ReasonGroup({ caption, color, reasons }: { caption: string; color: string; reasons: string[] }) {
  if (reasons.length === 0) return null;
  return (
    <div className="flex flex-col gap-2.5">
      <span style={{ color, fontFamily: 'Geist Mono, monospace', fontSize: 11, fontWeight: 600, letterSpacing: '0.5px' }}>
        {caption}
      </span>
      {reasons.map((reason, i) => (
        <div key={i} className="flex items-start gap-2">
          <Check size={15} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 13, lineHeight: 1.5 }}>
            {reason}
          </span>
        </div>
      ))}
    </div>
  );
}

function DesignSourceInfo({ input }: { input: DesignInput }) {
  if (input.inputType === 'figma_url') {
    return (
      <a
        href={input.figmaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 min-w-0 hover:opacity-70 transition-opacity"
        style={{ color: '#9A9A9F', textDecoration: 'none' }}
      >
        <PenTool size={13} color="#9A9A9F" style={{ flexShrink: 0 }} />
        <span className="truncate" style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11 }}>
          {input.figmaUrl ?? 'Figma URL'}
        </span>
      </a>
    );
  }
  if (input.inputType === 'site_url') {
    return (
      <a
        href={input.siteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 min-w-0 hover:opacity-70 transition-opacity"
        style={{ color: '#9A9A9F', textDecoration: 'none' }}
      >
        <Globe size={13} color="#9A9A9F" style={{ flexShrink: 0 }} />
        <span className="truncate" style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11 }}>
          {input.siteUrl ?? 'サイトURL'}
        </span>
      </a>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <Image size={13} color="#9A9A9F" style={{ flexShrink: 0 }} />
      <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11 }}>画像アップロード</span>
    </div>
  );
}

function DesignCard({
  side,
  input,
  isWinner,
  supportRate,
  supportCount,
  totalCount,
}: {
  side: 'A' | 'B';
  input: DesignInput;
  isWinner: boolean;
  supportRate: number;
  supportCount: number;
  totalCount: number;
}) {
  const [lightbox, setLightbox] = useState(false);
  const accentColor = side === 'A' ? '#3B7DD8' : '#E0883A';
  const softColor = side === 'A' ? '#E8F0FB' : '#FBF0E4';
  const borderColor = isWinner ? accentColor : '#E6E6E8';
  const borderWidth = isWinner ? 2 : 1;

  const imageUrl = input.imageKey ? `${API_BASE}/stub-upload/${input.imageKey}` : null;

  return (
    <>
      {lightbox && imageUrl && <ImageLightbox src={imageUrl} alt={`${side}案`} onClose={() => setLightbox(false)} />}
    <div
      className="flex flex-col overflow-hidden flex-1"
      style={{ borderRadius: 10, border: `${borderWidth}px solid ${borderColor}`, background: '#FFFFFF' }}
    >
      <div
        className="flex items-center justify-center overflow-hidden flex-shrink-0"
        style={{ height: 240, background: '#F0F1F3', cursor: imageUrl ? 'zoom-in' : 'default' }}
        onClick={() => { if (imageUrl) setLightbox(true); }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={`${side}案`} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Image size={32} color="#D4D4D8" />
            <span style={{ color: '#D4D4D8', fontFamily: 'Geist, sans-serif', fontSize: 12 }}>画像なし</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2.5 p-4">
        <div className="flex items-center justify-between">
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: softColor, color: accentColor, borderRadius: 9999 }}
          >
            {side}案
          </span>
          {isWinner && (
            <span
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ background: accentColor, color: '#FFFFFF', borderRadius: 9999 }}
            >
              <Trophy size={11} color="#FFFFFF" />
              勝者
            </span>
          )}
        </div>
        <DesignSourceInfo input={input} />
        <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 13, fontWeight: 500 }}>
          {totalCount}人中{supportCount}人が支持 ・ {Math.round(supportRate * 100)}%
        </span>
      </div>
    </div>
    </>
  );
}

export function TestReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [isRerunning, setIsRerunning] = useState(false);

  useEffect(() => {
    if (!id) return;
    getReport(id).then(setReport);
  }, [id]);

  async function handleRerun() {
    if (!id) return;
    setIsRerunning(true);
    try {
      await executeTest(id);
      navigate(`/tests/${id}/running`);
    } finally {
      setIsRerunning(false);
    }
  }

  async function handleExport() {
    if (!id) return;
    const csv = await exportTest(id);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chorus-report-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center h-full">
        <div role="status" className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  const { abTest, summary, evaluations } = report;
  const pctA = Math.round(summary.supportRateA * 100);
  const pctB = Math.round(summary.supportRateB * 100);
  const winnerLabel =
    summary.winner === 'tie' ? '引き分け' : `${summary.winner}案の勝ち`;
  const winnerColor = summary.winner === 'A' ? '#3B7DD8' : summary.winner === 'B' ? '#E0883A' : '#9A9A9F';
  const pctNone = Math.round((summary.supportRateNone ?? 0) * 100);

  const supportCountA = Math.round(summary.supportRateA * summary.totalPersonas);
  const supportCountB = Math.round(summary.supportRateB * summary.totalPersonas);

  return (
    <div className="flex flex-col gap-6 p-8 pb-10">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1.5">
          <Link
            to="/dashboard"
            className="flex items-center gap-1"
            style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 12 }}
          >
            <ChevronLeft size={14} color="#9A9A9F" />
            ダッシュボード
          </Link>
          <h1 style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 28, fontWeight: 600 }}>
            テスト結果
          </h1>
          <p style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>
            {abTest.title} ・ {new Date(abTest.createdAt).toLocaleDateString('ja-JP')} 実行
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
            style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 6, color: '#1A1A1A' }}
          >
            <Download size={15} color="#1A1A1A" />
            エクスポート
          </button>
          <button
            type="button"
            disabled={isRerunning}
            onClick={handleRerun}
            className="flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-40"
            style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 6, color: '#1A1A1A' }}
          >
            <RefreshCw size={15} color="#1A1A1A" />
            再実行
          </button>
        </div>
      </div>

      {/* Verdict Card（比較したデザインを統合） */}
      <div
        className="flex flex-col gap-6 rounded-md p-6"
        style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 10 }}
      >
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2 flex-1">
            <span
              style={{ color: winnerColor, fontFamily: 'Geist, sans-serif', fontSize: 13, fontWeight: 600, letterSpacing: '0.5px' }}
            >
              {summary.winner !== 'tie' ? '🏆 WINNER' : '— DRAW'}
            </span>
            <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 28, fontWeight: 700 }}>
              {winnerLabel}
            </span>
            <div className="flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1.5">
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 9999, background: '#3B7DD8' }} />
                <span style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>A: {pctA}%</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 9999, background: '#E0883A' }} />
                <span style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>B: {pctB}%</span>
              </span>
              {pctNone > 0 && (
                <span className="flex items-center gap-1.5">
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 9999, background: '#C4C4C8' }} />
                  <span style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>なし: {pctNone}%</span>
                </span>
              )}
              <span style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>
                {summary.completedPersonas}/{summary.totalPersonas}人が評価完了
              </span>
            </div>
          </div>
          <DonutChart rateA={summary.supportRateA} rateB={summary.supportRateB} rateNone={summary.supportRateNone ?? 0} />
        </div>

        {summary.winnersReasonSummary && (
          <div
            className="flex items-start gap-2.5 rounded-md px-4 py-3"
            style={{ background: '#E8F0FB', borderRadius: 6 }}
          >
            <Lightbulb size={18} color="#3B7DD8" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>
              主な理由: {summary.winnersReasonSummary}
            </p>
          </div>
        )}

        <div style={{ borderTop: '1px solid #E6E6E8' }} />

        <div className="flex flex-col gap-3">
          <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 15, fontWeight: 600 }}>
            比較したデザイン
          </span>
          <div className="flex items-center gap-6 min-w-0">
            <DesignCard
              side="A"
              input={abTest.designAInput}
              isWinner={summary.winner === 'A'}
              supportRate={summary.supportRateA}
              supportCount={supportCountA}
              totalCount={summary.totalPersonas}
            />
<DesignCard
              side="B"
              input={abTest.designBInput}
              isWinner={summary.winner === 'B'}
              supportRate={summary.supportRateB}
              supportCount={supportCountB}
              totalCount={summary.totalPersonas}
            />
          </div>
        </div>
      </div>

      {/* Summary Row: 評価のまとめ + 評価軸別の比較 */}
      <div className="flex gap-6">
        {/* 評価のまとめ */}
        <div
          className="flex flex-col gap-4 rounded-md p-6 flex-1"
          style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 10 }}
        >
          <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 16, fontWeight: 600 }}>
            評価のまとめ
          </span>
          {summary.reasonSummaryA.length === 0 && summary.reasonSummaryB.length === 0 ? (
            <p style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>—</p>
          ) : (
            <>
              <ReasonGroup
                caption="A案が支持された理由"
                color="#3B7DD8"
                reasons={summary.reasonSummaryA}
              />
              <ReasonGroup
                caption="B案が評価された点"
                color="#E0883A"
                reasons={summary.reasonSummaryB}
              />
            </>
          )}
        </div>

        {/* 評価軸別の比較 */}
        <div
          className="flex flex-col gap-5 rounded-md p-6 flex-1"
          style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 10 }}
        >
          <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 16, fontWeight: 600 }}>
            評価軸別の比較
          </span>
          {(Object.keys(SCORE_LABELS) as (keyof EvaluationScores)[]).map((key) => (
            <ScoreBar
              key={key}
              label={SCORE_LABELS[key]}
              scoreA={summary.avgScores.A[key]}
              scoreB={summary.avgScores.B[key]}
            />
          ))}
        </div>
      </div>

      {/* Persona Table */}
      <div className="flex flex-col gap-3">
        <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 16, fontWeight: 600 }}>
          ペルソナ別の評価
        </span>
        <div
          className="overflow-hidden rounded-md"
          style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 10 }}
        >
          <div
            className="flex items-center"
            style={{ background: '#F0F1F3', padding: '12px 16px' }}
          >
            <div style={{ width: 180 }}>
              <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: '0.5px' }}>ペルソナ</span>
            </div>
            <div style={{ width: 80 }}>
              <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: '0.5px' }}>勝者</span>
            </div>
            <div className="flex-1">
              <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: '0.5px' }}>コメント</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            {evaluations.map((ev, i) => (
              <div
                key={ev.personaId}
                className="flex items-start"
                style={{
                  padding: '16px 16px',
                  borderTop: i > 0 ? '1px solid #E6E6E8' : 'none',
                }}
              >
                <div style={{ width: 180 }}>
                  <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 14, fontWeight: 500 }}>
                    {ev.personaDisplayName}
                  </span>
                  {ev.status === 'failed' && (
                    <span className="block text-xs mt-0.5" style={{ color: '#D64545' }}>失敗</span>
                  )}
                </div>
                <div style={{ width: 80 }}>
                  {ev.status !== 'failed' && (
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold"
                      style={{
                        background: ev.winner === 'A' ? '#E8F0FB' : ev.winner === 'B' ? '#FBF0E4' : '#F0F1F3',
                        color: ev.winner === 'A' ? '#3B7DD8' : ev.winner === 'B' ? '#E0883A' : '#9A9A9F',
                        borderRadius: 9999,
                      }}
                    >
                      {ev.winner === 'none' ? 'なし' : `${ev.winner}案`}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 13, lineHeight: 1.5 }}>
                    {ev.reason || '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
