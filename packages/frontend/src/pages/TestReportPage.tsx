import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getReport, executeTest, exportTest } from '../api/tests';
import type { ReportResponse, EvaluationScores } from '../types';

const SCORE_LABELS: Record<keyof EvaluationScores, string> = {
  usability: '使いやすさ',
  aesthetics: '見た目',
  clarity: '明確さ',
  engagement: '訴求力',
};

function DonutChart({ rateA, rateB }: { rateA: number; rateB: number }) {
  const size = 120;
  const r = 44;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dashA = circumference * rateA;
  const dashB = circumference * rateB;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={16} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#6366f1"
        strokeWidth={16}
        strokeDasharray={`${dashA} ${circumference}`}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#f97316"
        strokeWidth={16}
        strokeDasharray={`${dashB} ${dashA > 0 ? circumference : circumference}`}
        strokeDashoffset={-dashA}
      />
    </svg>
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
      <div className="flex items-center justify-center min-h-screen">
        <div role="status" className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  const { abTest, summary, evaluations } = report;
  const pctA = Math.round(summary.supportRateA * 100);
  const pctB = Math.round(summary.supportRateB * 100);
  const winnerLabel = summary.winner === 'tie' ? '引き分け' : `デザイン${summary.winner} 勝利`;

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{abTest.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date(abTest.createdAt).toLocaleDateString('ja-JP')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            CSVエクスポート
          </button>
          <button
            type="button"
            disabled={isRerunning}
            onClick={handleRerun}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            再実行
          </button>
        </div>
      </div>

      {/* 勝者バッジ */}
      <div className="mb-8 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 p-6 text-center">
        <p className="text-3xl font-bold text-indigo-700">{winnerLabel}</p>
        <p className="text-sm text-gray-500 mt-1">
          {summary.completedPersonas}/{summary.totalPersonas} ペルソナが評価完了
        </p>
      </div>

      {/* 支持率セクション */}
      <div className="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-12">
        <div className="flex flex-col items-center gap-2">
          <DonutChart rateA={summary.supportRateA} rateB={summary.supportRateB} />
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-indigo-500" />
              A: {pctA}%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-orange-400" />
              B: {pctB}%
            </span>
          </div>
        </div>

        {/* 評価軸スコア比較 */}
        <div className="w-full max-w-xs">
          <p className="text-sm font-semibold text-gray-700 mb-2">評価軸スコア比較（平均）</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500">
                <th className="text-left pb-1">軸</th>
                <th className="text-right pb-1 text-indigo-600">A</th>
                <th className="text-right pb-1 text-orange-500">B</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(SCORE_LABELS) as (keyof EvaluationScores)[]).map((key) => (
                <tr key={key}>
                  <td className="py-0.5 text-gray-600">{SCORE_LABELS[key]}</td>
                  <td className="py-0.5 text-right font-medium text-indigo-600">
                    {summary.avgScores.A[key].toFixed(1)}
                  </td>
                  <td className="py-0.5 text-right font-medium text-orange-500">
                    {summary.avgScores.B[key].toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ペルソナ別テーブル */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">ペルソナ別評価</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="pb-2 pr-4">ペルソナ</th>
                <th className="pb-2 pr-4">勝者</th>
                <th className="pb-2 pr-4">確信度</th>
                <th className="pb-2 pr-4">理由</th>
                <th className="pb-2">ステータス</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map((ev) => (
                <tr key={ev.personaId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 pr-4 font-medium text-gray-900">{ev.personaDisplayName}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        ev.winner === 'A'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {ev.winner}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-gray-600">{ev.confidence}%</td>
                  <td className="py-2 pr-4 text-gray-600 max-w-xs truncate">{ev.reason}</td>
                  <td className="py-2">
                    {ev.status === 'failed' ? (
                      <span className="text-red-500">失敗</span>
                    ) : (
                      <span className="text-green-600">完了</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
