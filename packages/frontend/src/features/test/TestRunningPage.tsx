import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Square, ArrowRight, Check } from 'lucide-react';
import { getProgress, getTest, getReport, abortTest } from './api';
import { usePersonas } from '@/features/persona/usePersonas';
import { PersonaNode } from '@/features/persona/PersonaNode';
import { getAvatarUrl } from '@/features/persona/api';
import { PERSONA_TYPE_LABELS } from '@/features/persona/types';
import type { ProgressResponse, ABTest } from './types';
import type { EvaluationResult } from '@/features/report/types';

interface LogEntry {
  ts: string;
  msg: string;
  color: 'lo' | 'mid' | 'hi';
}

export function TestRunningPage() {
  const { id } = useParams<{ id: string }>();
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [test, setTest] = useState<ABTest | null>(null);
  const [results, setResults] = useState<Record<string, EvaluationResult>>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [startTime] = useState(() => Date.now());
  const { personas } = usePersonas();
  const consoleRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const userScrollTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function elapsed() {
    const s = Math.floor((Date.now() - startTime) / 1000);
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${m}:${ss}`;
  }

  function addLog(msg: string, color: LogEntry['color'] = 'lo', host = 'system@splisona') {
    setLogs((prev) => [...prev, { ts: elapsed(), msg: `${host}:~$ ${msg}`, color }]);
  }

  useEffect(() => {
    if (!id) return;
    getTest(id).then(setTest).catch(() => {});
  }, [id]);

  const [isDone, setIsDone] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const isClosingRef = useRef(false);
  const prevResultsRef = useRef<Record<string, EvaluationResult>>({});
  const hasLoggedStartRef = useRef(false);
  const hasLoggedSummaryRef = useRef(false);

  useEffect(() => {
    if (!id || !test) return;
    let active = true;

    if (!hasLoggedStartRef.current && personas.length > 0) {
      hasLoggedStartRef.current = true;
      const personaCount = test.personaIds?.length ?? 0;
      const sid = Math.random().toString(36).slice(2, 10);
      addLog(`セッション開始 sid=${sid}`);
      addLog('デザインA 画像ロード完了');
      addLog('デザインB 画像ロード完了');
      addLog(`ペルソナプロファイル ${personaCount}件 読み込み完了`);
      addLog('評価パイプライン初期化');
      addLog(`テスト開始 · ${personaCount}体を並行評価`);
    }

    async function poll() {
      try {
        const data = await getProgress(id!);
        if (!active) return;
        setProgress(data);

        try {
          const report = await getReport(id!);
          if (!active) return;
          const map: Record<string, EvaluationResult> = {};
          for (const ev of report.evaluations) {
            const prev = prevResultsRef.current[ev.personaId];
            const host = `${ev.personaDisplayName}@eval`;
            if (ev.status === 'evaluating' && !prev) {
              const p = personas.find((x) => x.personaId === ev.personaId);
              const typeLabel = p ? PERSONA_TYPE_LABELS[p.type] : '';
              addLog(`プロファイルロード完了`, 'lo', host);
              addLog(`評価中…${typeLabel ? ` (${typeLabel})` : ''}`, 'lo', host);
              addLog(`デザイン比較分析中…`, 'lo', host);
            }
            if (ev.status === 'completed' || ev.status === 'failed') {
              if (!prev || prev.status === 'evaluating') {
                if (ev.status === 'completed') {
                  const winner = ev.winner === 'A' ? 'A案' : ev.winner === 'B' ? 'B案' : '引分';
                  const fmt = (s: typeof ev.scoresA) => `[${s.usability}, ${s.aesthetics}, ${s.clarity}, ${s.engagement}, ${s.trust}]`;
                  addLog('応答受信', 'lo', host);
                  addLog('スコアリング完了', 'lo', host);
                  addLog(`scores A=${fmt(ev.scoresA)}`, 'lo', host);
                  addLog(`scores B=${fmt(ev.scoresB)}`, 'lo', host);
                  addLog(`→ ${winner}を支持 (確信度 ${ev.confidence}%)`, 'lo', host);
                  const reasonSnippet = ev.reason.length > 40 ? ev.reason.slice(0, 40) + '…' : ev.reason;
                  addLog(`reason: "${reasonSnippet}"`, 'lo', host);
                } else {
                  addLog('エラー: 評価失敗', 'lo', host);
                }
              }
            }
            map[ev.personaId] = ev;
          }
          prevResultsRef.current = map;
          setResults(map);
        } catch {
          // ignore
        }

        const allDone = data.total > 0 && (data.completed + data.failed) >= data.total;
        if (allDone && data.status === 'running' && !hasLoggedSummaryRef.current) {
          hasLoggedSummaryRef.current = true;
          const evals = Object.values(prevResultsRef.current).filter((e) => e.status === 'completed');
          const aCount = evals.filter((e) => e.winner === 'A').length;
          const bCount = evals.filter((e) => e.winner === 'B').length;
          const nCount = evals.filter((e) => e.winner === 'none').length;
          addLog('全ペルソナ完了 · 集計中…');
          addLog(`A案支持: ${aCount} / B案支持: ${bCount} / 引分: ${nCount}`);
          addLog('AI 要約リクエスト送信中…');
          addLog('レポート生成中…');
        }

        if (data.status === 'completed' || data.status === 'failed') {
          if (isClosingRef.current && data.status === 'failed') {
            // Backend is generating summaries — keep polling
          } else {
            setIsDone(true);
            if (data.status === 'completed') {
              addLog('要約生成完了');
              addLog('レポート書き込み完了');
              addLog(`exit 0`);
            } else {
              addLog('中止済み');
              addLog(`exit 1`);
            }
            return;
          }
        }
      } catch {
        // ignore
      }
      if (active) setTimeout(poll, 2000);
    }

    poll();
    return () => { active = false; };
  }, [id, test, personas]);

  useEffect(() => {
    const el = consoleRef.current;
    if (el && !isUserScrolling) el.scrollTop = el.scrollHeight;
  }, [logs, isUserScrolling]);

  const total = progress?.total ?? 0;
  const completed = progress?.completed ?? 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const personaIds = test?.personaIds ?? [];
  const relevantPersonas = personaIds
    .map((pid) => personas.find((p) => p.personaId === pid))
    .filter(Boolean) as typeof personas;

  const isFailed = progress?.status === 'failed' && !isClosing;
  const statusColor = isDone ? (isFailed ? 'var(--color-danger)' : 'var(--color-success)') : 'var(--color-accent)';
  const statusGlow = isDone ? (isFailed ? '#E06A6AAA' : '#54B587AA') : '#6E78D9AA';

  return (
    <div className="flex flex-col" style={{ width: '100%', maxWidth: 864, margin: '0 auto', padding: '48px 24px', gap: 32, height: '100%' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col" style={{ gap: 7 }}>
          <div className="flex items-center" style={{ gap: 8 }}>
            <span
              className="inline-block rounded-full"
              style={{
                width: 7, height: 7,
                background: statusColor,
                boxShadow: `0 0 8px ${statusGlow}`,
                animation: isDone ? 'none' : 'pulse 1.5s infinite',
              }}
            />
            <span className="font-mono text-xs" style={{ color: statusColor, letterSpacing: 1.5 }}>
              {isDone ? (isFailed ? 'ABORTED' : 'COMPLETED') : 'RUNNING'}
            </span>
          </div>
          <h1 className="text-text-hi font-sans font-semibold" style={{ fontSize: 24 }}>
            {isDone ? (isFailed ? '中止済み' : '評価完了') : '実行中'}
          </h1>
          <div className="flex items-center" style={{ gap: 9 }}>
            <span className="text-text-mid font-sans" style={{ fontSize: 13 }}>{test?.title ?? ''}</span>
            <span className="text-text-lo font-mono text-xs">·</span>
            <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 0.3 }}>
              {isDone ? '所要' : '経過'} {elapsed()}
            </span>
          </div>
        </div>
        {isDone ? (
          <Link
            to={`/tests/${id}/report`}
            className="flex items-center border border-hairline text-text-hi font-sans transition-colors hover:bg-raised"
            style={{ gap: 8, borderRadius: 6, padding: '12px 16px', fontSize: 14, fontWeight: 600 }}
          >
            <ArrowRight size={14} className="text-text-hi" />
            結果を見る
          </Link>
        ) : (
          <button
            type="button"
            disabled={isClosing}
            onClick={async () => {
              if (!id) return;
              setIsClosing(true);
              isClosingRef.current = true;
              try {
                await abortTest(id);
                addLog('ここまでの結果で集計します…');
              } catch {
                addLog('締めに失敗しました');
                setIsClosing(false);
                isClosingRef.current = false;
              }
            }}
            className="flex items-center bg-surface border border-hairline text-text-mid font-sans font-medium transition-colors hover:text-text-hi disabled:opacity-40"
            style={{ gap: 8, borderRadius: 10, padding: '10px 15px', fontSize: 13 }}
          >
            <Square size={14} className="text-text-lo" />
            {isClosing ? '集計中…' : 'ここで締める'}
          </button>
        )}
      </div>

      {/* Progress */}
      <div className="flex flex-col" style={{ gap: 14 }}>
        <div className="flex items-end justify-between">
          <div className="flex items-end" style={{ gap: 6 }}>
            <span className="text-text-hi font-mono font-semibold" style={{ fontSize: 40, lineHeight: 1 }}>{completed}</span>
            <span className="text-text-lo font-mono" style={{ fontSize: 24, lineHeight: 1 }}>/ {total} 体 完了</span>
          </div>
          <span className="font-mono font-semibold" style={{ fontSize: 18, color: statusColor }}>{pct}%</span>
        </div>
        <div className="overflow-hidden" style={{ height: 6, borderRadius: 999, background: 'var(--color-raised)' }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${pct}%`, borderRadius: 999, background: statusColor }}
          />
        </div>
      </div>

      {/* Columns */}
      <div className="flex flex-1 min-h-0" style={{ gap: 48 }}>
        {/* ロースター */}
        <div className="flex flex-col" style={{ width: 480, gap: 16 }}>
          <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 1.2 }}>ロースター</span>
          <div className="flex flex-col">
            {relevantPersonas.map((persona, i) => {
              const result = results[persona.personaId];
              const isCompleted = result?.status === 'completed';
              const isFailed = result?.status === 'failed';
              const isRunning = result?.status === 'evaluating' || (!result && !isDone);

              return (
                <div key={persona.personaId}>
                  {i > 0 && <div className="h-px bg-hairline" />}
                  <div className="flex items-center justify-between" style={{ padding: '12px 0', gap: 12 }}>
                    <div className="flex items-center" style={{ gap: 12 }}>
                      <PersonaNode seed={persona.personaId} size={20} avatarUrl={persona.avatarImageKey ? getAvatarUrl(persona.avatarImageKey) : undefined} />
                      <div className="flex flex-col" style={{ gap: 2 }}>
                        <span className="text-text-hi font-sans text-sm font-medium">{persona.displayName}</span>
                        <span className="text-text-lo font-mono text-xs">{PERSONA_TYPE_LABELS[persona.type]}</span>
                      </div>
                    </div>
                    <div className="flex items-center" style={{ gap: 6 }}>
                      {isCompleted && (
                        <span className="flex items-center" style={{ gap: 6 }}>
                          <Check size={14} className="text-accent" />
                          <span className="font-mono" style={{ fontSize: 11, fontWeight: 700, color: result.winner === 'A' ? 'var(--color-win-a)' : result.winner === 'B' ? 'var(--color-win-b)' : 'var(--color-text-lo)' }}>
                            {result.winner === 'none' ? '引分' : `${result.winner}案`}
                          </span>
                        </span>
                      )}
                      {isFailed && (
                        <span className="text-danger font-mono text-xs">失敗</span>
                      )}
                      {isRunning && (
                        <span className="flex items-center" style={{ gap: 6 }}>
                          <span
                            className="inline-block rounded-full"
                            style={{
                              width: 7, height: 7,
                              background: 'var(--color-accent)',
                              boxShadow: '0 0 6px var(--color-accent)',
                              animation: 'pulse 1.5s infinite',
                            }}
                          />
                          <span className="text-accent font-mono text-xs">評価中…</span>
                        </span>
                      )}
                      {!result && !isRunning && (
                        <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 0.5 }}>待機</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ライブログ */}
        <div className="flex flex-col flex-1 min-w-0" style={{ gap: 16 }}>
          <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 1.2 }}>ライブログ</span>
          <div
            ref={consoleRef}
            className={`flex flex-col flex-1 min-h-0 bg-surface border border-hairline ${isUserScrolling ? 'overflow-y-auto' : 'overflow-y-hidden'}`}
            style={{ gap: 7, padding: '16px 20px', borderRadius: 8 }}
            onWheel={() => {
              setIsUserScrolling(true);
              clearTimeout(userScrollTimer.current);
              userScrollTimer.current = setTimeout(() => setIsUserScrolling(false), 3000);
            }}
          >
            {logs.map((entry, i) => (
              <div key={i} className="flex" style={{ gap: 12 }}>
                <span className="text-text-lo font-mono flex-shrink-0" style={{ fontSize: 13 }}>[{entry.ts}]</span>
                <span
                  className="font-mono"
                  style={{
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: entry.color === 'hi' ? 'var(--color-text-hi)'
                      : entry.color === 'lo' ? 'var(--color-text-lo)'
                      : 'var(--color-text-mid)',
                  }}
                >
                  {entry.msg}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
