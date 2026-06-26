import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play } from 'lucide-react';
import { testDraft } from '../lib/testDraft';
import { createTest, getUploadUrl, uploadToS3, updateTest, executeTest, captureUrl } from '../api/tests';
import { Stepper } from '../components/Stepper';
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
    if (sideData.inputType === 'image_upload') return '画像アップロード';
    if (sideData.inputType === 'figma_url') return 'Figma URL';
    return 'サイトURL';
  }

  return (
    <div className="flex flex-col gap-6 p-8 pb-10">
      <div className="flex flex-col gap-1">
        <h1 style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 28, fontWeight: 600 }}>
          内容を確認
        </h1>
        <p style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 14 }}>
          この設定でA/Bテストを実行します
        </p>
      </div>

      <Stepper
        steps={[
          { label: '比較対象', state: 'done' },
          { label: 'ペルソナ選択', state: 'done' },
          { label: '確認', state: 'active' },
        ]}
      />

      {error && (
        <div role="alert" className="rounded-md px-4 py-3 text-sm" style={{ background: '#FDEAEA', color: '#D64545', borderRadius: 6 }}>
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 15, fontWeight: 600 }}>
          比較対象
        </span>
        <div className="flex gap-5">
          {(['A', 'B'] as const).map((side) => {
            const dotColor = side === 'A' ? '#3B7DD8' : '#E0883A';
            return (
              <div
                key={side}
                className="flex items-center gap-3.5 rounded-md p-4 flex-1"
                style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 10 }}
              >
                <div
                  className="flex-shrink-0 rounded-md overflow-hidden flex items-center justify-center"
                  style={{ width: 72, height: 54, background: '#F0F1F3', borderRadius: 6 }}
                >
                  {draft.sideA?.inputType === 'image_upload' && side === 'A' && (
                    <img src={URL.createObjectURL(draft.sideA.file)} alt="A案" className="w-full h-full object-cover" />
                  )}
                  {draft.sideB?.inputType === 'image_upload' && side === 'B' && (
                    <img src={URL.createObjectURL(draft.sideB.file)} alt="B案" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div style={{ width: 8, height: 8, borderRadius: 9999, background: dotColor, flexShrink: 0 }} />
                    <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 13, fontWeight: 600 }}>
                      {side}案
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs"
                      style={{ background: '#E6F4EC', color: '#2E9E5B', fontFamily: 'Geist, sans-serif', fontSize: 11 }}
                    >
                      {getSideBadgeLabel(side)}
                    </span>
                  </div>
                  <span
                    className="truncate"
                    style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11 }}
                  >
                    {getSideLabel(side)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 15, fontWeight: 600 }}>
            選択したペルソナ
          </span>
          <span style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>
            {draft.personaIds.length}人
          </span>
        </div>
        <div
          className="rounded-md p-5 flex flex-col gap-4"
          style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 10 }}
        >
          {selectedPersonas.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedPersonas.map((p) => (
                <span
                  key={p.personaId}
                  className="rounded-full px-3 py-1 text-sm"
                  style={{ background: '#F0F1F3', color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 13 }}
                >
                  {p.displayName}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>
              {draft.personaIds.length}人を選択中
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 15, fontWeight: 600 }}>
          実行設定
        </span>
        <div
          className="overflow-hidden rounded-md"
          style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 10 }}
        >
          {[
            { label: 'AIモデル', value: 'Amazon Nova Lite (Bedrock)' },
            { label: '評価ペルソナ数', value: `${draft.personaIds.length}人` },
            { label: '推定所要時間', value: `約${estimatedSeconds}秒` },
          ].map(({ label, value }, i) => (
            <div
              key={label}
              className="flex items-center justify-between"
              style={{
                padding: '14px 18px',
                borderTop: i > 0 ? '1px solid #E6E6E8' : 'none',
              }}
            >
              <span style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>{label}</span>
              <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 13, fontWeight: 500 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          disabled={isExecuting}
          onClick={() => navigate('/tests/new/personas')}
          className="flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium disabled:opacity-40"
          style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 6, color: '#1A1A1A' }}
        >
          <ArrowLeft size={16} color="#1A1A1A" />
          戻る
        </button>
        <button
          type="button"
          disabled={isExecuting}
          onClick={handleExecute}
          className="flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ background: '#0A0A0A', borderRadius: 6 }}
        >
          <Play size={16} color="#FFFFFF" />
          {isExecuting ? '実行中...' : 'テストを実行'}
        </button>
      </div>
    </div>
  );
}
