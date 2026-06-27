import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play } from 'lucide-react';
import { testDraft } from '../lib/testDraft';
import { API_BASE } from '../api/client';
import { createTest, getUploadUrl, uploadToS3, updateTest, executeTest, captureUrl } from '../api/tests';
import { usePersonas } from '../hooks/usePersonas';

export function TestConfirmPage() {
  const navigate = useNavigate();
  const draft = testDraft.get();
  const { personas } = usePersonas();
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPersonas = personas.filter((p) => draft.personaIds.includes(p.personaId));
  const estimatedSeconds = Math.max(15, Math.ceil(draft.personaIds.length * 2.5));

  async function resolveImageKey(testId: string, side: 'A' | 'B'): Promise<string> {
    const sideData = side === 'A' ? draft.sideA : draft.sideB;
    if (!sideData) throw new Error(`${side}案のデータがありません`);

    if (sideData.imageKey) return sideData.imageKey;

    if (sideData.inputType === 'image_upload') {
      const { uploadUrl, imageKey } = await getUploadUrl(testId, {
        side,
        contentType: sideData.file.type as 'image/png' | 'image/jpeg' | 'image/webp',
      });
      await uploadToS3(uploadUrl, sideData.file);
      return imageKey;
    }

    const { imageKey } = await captureUrl(testId, {
      side,
      inputType: sideData.inputType,
      url: sideData.url,
    });
    return imageKey;
  }

  async function handleExecute() {
    setIsExecuting(true);
    setError(null);
    try {
      const sideA = draft.sideA!;
      const sideB = draft.sideB!;

      function toDesignInput(side: typeof sideA) {
        if (side.inputType === 'figma_url') return { inputType: side.inputType as const, figmaUrl: side.url };
        if (side.inputType === 'site_url') return { inputType: side.inputType as const, siteUrl: side.url };
        return { inputType: side.inputType as const };
      }

      let testId: string;
      if (draft.resumeId) {
        testId = draft.resumeId;
      } else {
        const created = await createTest({
          title: draft.title,
          designAInput: toDesignInput(sideA),
          designBInput: toDesignInput(sideB),
          personaIds: draft.personaIds,
        });
        testId = created.testId;
      }

      const [imageKeyA, imageKeyB] = await Promise.all([
        resolveImageKey(testId, 'A'),
        resolveImageKey(testId, 'B'),
      ]);

      await updateTest(testId, {
        designAInput: { ...toDesignInput(sideA), imageKey: imageKeyA },
        designBInput: { ...toDesignInput(sideB), imageKey: imageKeyB },
        personaIds: draft.personaIds,
      });

      await executeTest(testId);
      testDraft.reset();
      navigate(`/tests/${testId}/running`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'テスト実行に失敗しました');
    } finally {
      setIsExecuting(false);
    }
  }

  function getSideLabel(side: 'A' | 'B'): string {
    const sideData = side === 'A' ? draft.sideA : draft.sideB;
    if (!sideData) return '—';
    if (sideData.inputType === 'image_upload') return sideData.file.name;
    return sideData.url;
  }

  function getSideBadgeLabel(side: 'A' | 'B'): string {
    const sideData = side === 'A' ? draft.sideA : draft.sideB;
    if (!sideData) return '—';
    if (sideData.inputType === 'image_upload') return '画像';
    if (sideData.inputType === 'figma_url') return 'Figma';
    return 'URL';
  }

  return (
    <div className="flex flex-col gap-6" style={{ width: '100%', maxWidth: 864, margin: '0 auto', padding: '48px 24px' }}>
      {/* Header */}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-xs text-text-lo" style={{ letterSpacing: 1.5 }}>
          確認
        </span>
        <h1 className="text-text-hi font-sans font-semibold" style={{ fontSize: 24 }}>
          内容を確認
        </h1>
        <p className="text-text-mid font-sans text-sm">
          この設定でA/Bテストを実行します
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-md px-4 py-3 text-sm bg-danger-dim text-danger" style={{ borderRadius: 10 }}>
          {error}
        </div>
      )}

      {/* Designs */}
      <div className="flex flex-col gap-3">
        <span className="font-mono text-xs text-text-lo" style={{ letterSpacing: 0.5 }}>
          比較対象
        </span>
        <div className="flex gap-5">
          {(['A', 'B'] as const).map((side) => {
            const dotColor = side === 'A' ? 'var(--color-win-a)' : 'var(--color-win-b)';
            return (
              <div
                key={side}
                className="flex items-center gap-3.5 flex-1 min-w-0 overflow-hidden"
                style={{ borderRadius: 10, border: '1px solid var(--color-hairline)', padding: 16 }}
              >
                <div
                  className="flex-shrink-0 overflow-hidden flex items-center justify-center bg-raised"
                  style={{ width: 72, height: 54, borderRadius: 6 }}
                >
                  {(() => {
                    const sideData = side === 'A' ? draft.sideA : draft.sideB;
                    if (!sideData) return null;
                    if (sideData.inputType === 'image_upload')
                      return <img src={URL.createObjectURL(sideData.file)} alt={`${side}案`} className="w-full h-full object-cover" />;
                    if (sideData.imageKey)
                      return <img src={`${API_BASE}/images/${sideData.imageKey}`} alt={`${side}案`} className="w-full h-full object-cover" />;
                    return null;
                  })()}
                </div>
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 rounded-full" style={{ width: 8, height: 8, background: dotColor }} />
                    <span className="text-text-hi font-sans text-sm font-semibold">{side}案</span>
                    <span className="text-text-lo font-mono text-xs">{getSideBadgeLabel(side)}</span>
                  </div>
                  <span className="text-text-lo font-mono text-xs truncate">{getSideLabel(side)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Personas */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-text-lo" style={{ letterSpacing: 0.5 }}>
            選択したペルソナ
          </span>
          <span className="text-text-mid font-mono text-xs">{draft.personaIds.length}体</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedPersonas.length > 0 ? (
            selectedPersonas.map((p) => (
              <span
                key={p.personaId}
                className="text-text-hi font-sans text-sm"
                style={{ borderRadius: 999, background: 'var(--color-raised)', padding: '6px 14px' }}
              >
                {p.displayName}
              </span>
            ))
          ) : (
            <span className="text-text-lo font-sans text-sm">{draft.personaIds.length}体を選択中</span>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="flex flex-col gap-3">
        <span className="font-mono text-xs text-text-lo" style={{ letterSpacing: 0.5 }}>
          実行設定
        </span>
        <div className="flex flex-col">
          {[
            { label: 'AIモデル', value: 'Amazon Nova Lite (Bedrock)' },
            { label: '評価ペルソナ数', value: `${draft.personaIds.length}体` },
            { label: '推定所要時間', value: `約${estimatedSeconds}秒` },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between py-3 border-b border-hairline"
            >
              <span className="text-text-mid font-sans text-sm">{label}</span>
              <span className="text-text-hi font-mono text-sm">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between" style={{ borderTop: '1px solid var(--color-hairline)', paddingTop: 16 }}>
        <button
          type="button"
          disabled={isExecuting}
          onClick={() => navigate('/tests/new/personas')}
          className="flex items-center gap-2 text-text-mid font-sans text-sm font-medium transition-colors hover:text-text-hi disabled:opacity-40"
          style={{ borderRadius: 10, border: '1px solid var(--color-hairline)', padding: '10px 16px' }}
        >
          <ArrowLeft size={16} />
          戻る
        </button>
        <button
          type="button"
          disabled={isExecuting}
          onClick={handleExecute}
          className="flex items-center gap-2 text-white font-sans text-sm font-semibold transition-opacity disabled:opacity-40"
          style={{ borderRadius: 10, background: 'var(--color-accent)', padding: '10px 24px' }}
        >
          <Play size={16} />
          {isExecuting ? '実行中...' : 'テストを実行'}
        </button>
      </div>
    </div>
  );
}
