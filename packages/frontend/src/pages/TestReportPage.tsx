import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ChevronDown, Download, RefreshCw, Lightbulb, Image, PenTool, Globe, Check } from 'lucide-react';
import { ImageLightbox } from '../components/ImageLightbox';
import { RadarChart } from '../components/report/RadarChart';
import { AttributeHeatmap } from '../components/report/AttributeHeatmap';
import { MethodPopover, SourcePopover } from '../components/report/Popovers';
import { getReport, executeTest, exportTest } from '../api/tests';
import { usePersonas } from '../hooks/usePersonas';
import { API_BASE } from '../api/client';
import type { ReportResponse, EvaluationScores, DesignInput } from '../types';

const SCORE_LABELS: Record<keyof EvaluationScores, string> = {
  usability: '使いやすさ',
  aesthetics: '見た目',
  clarity: '明確さ',
  engagement: '訴求力',
  trust: '信頼感',
};

function SegmentBar({ rateA, rateB, rateNone }: { rateA: number; rateB: number; rateNone: number }) {
  const pctA = Math.round(rateA * 100);
  const pctB = Math.round(rateB * 100);
  const pctNone = Math.round(rateNone * 100);
  return (
    <div data-testid="segment-bar" className="flex flex-col gap-2">
      <div className="flex overflow-hidden rounded-sm" style={{ height: 8 }}>
        {pctA > 0 && <div style={{ width: `${pctA}%`, background: 'var(--color-win-a, #6E78D9)' }} />}
        {pctNone > 0 && <div style={{ width: `${pctNone}%`, background: 'var(--color-draw, #3A3D42)' }} />}
        {pctB > 0 && <div style={{ width: `${pctB}%`, background: 'var(--color-win-b, #C9974F)' }} />}
      </div>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-win-a" />
          <span className="text-text-mid font-sans text-sm">A: {pctA}%</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-win-b" />
          <span className="text-text-mid font-sans text-sm">B: {pctB}%</span>
        </span>
        {pctNone > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-draw" />
            <span className="text-text-mid font-sans text-sm">引分: {pctNone}%</span>
          </span>
        )}
      </div>
    </div>
  );
}

function ReasonGroup({ caption, color, reasons }: { caption: string; color: string; reasons: string[] }) {
  if (reasons.length === 0) return null;
  return (
    <div className="flex flex-col gap-2.5">
      <span className="font-mono text-xs font-semibold" style={{ color, letterSpacing: '0.5px' }}>
        {caption}
      </span>
      {reasons.map((reason, i) => (
        <div key={i} className="flex items-start gap-2">
          <Check size={15} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
          <span className="text-text-mid font-sans text-sm leading-relaxed">{reason}</span>
        </div>
      ))}
    </div>
  );
}

function ScoreBars({ label, scoreA, scoreB }: { label: string; scoreA: number; scoreB: number }) {
  const total = scoreA + scoreB;
  const aRatio = total > 0 ? (scoreA / total) * 100 : 50;
  const bRatio = total > 0 ? (scoreB / total) * 100 : 50;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-text-mid font-sans text-sm">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-win-a font-mono text-xs font-semibold" style={{ minWidth: 44, textAlign: 'right' }}>
            A {scoreA.toFixed(1)}
          </span>
          <span className="text-win-b font-mono text-xs font-semibold" style={{ minWidth: 44, textAlign: 'right' }}>
            B {scoreB.toFixed(1)}
          </span>
        </div>
      </div>
      <div className="flex overflow-hidden rounded-full" style={{ height: 6, background: 'var(--color-bg-raised, #1C1F23)' }}>
        <div style={{ width: `${aRatio}%`, height: '100%', background: 'var(--color-win-a, #6E78D9)' }} />
        <div style={{ width: `${bRatio}%`, height: '100%', background: 'var(--color-win-b, #C9974F)' }} />
      </div>
    </div>
  );
}

