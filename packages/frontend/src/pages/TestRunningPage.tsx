import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProgress } from '../api/tests';
import type { ProgressResponse } from '../types';

export function TestRunningPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<ProgressResponse | null>(null);

  useEffect(() => {
    if (!id) return;

    let active = true;

    async function poll() {
      try {
        const data = await getProgress(id!);
        if (!active) return;
        setProgress(data);
        if (data.status === 'completed' || data.status === 'failed') {
          navigate(`/tests/${id}/report`);
          return;
        }
      } catch {
        // ポーリング失敗は無視して継続
      }
      if (active) {
        setTimeout(poll, 3000);
      }
    }

    poll();
    return () => { active = false; };
  }, [id, navigate]);

  const pct = progress && progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <div className="max-w-lg mx-auto p-8 text-center">
      <h1 className="text-2xl font-bold mb-2">評価実行中</h1>
      <p className="text-gray-500 mb-8">AIがペルソナ視点でデザインを評価しています...</p>

      {progress ? (
        <div className="space-y-4">
          <p className="text-lg font-semibold text-gray-800">
            {progress.completed} / {progress.total}
          </p>

          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full h-4 rounded-full bg-gray-200 overflow-hidden"
          >
            <div
              className="h-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>

          <p className="text-sm text-gray-500">{pct}%</p>

          {progress.failed > 0 && (
            <p className="text-sm text-red-500">失敗: {progress.failed}件</p>
          )}
        </div>
      ) : (
        <div className="flex justify-center">
          <div role="status" className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      )}
    </div>
  );
}
