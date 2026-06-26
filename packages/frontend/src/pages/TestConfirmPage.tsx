import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { testDraft } from '../lib/testDraft';
import { createTest, getUploadUrl, uploadToS3, updateTest, executeTest } from '../api/tests';

export function TestConfirmPage() {
  const navigate = useNavigate();
  const draft = testDraft.get();
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExecute() {
    setIsExecuting(true);
    setError(null);
    try {
      const test = await createTest({
        title: draft.title,
        designAInput: { inputType: 'image_upload' },
        designBInput: { inputType: 'image_upload' },
        personaIds: draft.personaIds,
      });

      const [urlA, urlB] = await Promise.all([
        getUploadUrl(test.testId, { side: 'A', contentType: (draft.fileA!.type as 'image/png' | 'image/jpeg' | 'image/webp') }),
        getUploadUrl(test.testId, { side: 'B', contentType: (draft.fileB!.type as 'image/png' | 'image/jpeg' | 'image/webp') }),
      ]);

      await Promise.all([
        uploadToS3(urlA.uploadUrl, draft.fileA!),
        uploadToS3(urlB.uploadUrl, draft.fileB!),
      ]);

      await updateTest(test.testId, {
        designAInput: { inputType: 'image_upload', imageKey: urlA.imageKey },
        designBInput: { inputType: 'image_upload', imageKey: urlB.imageKey },
        personaIds: draft.personaIds,
      });

      await executeTest(test.testId);
      testDraft.reset();
      navigate(`/tests/${test.testId}/running`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'テスト実行に失敗しました');
    } finally {
      setIsExecuting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">テスト作成 — 確認</h1>

      <div className="rounded-lg border border-gray-200 bg-white p-6 mb-6 space-y-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">テストタイトル</p>
          <p className="font-semibold text-gray-900 mt-0.5">{draft.title}</p>
        </div>

        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">デザイン画像</p>
          <div className="flex gap-4 mt-1">
            <span className="text-sm text-gray-700">A: {draft.fileA?.name ?? '—'}</span>
            <span className="text-sm text-gray-700">B: {draft.fileB?.name ?? '—'}</span>
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">評価ペルソナ</p>
          <p className="text-sm text-gray-700 mt-0.5">{draft.personaIds.length}件選択</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          disabled={isExecuting}
          onClick={() => navigate('/tests/new/personas')}
          className="rounded-md border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        >
          戻る
        </button>
        <button
          type="button"
          disabled={isExecuting}
          onClick={handleExecute}
          className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isExecuting ? '実行中...' : 'テスト実行'}
        </button>
      </div>
    </div>
  );
}