function DesignSourceInfo({ input }: { input: DesignInput }) {
  if (input.inputType === 'figma_url') {
    return (
      <a href={input.figmaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 min-w-0 text-text-lo hover:opacity-70 transition-opacity">
        <PenTool size={13} className="text-text-lo flex-shrink-0" />
        <span className="truncate font-mono text-xs">{input.figmaUrl ?? 'Figma URL'}</span>
      </a>
    );
  }
  if (input.inputType === 'site_url') {
    return (
      <a href={input.siteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 min-w-0 text-text-lo hover:opacity-70 transition-opacity">
        <Globe size={13} className="text-text-lo flex-shrink-0" />
        <span className="truncate font-mono text-xs">{input.siteUrl ?? 'サイトURL'}</span>
      </a>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-text-lo">
      <Image size={13} className="flex-shrink-0" />
      <span className="font-mono text-xs">画像アップロード</span>
    </div>
  );
}

function DesignCard({ side, input, isWinner, supportCount, totalCount }: {
  side: 'A' | 'B';
  input: DesignInput;
  isWinner: boolean;
  supportCount: number;
  totalCount: number;
}) {
  const [lightbox, setLightbox] = useState(false);
  const imageUrl = input.imageKey ? `${API_BASE}/stub-upload/${input.imageKey}` : null;
  const accentColor = side === 'A' ? 'var(--color-win-a, #6E78D9)' : 'var(--color-win-b, #C9974F)';

  return (
    <>
      {lightbox && imageUrl && <ImageLightbox src={imageUrl} alt={`${side}案`} onClose={() => setLightbox(false)} />}
      <div className="flex flex-col overflow-hidden flex-1" style={{ borderLeft: isWinner ? `2px solid ${accentColor}` : 'none' }}>
        <div
          className="flex items-center justify-center overflow-hidden flex-shrink-0 rounded-md"
          style={{ height: 200, background: 'var(--color-bg-raised, #1C1F23)', cursor: imageUrl ? 'zoom-in' : 'default' }}
          onClick={() => { if (imageUrl) setLightbox(true); }}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={`${side}案`} className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Image size={32} className="text-text-lo" />
              <span className="text-text-lo font-sans text-xs">画像なし</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5 pt-3">
          <span className="text-text-hi font-mono text-xs font-semibold">{side}案</span>
          <DesignSourceInfo input={input} />
          <span className="text-text-mid font-sans text-sm">
            {totalCount}人中{supportCount}人が支持
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { personas } = usePersonas();

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
        <div role="status" className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  const { abTest, summary, evaluations } = report;
  const winnerLabel = summary.winner === 'tie' ? '引き分け' : `${summary.winner}案の勝ち`;
  const supportCountA = Math.round(summary.supportRateA * summary.totalPersonas);
  const supportCountB = Math.round(summary.supportRateB * summary.totalPersonas);
  const winnerSupportCount = summary.winner === 'A' ? supportCountA : summary.winner === 'B' ? supportCountB : 0;

  return (
    <div className="flex flex-col gap-7 p-8 pb-10">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1.5">
          <Link to="/results" className="flex items-center gap-1 text-text-lo font-sans text-xs">
            <ChevronLeft size={14} className="text-text-lo" />
            結果一覧
          </Link>
          <h1 className="text-text-hi font-sans text-xl font-semibold">テスト結果</h1>
          <p className="text-text-lo font-sans text-sm">
            {abTest.title} · {new Date(abTest.createdAt).toLocaleDateString('ja-JP')} 実行
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 rounded-md bg-raised border border-hairline px-4 py-2 text-text-hi font-sans text-sm transition-colors hover:bg-surface"
          >
            <Download size={15} className="text-text-mid" />
            エクスポート
          </button>
          <button
            type="button"
            disabled={isRerunning}
            onClick={handleRerun}
            className="flex items-center gap-2 rounded-md bg-raised border border-hairline px-4 py-2 text-text-hi font-sans text-sm transition-colors hover:bg-surface disabled:opacity-40"
          >
            <RefreshCw size={15} className="text-text-mid" />
            再実行
          </button>
        </div>
      </div>

      {/* Verdict */}
      <div className="flex flex-col gap-5">
        <div className="flex items-baseline gap-3">
          <span className="text-text-hi font-sans text-xl font-bold">{winnerLabel}</span>
          <div className="flex items-center gap-1.5">
            <MethodPopover />
            <SourcePopover />
          </div>
        </div>
        <SegmentBar rateA={summary.supportRateA} rateB={summary.supportRateB} rateNone={summary.supportRateNone ?? 0} />
        <p className="text-text-mid font-sans text-sm">
          {summary.completedPersonas}/{summary.totalPersonas}人が評価完了
          {summary.winner !== 'tie' && ` · ${summary.totalPersonas}人中${winnerSupportCount}人が${summary.winner}を支持`}
        </p>

        {summary.winnersReasonSummary && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-md bg-accent-dim">
            <Lightbulb size={18} className="text-accent flex-shrink-0 mt-0.5" />
            <p className="text-text-hi font-sans text-sm">主な理由: {summary.winnersReasonSummary}</p>
          </div>
        )}
      </div>

      <div className="h-px bg-hairline" />

      {/* Design comparison */}
      <div className="flex flex-col gap-4">
        <span className="text-text-hi font-sans text-base font-semibold">比較したデザイン</span>
        <div className="flex items-start gap-6 min-w-0">
          <DesignCard side="A" input={abTest.designAInput} isWinner={summary.winner === 'A'} supportCount={supportCountA} totalCount={summary.totalPersonas} />
          <DesignCard side="B" input={abTest.designBInput} isWinner={summary.winner === 'B'} supportCount={supportCountB} totalCount={summary.totalPersonas} />
        </div>
      </div>

      <div className="h-px bg-hairline" />

      {/* Analysis row: reasons + score bars + radar */}
      <div className="flex gap-6">
        {/* 評価のまとめ */}
        <div className="flex flex-col gap-4 flex-1">
          <span className="text-text-hi font-sans text-base font-semibold">評価のまとめ</span>
          {summary.reasonSummaryA.length === 0 && summary.reasonSummaryB.length === 0 ? (
            <p className="text-text-lo font-sans text-sm">—</p>
          ) : (
            <>
              <ReasonGroup caption="A案が支持された理由" color="var(--color-win-a, #6E78D9)" reasons={summary.reasonSummaryA} />
              <ReasonGroup caption="B案が評価された点" color="var(--color-win-b, #C9974F)" reasons={summary.reasonSummaryB} />
            </>
          )}
        </div>

        {/* 評価軸別の比較 */}
        <div className="flex flex-col gap-5 flex-1">
          <span className="text-text-hi font-sans text-base font-semibold">評価軸別の比較</span>
          {(Object.keys(SCORE_LABELS) as (keyof EvaluationScores)[]).map((key) => (
            <ScoreBars key={key} label={SCORE_LABELS[key]} scoreA={summary.avgScores.A[key]} scoreB={summary.avgScores.B[key]} />
          ))}
        </div>

        {/* Radar Chart */}
        <div className="flex flex-col gap-3 items-center">
          <span className="text-text-hi font-sans text-base font-semibold">レーダーチャート</span>
          <RadarChart scoresA={summary.avgScores.A} scoresB={summary.avgScores.B} />
        </div>
      </div>

      <div className="h-px bg-hairline" />

      {/* Attribute Heatmap */}
      {personas.length > 0 && evaluations.length > 0 && (
        <div className="flex flex-col gap-4">
          <span className="text-text-hi font-sans text-base font-semibold">属性別分析</span>
          <AttributeHeatmap evaluations={evaluations} personas={personas} groupBy="type" />
        </div>
      )}

      {personas.length > 0 && evaluations.length > 0 && <div className="h-px bg-hairline" />}

      {/* Persona Table */}
      <div className="flex flex-col gap-3">
        <span className="text-text-hi font-sans text-base font-semibold">ペルソナ別の評価</span>
        <div>
          <div className="flex items-center py-3 px-4 border-b border-hairline">
            <div style={{ width: 180 }}>
              <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: '0.5px' }}>ペルソナ</span>
            </div>
            <div style={{ width: 80 }}>
              <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: '0.5px' }}>勝者</span>
            </div>
            <div className="flex-1">
              <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: '0.5px' }}>コメント</span>
            </div>
            <div style={{ width: 32 }} />
          </div>
          {evaluations.map((ev, i) => {
            const isExpanded = expandedId === ev.personaId;
            return (
              <div key={ev.personaId} style={{ borderTop: i > 0 ? '1px solid var(--color-hairline, #FFFFFF14)' : 'none' }}>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : ev.personaId)}
                  className="flex items-start w-full text-left py-4 px-4 transition-colors hover:bg-raised"
                  aria-expanded={isExpanded}
                >
                  <div style={{ width: 180 }}>
                    <span className="text-text-hi font-sans text-sm font-medium">{ev.personaDisplayName}</span>
                    {ev.status === 'failed' && <span className="block text-xs text-danger mt-0.5">失敗</span>}
                  </div>
                  <div style={{ width: 80 }}>
                    {ev.status !== 'failed' && (
                      <span
                        className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold"
                        style={{
                          background: ev.winner === 'A' ? 'var(--color-accent-dim)' : ev.winner === 'B' ? 'var(--color-win-b-dim)' : 'var(--color-bg-raised)',
                          color: ev.winner === 'A' ? 'var(--color-win-a)' : ev.winner === 'B' ? 'var(--color-win-b)' : 'var(--color-text-lo)',
                        }}
                      >
                        {ev.winner === 'none' ? 'なし' : `${ev.winner}案`}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-text-mid font-sans text-sm leading-relaxed"
                      style={isExpanded ? {} : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    >
                      {ev.reason || '—'}
                    </p>
                  </div>
                  <div className="flex items-center justify-center" style={{ width: 32 }}>
                    <ChevronDown size={16} className="text-text-lo" style={{ transition: 'transform 0.15s', transform: isExpanded ? 'rotate(180deg)' : 'none' }} />
                  </div>
                </button>
                {isExpanded && (
                  <div className="flex flex-col gap-4 bg-raised" style={{ padding: '4px 16px 20px 196px' }}>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: '0.5px' }}>コメント全文</span>
                      <p className="text-text-hi font-sans text-sm leading-relaxed whitespace-pre-wrap">{ev.reason || '—'}</p>
                    </div>
                    {ev.status !== 'failed' && ev.scoresA && ev.scoresB && (
                      <div className="flex flex-col gap-3.5">
                        <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: '0.5px' }}>評価軸別スコア</span>
                        {(Object.keys(SCORE_LABELS) as (keyof EvaluationScores)[]).map((key) => (
                          <ScoreBars key={key} label={SCORE_LABELS[key]} scoreA={ev.scoresA[key]} scoreB={ev.scoresB[key]} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
