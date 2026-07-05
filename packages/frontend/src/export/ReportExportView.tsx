import { useState } from 'react';
import { Check, Lightbulb, ChevronDown } from 'lucide-react';
import { RadarChart } from '@/features/report/RadarChart';
import { AttributeHeatmap } from '@/features/report/AttributeHeatmap';
import { PersonaNode } from '@/features/persona/PersonaNode';
import { ImageLightbox } from '@/shared/ui/ImageLightbox';
import { ImprovementDrawer } from '@/features/report/ImprovementDrawer';
import { buildPromptContext } from '@/features/report/prompt-context';
import { PERSONA_TYPE_LABELS } from '@/features/persona/types';
import { SegmentBar } from '@/features/report/components/SegmentBar';
import { ScoreBars } from '@/features/report/components/ScoreBars';
import { DesignCard } from '@/features/report/components/DesignCard';
import { SCORE_LABELS } from '@/features/report/components/score-labels';
import type { ExportPayload } from './types';
import type { EvaluationScores } from '@/features/report/types';
import type { Persona } from '@/features/persona/types';

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

function AttributePopoverInline({ persona }: { persona: Persona }) {
  return (
    <div
      data-testid="attribute-popover"
      className="absolute z-50 rounded-md bg-raised border border-hairline"
      style={{ top: '100%', left: 0, marginTop: 4, padding: '10px 14px', minWidth: 180, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
      onClick={(e) => e.stopPropagation()}
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

export function ReportExportView({ data }: { data: ExportPayload }) {
  const { report, personas, modelId, imageA, imageB, exportedAt } = data;
  const { abTest, summary, evaluations } = report;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [attrPopoverId, setAttrPopoverId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const winnerSide = summary.winner;
  const winnerDesignLabel = winnerSide === 'A' || winnerSide === 'B' ? `デザイン ${winnerSide}` : null;
  const supportCountA = Math.round(summary.supportRateA * summary.totalPersonas);
  const supportCountB = Math.round(summary.supportRateB * summary.totalPersonas);
  const countNone = summary.totalPersonas - supportCountA - supportCountB;

  return (
    <div className="flex flex-col" style={{ width: '100%', maxWidth: 864, margin: '0 auto', padding: '48px 24px', gap: 32 }}>
      {/* Header */}
      <div className="flex flex-col" style={{ gap: 7 }}>
        <span className="font-sans font-semibold" style={{ fontSize: 15, color: '#F2F4F7' }}>
          {abTest.title || '無題のテスト'}
        </span>
        <h1 className="text-text-hi font-sans font-semibold" style={{ fontSize: 24 }}>
          結果レポート
        </h1>
        <div className="flex items-center" style={{ gap: 9 }}>
          <span className="text-text-lo font-mono text-xs">·</span>
          <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 0.3 }}>{summary.totalPersonas} ペルソナ</span>
          <span className="text-text-lo font-mono text-xs">·</span>
          <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 0.3 }}>
            {new Date(abTest.createdAt).toLocaleDateString('ja-JP')} 実行
          </span>
        </div>
      </div>

      {/* 総合結果 */}
      <div
        className="flex flex-col bg-base border border-hairline"
        style={{ gap: 16, borderRadius: 14, padding: 20 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-col" style={{ gap: 10 }}>
            <span className="font-mono text-xs text-text-lo" style={{ letterSpacing: 1.2 }}>総合結果</span>
            <div className="flex items-baseline gap-3">
              {winnerDesignLabel ? (
                <span className="font-sans" style={{ fontSize: 24 }}>
                  <span style={{ fontWeight: 700, color: winnerSide === 'A' ? 'var(--color-win-a)' : 'var(--color-win-b)' }}>{winnerDesignLabel}</span>
                  <span className="text-text-hi" style={{ fontWeight: 600 }}> の勝ち</span>
                </span>
              ) : (
                <span className="text-text-hi font-sans" style={{ fontSize: 24, fontWeight: 600 }}>引き分け</span>
              )}
            </div>
            <p className="text-text-mid font-sans text-sm">
              {summary.totalPersonas}人中{winnerSide === 'A' ? supportCountA : winnerSide === 'B' ? supportCountB : supportCountA}人が {winnerDesignLabel ?? 'A/B同数'} を支持
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
        {(summary.improvementReport?.suggestions.length ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center justify-between px-4 py-2.5 rounded-md bg-accent-dim transition-opacity hover:opacity-85"
            style={{ border: 'none', cursor: 'pointer', width: '100%' }}
          >
            <span className="flex items-center gap-2.5">
              <Lightbulb size={15} className="text-accent flex-shrink-0" />
              <span className="text-text-hi font-sans text-sm">
                改善提案が {summary.improvementReport!.suggestions.length} 件あります
                （A案 {summary.improvementReport!.suggestions.filter((s) => s.target === 'A').length} · B案 {summary.improvementReport!.suggestions.filter((s) => s.target === 'B').length}）
              </span>
            </span>
            <span className="text-accent font-sans text-sm font-semibold">見る ›</span>
          </button>
        )}
      </div>

      {drawerOpen && summary.improvementReport && (
        <ImprovementDrawer
          report={summary.improvementReport}
          contextHeader={buildPromptContext(report, personas)}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      <div className="h-px bg-hairline" />

      {/* 比較したデザイン */}
      <div className="flex flex-col" style={{ gap: 14 }}>
        <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 1.2 }}>比較したデザイン</span>
        <div className="flex min-w-0" style={{ gap: 32 }}>
          <DesignCard side="A" input={abTest.designAInput} isWinner={summary.winner === 'A'} supportCount={supportCountA} totalCount={summary.totalPersonas} imageSrc={imageA} onZoom={(src, alt) => setLightbox({ src, alt })} />
          <DesignCard side="B" input={abTest.designBInput} isWinner={summary.winner === 'B'} supportCount={supportCountB} totalCount={summary.totalPersonas} imageSrc={imageB} onZoom={(src, alt) => setLightbox({ src, alt })} />
        </div>
      </div>

      {/* 分析: 2カラム */}
      <div className="flex" style={{ gap: 24 }}>
        <div className="flex flex-col flex-1" style={{ gap: 12, paddingRight: 24 }}>
          <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 1.2 }}>評価のまとめ</span>
          {summary.reasonSummaryA.length === 0 && summary.reasonSummaryB.length === 0 ? (
            <div className="flex flex-col" style={{ gap: 12, paddingTop: 36 }}>
              <p className="text-text-mid font-sans text-sm" style={{ lineHeight: 1.6 }}>
                {winnerSide === 'tie' || !winnerSide
                  ? '両デザインの評価が拮抗しています。各ペルソナのコメントと評価軸別スコアを確認してください。'
                  : '評価理由のまとめはまだ生成されていません。'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: 12, paddingTop: 36 }}>
              <ReasonGroup caption="A が支持された理由" color="var(--color-win-a, #6E78D9)" reasons={summary.reasonSummaryA} />
              <ReasonGroup caption="B が評価された点" color="var(--color-win-b, #C9974F)" reasons={summary.reasonSummaryB} />
            </div>
          )}
        </div>

        <div className="flex flex-col flex-1" style={{ gap: 12, paddingLeft: 24 }}>
          <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 1.2 }}>評価軸別の比較</span>
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
        </div>
      </div>

      {/* Attribute Heatmap */}
      {personas.length > 0 && evaluations.length > 0 && (
        <AttributeHeatmap evaluations={evaluations} personas={personas} />
      )}

      {/* ペルソナ別の評価 */}
      <div className="flex flex-col" style={{ gap: 32 }}>
        <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 1.2 }}>ペルソナ別の評価</span>
        <div className="bg-base border border-hairline overflow-hidden" style={{ borderRadius: 14 }}>
          <div className="flex items-center px-4 border-b border-hairline bg-base" style={{ gap: 16, padding: '12px 16px' }}>
            <div style={{ width: 250 }}>
              <span className="text-text-lo font-mono" style={{ fontSize: 10, letterSpacing: 0.8 }}>PERSONA</span>
            </div>
            <div style={{ width: 96 }}>
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
                  <div className="relative flex items-center" style={{ width: 250, gap: 11 }}>
                    <PersonaNode seed={ev.personaId} size={20} />
                    <div className="flex flex-col" style={{ gap: 2 }}>
                      <span
                        role="button"
                        tabIndex={0}
                        className="text-text-hi font-sans text-sm font-medium hover:text-accent transition-colors cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setAttrPopoverId(attrPopoverId === ev.personaId ? null : ev.personaId); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setAttrPopoverId(attrPopoverId === ev.personaId ? null : ev.personaId); } }}
                      >
                        {ev.personaDisplayName}
                      </span>
                      {ev.status === 'failed' && <span className="text-xs text-danger">失敗</span>}
                    </div>
                    {attrPopoverId === ev.personaId && matchedPersona && (
                      <AttributePopoverInline persona={matchedPersona} />
                    )}
                  </div>
                  <div style={{ width: 96 }}>
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
                  <div className="flex flex-col gap-4 bg-raised" style={{ padding: '4px 16px 20px 307px' }}>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 0.5 }}>使用モデル</span>
                      <p className="text-text-mid font-mono text-xs">{ev.modelId ?? modelId ?? '—'}</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 0.5 }}>解決済みプロンプト</span>
                      <p className="text-text-mid font-sans text-xs whitespace-pre-wrap" style={{ lineHeight: 1.5 }}>
                        {ev.resolvedPrompt ?? [
                          `ペルソナ「${ev.personaDisplayName}」として、デザイン A と B を比較し、5軸で評価してください。`,
                          abTest.focusPoints ? `\n注目ポイント:\n${abTest.focusPoints}` : null,
                        ].filter(Boolean).join('')}
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
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid var(--color-hairline)' }}>
        <span className="text-text-lo font-sans text-xs">
          Splisona — AI Persona Review · エクスポート日時: {new Date(exportedAt).toLocaleString('ja-JP')}
        </span>
      </div>

      {lightbox && (
        <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
