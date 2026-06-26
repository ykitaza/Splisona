import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronDown, Download, RefreshCw, Lightbulb, Image, PenTool, Globe, Check } from 'lucide-react';
import { ImageLightbox } from '../components/ImageLightbox';
import { RadarChart } from '../components/report/RadarChart';
import { AttributeHeatmap } from '../components/report/AttributeHeatmap';
import { MethodPopover, SourcePopover } from '../components/report/Popovers';
import { HelpDot } from '../components/report/HelpDot';
import { getReport, executeTest, exportTest } from '../api/tests';
import { getConfig } from '../api/settings';
import { usePersonas } from '../hooks/usePersonas';
import { getNodeColor } from '../components/persona/PersonaNode';
import { API_BASE } from '../api/client';
import { PERSONA_TYPE_LABELS } from '../types';
import type { ReportResponse, EvaluationScores, DesignInput, Persona } from '../types';

const SCORE_LABELS: Record<keyof EvaluationScores, string> = {
  usability: '使いやすさ',
  aesthetics: '見た目',
  clarity: '明確さ',
  engagement: '訴求力',
  trust: '信頼感',
};

function SegmentBar({ countA, countB, countNone }: { countA: number; countB: number; countNone: number }) {
  const total = countA + countB + countNone;
  if (total === 0) return null;
  return (
    <div data-testid="segment-bar" className="flex flex-col" style={{ gap: 12 }}>
      <div className="flex overflow-hidden" style={{ height: 16, borderRadius: 999, gap: 2 }}>
        {countA > 0 && <div style={{ flex: countA, background: '#6E78D9A0' }} />}
        {countNone > 0 && <div style={{ flex: countNone, background: '#3A3D4280' }} />}
        {countB > 0 && <div style={{ flex: countB, background: '#C9974FA0' }} />}
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#6E78D9A0' }} />
          <span className="text-text-mid font-mono text-xs" style={{ letterSpacing: 0.3 }}>A 勝利 · {countA}</span>
        </span>
        {countNone > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#3A3D4280' }} />
            <span className="text-text-mid font-mono text-xs" style={{ letterSpacing: 0.3 }}>引分 · {countNone}</span>
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="text-text-mid font-mono text-xs" style={{ letterSpacing: 0.3 }}>{countB} · B 勝利</span>
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#C9974FA0' }} />
        </span>
      </div>
    </div>
  );
}

function ReasonGroup({ caption, color, reasons }: { caption: string; color: string; reasons: string[] }) {
  if (reasons.length === 0) return null;
  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      <span className="font-sans font-semibold" style={{ color, fontSize: 13 }}>
        {caption}
      </span>
      {reasons.map((reason, i) => (
        <div key={i} className="flex items-start" style={{ gap: 9 }}>
          <Check size={14} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
          <span className="text-text-mid font-sans text-sm" style={{ lineHeight: 1.5 }}>{reason}</span>
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
      <div className="flex overflow-hidden rounded-full" style={{ height: 6, background: 'var(--color-raised, #1C1F23)' }}>
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
  const borderColor = isWinner
    ? (side === 'A' ? 'var(--color-win-a)' : 'var(--color-win-b)')
    : 'var(--color-hairline)';

  return (
    <>
      {lightbox && imageUrl && <ImageLightbox src={imageUrl} alt={`${side}案`} onClose={() => setLightbox(false)} />}
      <div
        className="flex flex-col flex-1"
        style={{ gap: 16, paddingLeft: 16, borderLeft: `2px solid ${borderColor}` }}
      >
        <div className="flex items-center justify-between">
          <span className="text-text-hi font-mono text-xs font-semibold" style={{ letterSpacing: 0.5 }}>{side}案</span>
        </div>
        <div
          className="flex items-center justify-center overflow-hidden flex-shrink-0"
          style={{ height: 180, borderRadius: 10, border: '1px solid var(--color-hairline)', cursor: imageUrl ? 'zoom-in' : 'default' }}
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
        <DesignSourceInfo input={input} />
        <div className="h-px bg-hairline" />
        <div className="flex items-center justify-between">
          <span className="text-text-mid font-sans text-sm">{totalCount}人中{supportCount}人が支持</span>
        </div>
      </div>
    </>
  );
}

function AttributePopoverInline({ persona, onClose }: { persona: Persona; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      data-testid="attribute-popover"
      className="absolute z-50 rounded-md bg-raised border border-hairline"
      style={{ top: '100%', left: 0, marginTop: 4, padding: '10px 14px', minWidth: 180, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
    >
      <p className="text-text-hi font-sans text-xs font-semibold mb-2">ペルソナ属性</p>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-text-lo font-mono text-xs">タイプ</span>
          <span className="text-text-mid font-sans text-xs">{PERSONA_TYPE_LABELS[persona.type]}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-text-lo font-mono text-xs">年齢</span>
          <span className="text-text-mid font-sans text-xs">{persona.age ? `${persona.age}歳` : '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-text-lo font-mono text-xs">性別</span>
          <span className="text-text-mid font-sans text-xs">{persona.gender ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-text-lo font-mono text-xs">職業</span>
          <span className="text-text-mid font-sans text-xs">{persona.occupation ?? '—'}</span>
        </div>
      </div>
    </div>
  );
}

export function TestReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [isRerunning, setIsRerunning] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [attrPopoverId, setAttrPopoverId] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string>('');
  const { personas } = usePersonas();

  useEffect(() => {
    if (!id) return;
    getReport(id).then(setReport);
    getConfig().then((c) => setModelId(c.modelId));
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
  const countNone = summary.totalPersonas - supportCountA - supportCountB;

  return (
    <div className="flex flex-col p-8" style={{ gap: 32 }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col" style={{ gap: 7 }}>
          <span className="font-mono text-xs text-text-lo" style={{ letterSpacing: 1.5 }}>
            PHASE 2 · RESULTS
          </span>
          <h1 className="text-text-hi font-sans font-semibold" style={{ fontSize: 24 }}>
            結果レポート
          </h1>
          <div className="flex items-center" style={{ gap: 9 }}>
            <span className="text-text-mid font-sans" style={{ fontSize: 13 }}>{abTest.title}</span>
            <span className="text-text-lo font-mono text-xs">·</span>
            <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 0.3 }}>{summary.totalPersonas} ペルソナ</span>
            <span className="text-text-lo font-mono text-xs">·</span>
            <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 0.3 }}>
              {new Date(abTest.createdAt).toLocaleDateString('ja-JP')} 実行
            </span>
          </div>
        </div>
        <div className="flex items-center" style={{ gap: 10 }}>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center bg-surface border border-hairline text-text-mid font-sans font-medium transition-colors hover:text-text-hi"
            style={{ gap: 8, borderRadius: 10, padding: '10px 15px', fontSize: 13 }}
          >
            <Download size={15} />
            書き出し
          </button>
          <button
            type="button"
            disabled={isRerunning}
            onClick={handleRerun}
            className="flex items-center bg-surface border border-hairline text-text-mid font-sans font-medium transition-colors hover:text-text-hi disabled:opacity-40"
            style={{ gap: 8, borderRadius: 10, padding: '10px 15px', fontSize: 13 }}
          >
            <RefreshCw size={15} />
            再実行
          </button>
        </div>
      </div>

      {/* 総合結果 card */}
      <div
        className="flex flex-col bg-base border border-hairline"
        style={{ gap: 16, borderRadius: 14, padding: 20 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-col" style={{ gap: 10 }}>
            <div className="flex items-baseline gap-3">
              <span className="text-text-hi font-sans text-xl font-bold">{winnerLabel}</span>
              <div className="flex items-center gap-1.5">
                <MethodPopover />
                <SourcePopover />
              </div>
            </div>
            <p className="text-text-mid font-sans text-sm">
              {summary.completedPersonas}/{summary.totalPersonas}人が評価完了
            </p>
          </div>
        </div>
        <SegmentBar countA={supportCountA} countB={supportCountB} countNone={countNone} />

        {summary.winnersReasonSummary && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-md bg-accent-dim">
            <Lightbulb size={18} className="text-accent flex-shrink-0 mt-0.5" />
            <p className="text-text-hi font-sans text-sm">主な理由: {summary.winnersReasonSummary}</p>
          </div>
        )}
      </div>

      <div className="h-px bg-hairline" />

      {/* 比較したデザイン */}
      <div className="flex flex-col" style={{ gap: 14 }}>
        <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 1.2 }}>比較したデザイン</span>
        <div className="flex min-w-0" style={{ gap: 32 }}>
          <DesignCard side="A" input={abTest.designAInput} isWinner={summary.winner === 'A'} supportCount={supportCountA} totalCount={summary.totalPersonas} />
          <DesignCard side="B" input={abTest.designBInput} isWinner={summary.winner === 'B'} supportCount={supportCountB} totalCount={summary.totalPersonas} />
        </div>
      </div>

      {/* 分析: 2カラム (理由 | レーダー) */}
      <div className="flex" style={{ gap: 24 }}>
        {/* 評価のまとめ */}
        <div
          className="flex flex-col flex-1"
          style={{ gap: 12, paddingRight: 24, borderRight: '1px solid var(--color-hairline)' }}
        >
          <div className="flex items-center" style={{ gap: 8 }}>
            <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 1.2 }}>評価のまとめ</span>
            <HelpDot content={`生成元: ${modelId || '—'}。各ペルソナの評価理由をAIが要約した結果です。`} />
          </div>
          {summary.reasonSummaryA.length === 0 && summary.reasonSummaryB.length === 0 ? (
            <p className="text-text-lo font-sans text-sm">—</p>
          ) : (
            <div className="flex flex-col" style={{ gap: 12, paddingTop: 36 }}>
              <ReasonGroup caption="A が支持された理由" color="var(--color-win-a, #6E78D9)" reasons={summary.reasonSummaryA} />
              <ReasonGroup caption="B が評価された点" color="var(--color-win-b, #C9974F)" reasons={summary.reasonSummaryB} />
            </div>
          )}
        </div>

        {/* 評価軸別の比較 */}
        <div
          className="flex flex-col flex-1"
          style={{ gap: 12, paddingLeft: 24 }}
        >
          <div className="flex items-center" style={{ gap: 8 }}>
            <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 1.2 }}>評価軸別の比較</span>
            <HelpDot content={`生成元: ${modelId || '—'}。5軸の平均スコアをレーダーチャートで比較。各ペルソナが1〜5で採点した全ペルソナ平均。最大5固定・正規化なし。支持率は多数決で別算出。`} />
          </div>
          <div className="flex items-center" style={{ gap: 20 }}>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-win-a" />
              <span className="text-text-mid font-mono text-xs">A案</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-win-b" />
              <span className="text-text-mid font-mono text-xs">B案</span>
            </span>
          </div>
          <div className="flex flex-col items-center" style={{ gap: 16 }}>
            <RadarChart scoresA={summary.avgScores.A} scoresB={summary.avgScores.B} />
          </div>
          <div className="flex flex-col" style={{ gap: 10, paddingTop: 8 }}>
            {(Object.keys(SCORE_LABELS) as (keyof EvaluationScores)[]).map((key) => (
              <ScoreBars key={key} label={SCORE_LABELS[key]} scoreA={summary.avgScores.A[key]} scoreB={summary.avgScores.B[key]} />
            ))}
          </div>
        </div>
      </div>

      {/* Attribute Heatmap */}
      {personas.length > 0 && evaluations.length > 0 && (
        <AttributeHeatmap evaluations={evaluations} personas={personas} groupBy="type" />
      )}

      {/* ペルソナ別の評価 */}
      <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 1.2 }}>ペルソナ別の評価</span>
      <div className="bg-base border border-hairline overflow-hidden" style={{ borderRadius: 14 }}>
        <div className="flex items-center px-4 border-b border-hairline bg-base" style={{ gap: 16, padding: '12px 16px' }}>
          <div style={{ width: 220 }}>
            <span className="text-text-lo font-mono" style={{ fontSize: 10, letterSpacing: 0.8 }}>PERSONA</span>
          </div>
          <div style={{ width: 72 }}>
            <span className="text-text-lo font-mono" style={{ fontSize: 10, letterSpacing: 0.8 }}>勝者</span>
          </div>
          <div style={{ width: 64 }}>
            <span className="text-text-lo font-mono" style={{ fontSize: 10, letterSpacing: 0.8 }}>確信度</span>
          </div>
          <div className="flex-1">
            <span className="text-text-lo font-mono" style={{ fontSize: 10, letterSpacing: 0.8 }}>コメント</span>
          </div>
        </div>
        {evaluations.map((ev, i) => {
          const isExpanded = expandedId === ev.personaId;
          const dotColor = getNodeColor(ev.personaId);
          const matchedPersona = personas.find((p) => p.personaId === ev.personaId);
          return (
            <div key={ev.personaId}>
              {i > 0 && <div className="h-px bg-hairline" />}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : ev.personaId)}
                className="group flex items-center w-full text-left transition-colors hover:bg-raised"
                style={{ gap: 16, padding: '16px 16px' }}
                aria-expanded={isExpanded}
              >
                <div className="relative flex items-center" style={{ width: 220, gap: 11 }}>
                  <span className="inline-block flex-shrink-0 rounded-full" style={{ width: 11, height: 11, background: dotColor }} />
                  <div className="flex flex-col" style={{ gap: 2 }}>
                    <span
                      role="button"
                      tabIndex={0}
                      data-testid={`persona-name-${ev.personaId}`}
                      className="text-text-hi font-sans text-sm font-medium hover:text-accent transition-colors cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); setAttrPopoverId(attrPopoverId === ev.personaId ? null : ev.personaId); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setAttrPopoverId(attrPopoverId === ev.personaId ? null : ev.personaId); } }}
                    >
                      {ev.personaDisplayName}
                    </span>
                    {ev.status === 'failed' && <span className="text-xs text-danger">失敗</span>}
                  </div>
                  {attrPopoverId === ev.personaId && matchedPersona && (
                    <AttributePopoverInline persona={matchedPersona} onClose={() => setAttrPopoverId(null)} />
                  )}
                </div>
                <div style={{ width: 72 }}>
                  {ev.status !== 'failed' && (
                    <span
                      className="inline-flex items-center justify-center text-xs font-bold"
                      style={{
                        borderRadius: 999,
                        padding: '4px 11px',
                        background: ev.winner === 'A' ? '#6E78D922' : ev.winner === 'B' ? '#C9974F22' : 'var(--color-raised)',
                        color: ev.winner === 'A' ? 'var(--color-win-a)' : ev.winner === 'B' ? 'var(--color-win-b)' : 'var(--color-text-lo)',
                      }}
                    >
                      {ev.winner === 'none' ? '—' : `${ev.winner}案`}
                    </span>
                  )}
                </div>
                <div style={{ width: 64 }}>
                  {ev.status !== 'failed' && (
                    <span className="text-text-mid font-mono text-xs">{ev.confidence}%</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-text-mid font-sans text-sm"
                    style={{
                      lineHeight: 1.5,
                      ...(isExpanded ? {} : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }),
                    }}
                  >
                    {ev.reason || '—'}
                  </p>
                </div>
                <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ width: 32, ...(isExpanded ? { opacity: 1 } : {}) }}>
                  <ChevronDown size={16} className="text-text-lo" style={{ transition: 'transform 0.15s', transform: isExpanded ? 'rotate(180deg)' : 'none' }} />
                </div>
              </button>
              {isExpanded && (
                <div className="flex flex-col gap-4 bg-raised" style={{ padding: '4px 16px 20px 277px' }}>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 0.5 }}>使用モデル</span>
                    <p className="text-text-mid font-mono text-xs">{modelId || '—'}</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 0.5 }}>解決済みプロンプト</span>
                    <p className="text-text-mid font-sans text-xs" style={{ lineHeight: 1.5 }}>
                      ペルソナ「{ev.personaDisplayName}」として、デザイン A と B を比較し、5軸で評価してください。
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 0.5 }}>コメント全文</span>
                    <p className="text-text-hi font-sans text-sm whitespace-pre-wrap" style={{ lineHeight: 1.5 }}>{ev.reason || '—'}</p>
                  </div>
                  {ev.status !== 'failed' && ev.scoresA && ev.scoresB && (
                    <div className="flex flex-col gap-3.5">
                      <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 0.5 }}>評価軸別スコア</span>
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

      <p className="text-text-lo font-sans text-xs">
        ペルソナ名クリックで属性、行クリックで使用モデル・プロンプト・各軸スコアを表示。見出しの ? で生成元を確認できます。
      </p>
    </div>
  );
}
