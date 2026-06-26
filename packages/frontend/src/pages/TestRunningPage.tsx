import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Square, ArrowRight } from 'lucide-react';
import { getProgress, getTest, getReport, abortTest } from '../api/tests';
import { usePersonas } from '../hooks/usePersonas';
import { getNodeColor } from '../components/persona/PersonaNode';
import { PERSONA_TYPE_LABELS } from '../types';
import type { ProgressResponse, ABTest, EvaluationResult } from '../types';

interface LogEntry {
  ts: string;
  msg: string;
  level: 'lo' | 'mid' | 'hi' | 'accent';
}

export function TestRunningPage() {
  const { id } = useParams<{ id: string }>();
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [test, setTest] = useState<ABTest | null>(null);
  const [results, setResults] = useState<Record<string, EvaluationResult>>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [startTime] = useState(() => Date.now());
  const { personas } = usePersonas();
  const logsEndRef = useRef<HTMLDivElement>(null);

  function elapsed() {
    const s = Math.floor((Date.now() - startTime) / 1000);
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${m}:${ss}`;
  }

  function addLog(msg: string, level: LogEntry['level'] = 'mid') {
    setLogs((prev) => [...prev, { ts: elapsed(), msg, level }]);
  }

  useEffect(() => {
    if (!id) return;
    getTest(id).then(setTest).catch(() => {});
  }, [id]);

  const [isDone, setIsDone] = useState(false);
  const [isAborting, setIsAborting] = useState(false);
  const prevResultsRef = useRef<Record<string, EvaluationResult>>({});

  useEffect(() => {
    if (!id) return;
    let active = true;

    addLog('テスト開始', 'lo');

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
            if (ev.status === 'completed' || ev.status === 'failed') {
              map[ev.personaId] = ev;
              if (!prevResultsRef.current[ev.personaId]) {
                if (ev.status === 'completed') {
                  const winner = ev.winner === 'A' ? 'A案' : ev.winner === 'B' ? 'B案' : '引分';
                  addLog(`${ev.personaDisplayName} 完了 → ${winner}を支持`, 'hi');
                } else {
                  addLog(`${ev.personaDisplayName} 失敗`, 'lo');
                }
              }
            }
          }
          prevResultsRef.current = map;
          setResults(map);
        } catch {
          // ignore
        }

        if (data.status === 'completed' || data.status === 'failed') {
          setIsDone(true);
          addLog('評価完了', 'hi');
          return;
        }
      } catch {
        // ignore
      }
      if (active) setTimeout(poll, 2000);
    }

    poll();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const total = progress?.total ?? 0;
  const completed = progress?.completed ?? 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const personaIds = test?.personaIds ?? [];
  const relevantPersonas = personaIds
    .map((pid) => personas.find((p) => p.personaId === pid))
    .filter(Boolean) as typeof personas;

  const isFailed = progress?.status === 'failed';
  const statusColor = isDone ? (isFailed ? 'var(--color-danger)' : 'var(--color-success)') : 'var(--color-accent)';
  const statusGlow = isDone ? (isFailed ? '#E06A6AAA' : '#54B587AA') : '#6E78D9AA';

  return (
    <div className="flex flex-col" style={{ padding: '48px 128px', gap: 32, height: '100%' }}>
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
            className="flex items-center border border-hairline text-text-hi font-sans font-medium transition-colors hover:bg-raised"
            style={{ gap: 8, borderRadius: 6, padding: '8px 14px', fontSize: 13 }}
          >
            結果を見る
            <ArrowRight size={14} className="text-text-hi" />
          </Link>
        ) : (
          <button
            type="button"
            disabled={isAborting}
            onClick={async () => {
              if (!id) return;
              setIsAborting(true);
              try {
                await abortTest(id);
                addLog('テストを中止しました', 'lo');
                setIsDone(true);
                setProgress((prev) => prev ? { ...prev, status: 'failed' } : prev);
              } catch {
                addLog('中止に失敗しました', 'lo');
              } finally {
                setIsAborting(false);
              }
            }}
            className="flex items-center bg-surface border border-hairline text-text-mid font-sans font-medium transition-colors hover:text-text-hi disabled:opacity-40"
            style={{ gap: 8, borderRadius: 10, padding: '10px 15px', fontSize: 13 }}
          >
            <Square size={14} className="text-danger" />
            {isAborting ? '中止中...' : '中止'}
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
              const dotColor = getNodeColor(persona.personaId);
              const isCompleted = result?.status === 'completed';
              const isFailed = result?.status === 'failed';
              const isRunning = !result && i === completed;

              return (
                <div key={persona.personaId}>
                  {i > 0 && <div className="h-px bg-hairline" />}
                  <div className="flex items-center justify-between" style={{ padding: '12px 0', gap: 12 }}>
                    <div className="flex items-center" style={{ gap: 12 }}>
                      <span
                        className="inline-block flex-shrink-0 rounded-full"
                        style={{ width: 11, height: 11, background: dotColor, boxShadow: `0 0 6px ${dotColor}55` }}
                      />
                      <div className="flex flex-col" style={{ gap: 2 }}>
                        <span className="text-text-hi font-sans text-sm font-medium">{persona.displayName}</span>
                        <span className="text-text-lo font-mono text-xs">{PERSONA_TYPE_LABELS[persona.type]}</span>
                      </div>
                    </div>
                    <div className="flex items-center" style={{ gap: 6 }}>
                      {isCompleted && result.winner && result.winner !== 'none' && (
                        <span
                          className="font-mono text-xs font-semibold"
                          style={{
                            borderRadius: 999,
                            padding: '4px 11px',
                            background: result.winner === 'A' ? '#6E78D922' : '#C9974F22',
                            color: result.winner === 'A' ? 'var(--color-win-a)' : 'var(--color-win-b)',
                          }}
                        >
                          {result.winner}案
                        </span>
                      )}
                      {isCompleted && result.winner === 'none' && (
                        <span className="text-text-lo font-mono text-xs">引分</span>
                      )}
                      {isFailed && (
                        <span className="text-danger font-mono text-xs">失敗</span>
                      )}
                      {isRunning && (
                        <span className="text-accent font-mono text-xs" style={{ animation: 'pulse 1.5s infinite' }}>評価中…</span>
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
          <div className="flex flex-col overflow-y-auto" style={{ gap: 9 }}>
            {logs.map((entry, i) => (
              <div key={i} className="flex" style={{ gap: 12 }}>
                <span className="text-text-lo font-mono flex-shrink-0" style={{ fontSize: 13 }}>{entry.ts}</span>
                <span
                  className="font-mono"
                  style={{
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: entry.level === 'hi' ? 'var(--color-text-hi)'
                      : entry.level === 'accent' ? 'var(--color-accent)'
                      : entry.level === 'mid' ? 'var(--color-text-mid)'
                      : 'var(--color-text-lo)',
                  }}
                >
                  {entry.msg}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
