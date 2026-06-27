import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Image, ImagePlus, Info, Link2, Camera, Maximize2, Play, SlidersHorizontal, Check, X } from 'lucide-react';
import { ImageLightbox } from '../components/ImageLightbox';
import { Modal } from '../components/ui/Modal';
import { testDraft, sideToDesignInput, type DesignSideData } from '../lib/testDraft';
import { captureUrl, createTest, updateTest, executeTest, getUploadUrl, uploadToS3 } from '../api/tests';
import { usePersonas } from '../hooks/usePersonas';
import { API_BASE, ApiError } from '../api/client';
import { PERSONA_TYPE_LABELS } from '../types';
import { PersonaNode } from '../components/persona/PersonaNode';

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
  const dropRef = useRef<HTMLButtonElement>(null);
  const [dropHover, setDropHover] = useState(false);
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
  const capturedPreviewUrl = capturedImageKey ? `${API_BASE}/images/${capturedImageKey}` : null;

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
    { id: 'figma_url', label: 'Figma' },
    { id: 'site_url', label: 'URL' },
  ];

  return (
    <>
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      <div className="flex flex-col gap-3.5 flex-1">
        <div className="flex items-center gap-2">
          <span className="inline-block rounded-full" style={{ width: 9, height: 9, background: accentColor }} />
          <span className="text-text-hi font-sans font-semibold" style={{ fontSize: 18 }}>{side}案</span>
          <div className="flex-1" />
          {isReady && (
            <span className="text-accent font-sans text-xs font-medium">入力済</span>
          )}
        </div>

        <div
          className="flex items-center border border-hairline"
          style={{ background: 'var(--color-surface)', borderRadius: 10, padding: 3, gap: 2 }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className="font-mono text-xs transition-colors"
              style={{
                borderRadius: 6,
                padding: '8px 12px',
                background: activeTab === tab.id ? 'var(--color-raised)' : 'transparent',
                color: activeTab === tab.id ? 'var(--color-text-hi)' : 'var(--color-text-lo)',
                letterSpacing: '0.3px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'image' && (
          <>
            <button
              ref={dropRef}
              type="button"
              onClick={() => inputRef.current?.click()}
              onPaste={(e) => {
                const f = Array.from(e.clipboardData.files).find((f) => f.type.startsWith('image/'));
                if (f) { e.preventDefault(); onSideChange({ inputType: 'image_upload', file: f, imageKey: '' }); }
              }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault(); e.stopPropagation();
                const f = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
                if (f) onSideChange({ inputType: 'image_upload', file: f, imageKey: '' });
              }}
              onMouseEnter={() => { setDropHover(true); dropRef.current?.focus(); }}
              onMouseLeave={() => { setDropHover(false); dropRef.current?.blur(); }}
              className="w-full overflow-hidden rounded-md transition-all outline-none"
              style={{
                height: 354,
                border: file ? '1px solid var(--color-accent)' : dropHover ? '1px solid #9BA1AC' : '1px solid #5B616B',
                background: 'var(--color-raised)',
                cursor: 'pointer',
              }}
            >
              {imagePreview ? (
                <div className="relative w-full h-full group">
                  <img src={imagePreview} alt={`デザイン${side}プレビュー`} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ gap: 4 }}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setLightboxSrc(imagePreview); }}
                      className="flex items-center justify-center rounded-md"
                      style={{ width: 28, height: 28, background: 'rgba(0,0,0,0.55)' }}
                    >
                      <Maximize2 size={13} color="#FFFFFF" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onSideChange(null); }}
                      className="flex items-center justify-center rounded-md"
                      style={{ width: 28, height: 28, background: 'rgba(0,0,0,0.55)' }}
                    >
                      <X size={13} color="#FFFFFF" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <ImagePlus size={32} className="text-text-lo" />
                  <span className="text-text-mid font-sans" style={{ fontSize: 14 }}>クリックまたはドラッグで画像を追加</span>
                  {dropHover && (
                    <span className="font-mono text-text-lo" style={{ fontSize: 11, letterSpacing: 0.5 }}>⌘V でペースト</span>
                  )}
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
            <div className="flex items-center gap-2 bg-base border border-hairline px-3" style={{ borderRadius: 10 }}>
              <Link2 size={15} className="text-text-lo flex-shrink-0" />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder={activeTab === 'figma_url' ? 'https://www.figma.com/design/...' : 'https://example.com'}
                className="flex-1 py-2.5 bg-transparent text-text-hi font-mono outline-none"
                style={{ fontSize: 13 }}
              />
            </div>

            <div
              className="flex items-center justify-center overflow-hidden rounded-md"
              style={{
                height: 320,
                background: 'var(--color-raised)',
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

type PersonaFilter = 'all' | 'default' | 'custom';

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
  const [filter, setFilter] = useState<PersonaFilter>('all');

  const filteredPersonas = personas.filter((p) => {
    if (filter === 'default') return p.source === 'default' || p.source === 'preset';
    if (filter === 'custom') return p.source !== 'default' && p.source !== 'preset';
    return true;
  });

  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedChange(next);
  }

  function handleSelectAll() {
    const filteredIds = filteredPersonas.map((p) => p.personaId);
    const allSelected = filteredIds.every((id) => selectedIds.has(id));
    const next = new Set(selectedIds);
    if (allSelected) {
      filteredIds.forEach((id) => next.delete(id));
    } else {
      filteredIds.forEach((id) => next.add(id));
    }
    onSelectedChange(next);
  }

  const filteredIds = filteredPersonas.map((p) => p.personaId);
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex flex-col" style={{ width: 540, maxHeight: 560, background: '#131517' }}>
        <div className="flex flex-col" style={{ padding: '20px 20px 16px 20px', gap: 4 }}>
          <div className="flex items-center justify-between">
            <span className="text-text-hi font-sans font-semibold" style={{ fontSize: 15 }}>ペルソナを選択</span>
            <button type="button" onClick={onClose} className="flex items-center justify-center rounded-md border border-hairline text-text-mid hover:text-text-hi transition-colors" style={{ width: 32, height: 32 }}>
              <X size={16} />
            </button>
          </div>
          <span className="text-text-mid font-sans text-sm">このテストで評価させる人格を選びます</span>
        </div>
        <div className="flex items-center justify-between" style={{ padding: '0 20px 16px 20px' }}>
          <div className="flex items-center" style={{ gap: 8 }}>
            {(['all', 'default', 'custom'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className="font-sans text-sm transition-colors"
                style={{
                  borderRadius: 999,
                  padding: '6px 12px',
                  background: filter === f ? 'var(--color-raised)' : 'transparent',
                  border: filter === f ? '1px solid var(--color-hairline)' : '1px solid transparent',
                  color: filter === f ? 'var(--color-text-hi)' : 'var(--color-text-mid)',
                }}
              >
                {f === 'all' ? 'すべて' : f === 'default' ? 'デフォルト' : 'カスタム'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-accent font-sans text-sm font-medium hover:opacity-80 transition-opacity"
          >
            {allSelected ? '選択解除' : '全選択'}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ padding: '0 12px 12px 12px' }}>
          {filteredPersonas.map((persona) => {
            const checked = selectedIds.has(persona.personaId);
            return (
              <button
                key={persona.personaId}
                type="button"
                onClick={() => toggle(persona.personaId)}
                className="flex items-center w-full text-left transition-colors hover:bg-raised"
                style={{
                  gap: 12,
                  padding: 12,
                  borderRadius: 10,
                  background: checked ? 'var(--color-accent-dim)' : 'transparent',
                }}
              >
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 18, height: 18, borderRadius: 6,
                    background: checked ? 'var(--color-accent)' : 'transparent',
                    border: checked ? 'none' : '1.5px solid var(--color-text-lo)',
                  }}
                >
                  {checked && <Check size={10} color="#FFFFFF" />}
                </div>
                <PersonaNode seed={persona.personaId} size={20} />
                <div className="flex flex-col flex-1 min-w-0" style={{ gap: 2 }}>
                  <span className="text-text-hi font-sans text-sm font-medium">{persona.displayName}</span>
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
        <div className="flex items-center justify-between border-t border-hairline" style={{ padding: '16px 20px 20px 20px' }}>
          <span className="text-text-mid font-mono text-sm">{selectedIds.size} / {personas.length} 体</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-hairline px-4 py-2 text-text-hi font-sans text-sm font-semibold transition-colors hover:bg-raised"
          >
            {selectedIds.size}体を対象に設定
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
  const [sideA, setSideA] = useState<DesignSideData | null>(initial.sideA);
  const [sideB, setSideB] = useState<DesignSideData | null>(initial.sideB);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initial.personaIds));
  const [personaModalOpen, setPersonaModalOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { personas: allPersonas } = usePersonas();
  const canExecute = isSideReady(sideA) && isSideReady(sideB) && selectedIds.size > 0;
  const selectedPersonas = allPersonas.filter((p) => selectedIds.has(p.personaId));

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
        await updateTest(testId, { designAInput, designBInput, personaIds });
      } else {
        const created = await createTest({ title: '', designAInput, designBInput, personaIds });
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
    <div className="flex flex-col" style={{ padding: '48px 128px', gap: 32 }}>
      <PersonaSelectModal
        open={personaModalOpen}
        onClose={() => setPersonaModalOpen(false)}
        selectedIds={selectedIds}
        onSelectedChange={handleSelectedChange}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center flex-shrink-0 rounded-lg bg-raised" style={{ width: 32, height: 32, boxShadow: '0 0 12px rgba(255,255,255,0.09)' }}>
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <circle cx="10" cy="12" r="2" fill="var(--color-text-hi)" />
              <circle cx="22" cy="12" r="2" fill="var(--color-text-hi)" />
              <circle cx="11" cy="20" r="1.5" fill="var(--color-text-hi)" />
              <circle cx="16" cy="21.5" r="1.5" fill="var(--color-text-hi)" />
              <circle cx="21" cy="20" r="1.5" fill="var(--color-text-hi)" />
            </svg>
          </div>
          <h1 className="text-text-hi font-sans font-semibold" style={{ fontSize: 24 }}>新しい A/B テスト</h1>
        </div>
        <button
          type="button"
          onClick={() => navigate('/results')}
          className="flex items-center justify-center rounded-md text-text-mid border border-hairline hover:bg-raised transition-colors"
          style={{ width: 34, height: 34 }}
          aria-label="閉じる"
        >
          <X size={17} />
        </button>
      </div>

      <div className="flex flex-col" style={{ gap: 16 }}>
        <span className="font-mono text-xs text-text-lo" style={{ letterSpacing: '1.2px' }}>比較対象</span>
        <div className="flex" style={{ gap: 48 }}>
          <DesignSidePanel side="A" sideData={sideA} onSideChange={(d) => handleSideChange('A', d)} />
          <DesignSidePanel side="B" sideData={sideB} onSideChange={(d) => handleSideChange('B', d)} />
        </div>
      </div>

      <div className="flex flex-col" style={{ gap: 16 }}>
        <span className="font-mono text-xs text-text-lo" style={{ letterSpacing: 1.2 }}>対象ペルソナ</span>
        <div
          className="flex items-center justify-between"
          style={{ padding: '16px 0', borderTop: '1px solid var(--color-hairline)', borderBottom: '1px solid var(--color-hairline)' }}
        >
          <div className="flex items-center" style={{ gap: 16 }}>
            {selectedIds.size > 0 ? (
              <>
                <div className="relative" style={{ width: Math.min(selectedIds.size, 3) * 17 + 7, height: 28 }}>
                  {selectedPersonas.slice(0, 3).map((p, i) => (
                    <div
                      key={p.personaId}
                      className="absolute rounded-full overflow-hidden"
                      style={{
                        width: 26, height: 26, top: 1,
                        left: i * 17,
                        zIndex: i,
                        boxShadow: '0 0 0 2px var(--color-base)',
                      }}
                    >
                      <PersonaNode seed={p.personaId} size={26} />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col" style={{ gap: 2 }}>
                  <span className="text-text-hi font-sans text-sm font-medium">{selectedIds.size}体を選択中</span>
                  <span className="text-text-lo font-mono text-xs">
                    {selectedPersonas[0]?.displayName}{selectedIds.size > 1 ? ` 他${selectedIds.size - 1}名` : ''}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-text-lo font-sans text-sm">ペルソナを選択してください</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setPersonaModalOpen(true)}
            className="flex items-center border border-hairline text-text-mid font-sans font-medium transition-colors hover:text-text-hi"
            style={{ gap: 7, borderRadius: 10, padding: '8px 16px', fontSize: 13 }}
          >
            <SlidersHorizontal size={14} />
            変更
          </button>
        </div>
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
          className="flex items-center gap-2 rounded-md border border-hairline px-4 py-2.5 text-text-hi font-sans text-sm font-semibold transition-colors hover:bg-raised disabled:opacity-40"
        >
          <Play size={16} />
          {isExecuting ? '実行中...' : 'テスト実行'}
        </button>
      </div>
    </div>
  );
}
