import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Image, Info, Link2, Camera, Maximize2, Play, Users, Check, X } from 'lucide-react';
import { ImageLightbox } from '../components/ImageLightbox';
import { Modal } from '../components/ui/Modal';
import { testDraft, sideToDesignInput, type DesignSideData } from '../lib/testDraft';
import { captureUrl, createTest, updateTest, executeTest, getUploadUrl, uploadToS3 } from '../api/tests';
import { usePersonas } from '../hooks/usePersonas';
import { API_BASE, ApiError } from '../api/client';
import { PERSONA_TYPE_LABELS } from '../types';

type TabType = 'image' | 'figma_url' | 'site_url';

function DesignSidePanel({
  side,
  sideData,
  onSideChange,
}: {
  side: 'A' | 'B';
  sideData: DesignSideData | null;
  onSideChange: (data: DesignSideData | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const accentColor = side === 'A' ? 'var(--color-win-a, #6E78D9)' : 'var(--color-win-b, #C9974F)';

  const currentTab: TabType =
    sideData?.inputType === 'figma_url'
      ? 'figma_url'
      : sideData?.inputType === 'site_url'
      ? 'site_url'
      : 'image';

  const [activeTab, setActiveTab] = useState<TabType>(currentTab);
  const [urlInput, setUrlInput] = useState(
    sideData?.inputType === 'figma_url' || sideData?.inputType === 'site_url' ? sideData.url : ''
  );
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const file = sideData?.inputType === 'image_upload' ? sideData.file : null;
  const imagePreview = sideData?.inputType === 'image_upload' ? URL.createObjectURL(sideData.file) : null;
  const capturedImageKey = sideData?.inputType !== 'image_upload' ? sideData?.imageKey : null;
  const capturedPreviewUrl = capturedImageKey ? `${API_BASE}/stub-upload/${capturedImageKey}` : null;

  const isReady =
    sideData !== null &&
    (sideData.inputType === 'image_upload' || !!sideData.imageKey);

  function handleTabChange(tab: TabType) {
    setActiveTab(tab);
    setCaptureError(null);
    if (tab === 'image') {
      onSideChange(null);
    } else {
      if (urlInput.trim()) {
        const inputType = tab === 'figma_url' ? 'figma_url' : 'site_url';
        onSideChange({ inputType, url: urlInput.trim(), imageKey: '' });
      } else {
        onSideChange(null);
      }
    }
  }

  function handleUrlChange(value: string) {
    setUrlInput(value);
    setCaptureError(null);
    if (value.trim()) {
      const inputType = activeTab === 'figma_url' ? 'figma_url' : 'site_url';
      onSideChange({ inputType, url: value.trim(), imageKey: '' });
    } else {
      onSideChange(null);
    }
  }

  async function handleCapture() {
    if (!urlInput.trim()) return;
    const inputType = activeTab === 'figma_url' ? 'figma_url' : 'site_url';
    setIsCapturing(true);
    setCaptureError(null);
    try {
      const { imageKey } = await captureUrl('preview', { side, inputType, url: urlInput.trim() });
      onSideChange({ inputType, url: urlInput.trim(), imageKey });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'スクリーンショットの取得に失敗しました';
      setCaptureError(msg);
      onSideChange({ inputType, url: urlInput.trim(), imageKey: '' });
    } finally {
      setIsCapturing(false);
    }
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'image', label: '画像' },
    { id: 'figma_url', label: 'Figma URL' },
    { id: 'site_url', label: 'サイトURL' },
  ];

  return (
    <>
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      <div className="flex flex-col gap-3.5 flex-1">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: accentColor }} />
          <span className="text-text-hi font-sans text-sm font-semibold">{side}案</span>
          <div className="flex-1" />
          {isReady && (
            <span className="text-accent font-sans text-xs font-medium">入力済</span>
          )}
        </div>

        <div className="flex border-b border-hairline">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className="px-3 py-1.5 font-sans text-xs transition-colors"
              style={{
                fontWeight: activeTab === tab.id ? 600 : 400,
                color: activeTab === tab.id ? 'var(--color-text-hi)' : 'var(--color-text-lo)',
                borderBottom: activeTab === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'image' && (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full overflow-hidden rounded-md transition-colors"
              style={{
                height: 320,
                border: `1.5px dashed ${file ? 'var(--color-accent)' : 'var(--color-hairline)'}`,
                background: 'var(--color-bg-raised)',
                cursor: 'pointer',
              }}
            >
              {imagePreview ? (
                <div className="relative w-full h-full group">
                  <img src={imagePreview} alt={`デザイン${side}プレビュー`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setLightboxSrc(imagePreview); }}
                    className="absolute top-2 right-2 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ width: 28, height: 28, background: 'rgba(0,0,0,0.55)' }}
                  >
                    <Maximize2 size={13} color="#FFFFFF" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <Image size={24} className="text-text-lo" />
                  <span className="text-text-lo font-sans text-xs">クリックして画像を選択</span>
                </div>
              )}
            </button>

            {file && (
              <div className="flex items-center gap-2 rounded-md bg-raised px-3 py-2.5">
                <Image size={16} className="text-text-lo" />
                <span className="flex-1 truncate text-text-hi font-mono text-xs">{file.name}</span>
                <span className="text-text-lo font-sans text-xs">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="text-accent font-sans text-xs font-medium"
                >
                  差し替え
                </button>
              </div>
            )}

            <input
              ref={inputRef}
              data-testid="file-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onSideChange({ inputType: 'image_upload', file: f, imageKey: '' });
              }}
            />
          </>
        )}

        {(activeTab === 'figma_url' || activeTab === 'site_url') && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 rounded-md bg-raised border border-hairline px-3">
              <Link2 size={15} className="text-text-lo flex-shrink-0" />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder={activeTab === 'figma_url' ? 'https://www.figma.com/design/...' : 'https://example.com'}
                className="flex-1 py-2.5 bg-transparent text-text-hi font-sans text-sm outline-none"
              />
            </div>

            <div
              className="flex items-center justify-center overflow-hidden rounded-md"
              style={{
                height: 320,
                background: 'var(--color-bg-raised)',
                cursor: capturedPreviewUrl ? 'zoom-in' : 'default',
              }}
              onClick={() => { if (capturedPreviewUrl) setLightboxSrc(capturedPreviewUrl); }}
            >
              {isCapturing ? (
                <div className="flex flex-col items-center gap-2">
                  <div role="status" className="animate-spin rounded-full h-5 w-5 border-b-2 border-text-lo" />
                  <span className="text-text-lo font-sans text-xs">取得中...</span>
                </div>
              ) : capturedPreviewUrl ? (
                <img src={capturedPreviewUrl} alt={`${side}案プレビュー`} className="w-full h-full object-cover" />
              ) : (
                <span className="text-text-lo font-sans text-xs">
                  {urlInput.trim() ? '「スクリーンショットを取得」を押してください' : 'URLを入力してください'}
                </span>
              )}
            </div>

            {urlInput.trim() && (
              <button
                type="button"
                disabled={isCapturing}
                onClick={handleCapture}
                className="flex items-center justify-center gap-2 rounded-md bg-raised border border-hairline py-2 text-text-hi font-sans text-sm disabled:opacity-40 transition-opacity"
              >
                <Camera size={14} className="text-text-mid" />
                {capturedPreviewUrl ? 'スクリーンショットを再取得' : 'スクリーンショットを取得'}
              </button>
            )}

            {captureError && (
              <p className="text-danger font-sans text-xs">{captureError}</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function PersonaSelectModal({
  open,
  onClose,
  selectedIds,
  onSelectedChange,
}: {
  open: boolean;
  onClose: () => void;
  selectedIds: Set<string>;
  onSelectedChange: (ids: Set<string>) => void;
}) {
  const { personas } = usePersonas();

  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedChange(next);
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex flex-col" style={{ width: 480, maxHeight: 520 }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-hairline">
          <span className="text-text-hi font-sans text-sm font-semibold">ペルソナを選択</span>
          <span className="text-text-lo font-mono text-xs">{selectedIds.size}人選択中</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {personas.map((persona) => {
            const checked = selectedIds.has(persona.personaId);
            return (
              <button
                key={persona.personaId}
                type="button"
                onClick={() => toggle(persona.personaId)}
                className="flex items-center gap-3 w-full text-left px-5 py-3 border-b border-hairline transition-colors hover:bg-raised"
                style={{ background: checked ? 'var(--color-accent-dim)' : 'transparent' }}
              >
                <div
                  className="flex items-center justify-center w-4 h-4 rounded flex-shrink-0"
                  style={{
                    background: checked ? 'var(--color-accent)' : 'transparent',
                    border: checked ? 'none' : '1.5px solid var(--color-text-lo)',
                  }}
                >
                  {checked && <Check size={10} color="#FFFFFF" />}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-text-hi font-sans text-sm">{persona.displayName}</span>
                  <span className="text-text-lo font-sans text-xs truncate">
                    {PERSONA_TYPE_LABELS[persona.type]}
                    {persona.age ? ` · ${persona.age}歳` : ''}
                    {persona.gender ? ` · ${persona.gender}` : ''}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex justify-end px-5 py-3 border-t border-hairline">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-accent px-4 py-2 text-white font-sans text-sm font-semibold"
          >
            完了
          </button>
        </div>
      </div>
    </Modal>
  );
}

function isSideReady(data: DesignSideData | null): boolean {
  if (!data) return false;
  if (data.inputType === 'image_upload') return true;
  return !!data.imageKey;
}

export function TestInputPage() {
  const navigate = useNavigate();
  const initial = testDraft.get();
  const [title, setTitle] = useState(initial.title);
  const [sideA, setSideA] = useState<DesignSideData | null>(initial.sideA);
  const [sideB, setSideB] = useState<DesignSideData | null>(initial.sideB);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initial.personaIds));
  const [personaModalOpen, setPersonaModalOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canExecute = title.trim().length > 0 && isSideReady(sideA) && isSideReady(sideB) && selectedIds.size > 0;

  function handleTitleChange(value: string) {
    setTitle(value);
    testDraft.setTitle(value);
  }

  function handleSideChange(side: 'A' | 'B', data: DesignSideData | null) {
    testDraft.setSide(side, data);
    if (side === 'A') setSideA(data);
    else setSideB(data);
  }

  function handleSelectedChange(ids: Set<string>) {
    setSelectedIds(ids);
    testDraft.setPersonaIds(Array.from(ids));
  }

  async function resolveImageKey(testId: string, side: 'A' | 'B'): Promise<string> {
    const sideData = side === 'A' ? sideA : sideB;
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
    const { imageKey } = await captureUrl(testId, { side, inputType: sideData.inputType, url: sideData.url });
    return imageKey;
  }

  async function handleExecute() {
    if (!sideA || !sideB) return;
    setIsExecuting(true);
    setError(null);
    try {
      const personaIds = Array.from(selectedIds);
      const designAInput = sideToDesignInput(sideA);
      const designBInput = sideToDesignInput(sideB);

      let testId: string;
      const draft = testDraft.get();
      if (draft.resumeId) {
        testId = draft.resumeId;
        await updateTest(testId, { title, designAInput, designBInput, personaIds });
      } else {
        const created = await createTest({ title, designAInput, designBInput, personaIds });
        testId = created.testId;
      }

      const [imageKeyA, imageKeyB] = await Promise.all([
        resolveImageKey(testId, 'A'),
        resolveImageKey(testId, 'B'),
      ]);

      await updateTest(testId, {
        designAInput: { ...designAInput, imageKey: imageKeyA },
        designBInput: { ...designBInput, imageKey: imageKeyB },
        personaIds,
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

  return (
    <div className="flex flex-col gap-7 py-6 px-7">
      <PersonaSelectModal
        open={personaModalOpen}
        onClose={() => setPersonaModalOpen(false)}
        selectedIds={selectedIds}
        onSelectedChange={handleSelectedChange}
      />

      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs text-text-lo" style={{ letterSpacing: '1.5px' }}>新規テスト</span>
          <h1 className="text-text-hi font-sans text-xl font-semibold">新しい A/B テスト</h1>
        </div>
        <button
          type="button"
          onClick={() => navigate('/results')}
          className="flex items-center justify-center rounded-md text-text-lo hover:text-text-mid transition-colors"
          style={{ width: 32, height: 32 }}
          aria-label="閉じる"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-xs text-text-lo" style={{ letterSpacing: '0.8px' }}>テストタイトル</span>
        <input
          id="test-title"
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="例: ランディングページ A/B テスト"
          className="rounded-md bg-base border border-hairline px-3 py-2.5 text-text-hi font-sans text-sm outline-none focus:border-accent"
          style={{ borderRadius: 10 }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-xs text-text-lo" style={{ letterSpacing: '1.2px' }}>比較対象</span>
        <div className="flex gap-7">
          <DesignSidePanel side="A" sideData={sideA} onSideChange={(d) => handleSideChange('A', d)} />
          <DesignSidePanel side="B" sideData={sideB} onSideChange={(d) => handleSideChange('B', d)} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-xs text-text-lo" style={{ letterSpacing: '1.2px' }}>対象ペルソナ</span>
        <button
          type="button"
          onClick={() => setPersonaModalOpen(true)}
          className="flex items-center gap-2.5 rounded-md bg-raised border border-hairline px-4 py-3 transition-colors hover:bg-surface"
        >
          <Users size={16} className="text-text-mid" />
          <span className="text-text-hi font-sans text-sm">
            {selectedIds.size > 0 ? `${selectedIds.size}人のペルソナを選択中` : 'ペルソナを選択'}
          </span>
        </button>
      </div>

      <div className="flex items-start gap-2">
        <Info size={14} className="text-text-lo flex-shrink-0 mt-0.5" />
        <p className="text-text-lo font-sans text-xs">
          FigmaやサイトのURLを入力した場合は、スクリーンショットを取得してから実行してください。
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-danger/10 text-danger px-4 py-3 font-sans text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <Link to="/results" className="text-text-lo font-sans text-sm hover:text-text-mid transition-colors">
          キャンセル
        </Link>
        <button
          type="button"
          disabled={!canExecute || isExecuting}
          onClick={handleExecute}
          className="flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-white font-sans text-sm font-semibold transition-opacity disabled:opacity-40"
        >
          <Play size={16} />
          {isExecuting ? '実行中...' : '作成して実行'}
        </button>
      </div>
    </div>
  );
}
