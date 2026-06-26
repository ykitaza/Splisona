import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Image, Info, ArrowRight, Link2, Camera } from 'lucide-react';
import { testDraft, sideToDesignInput, type DesignSideData } from '../lib/testDraft';
import { captureUrl, createTest, updateTest } from '../api/tests';
import { API_BASE } from '../api/client';
import { Stepper } from '../components/Stepper';

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
  const dotColor = side === 'A' ? '#3B7DD8' : '#E0883A';

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
    } catch {
      setCaptureError('スクリーンショットの取得に失敗しました。URLを確認してください。');
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
    <div
      className="flex flex-col gap-3.5 rounded-md p-5"
      style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 10, flex: 1 }}
    >
      <div className="flex items-center gap-2">
        <div style={{ width: 10, height: 10, borderRadius: 9999, background: dotColor, flexShrink: 0 }} />
        <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 15, fontWeight: 600 }}>
          {side}案
        </span>
        <div className="flex-1" />
        {isReady && (
          <span
            className="rounded-full px-2 py-0.5 text-xs"
            style={{ background: '#E6F4EC', color: '#2E9E5B', fontFamily: 'Geist, sans-serif', fontSize: 11, fontWeight: 500 }}
          >
            ✓ 入力済
          </span>
        )}
      </div>

      <div className="flex" style={{ borderBottom: '1px solid #E6E6E8' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            style={{
              padding: '6px 12px',
              fontFamily: 'Geist, sans-serif',
              fontSize: 12,
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? '#1A1A1A' : '#9A9A9F',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #1A1A1A' : '2px solid transparent',
              cursor: 'pointer',
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
              height: 200,
              border: `1.5px dashed ${file ? '#2E9E5B' : '#D4D4D8'}`,
              borderRadius: 6,
              background: '#F7F7F8',
              cursor: 'pointer',
            }}
          >
            {imagePreview ? (
              <img src={imagePreview} alt={`デザイン${side}プレビュー`} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <Image size={24} color="#9A9A9F" />
                <span style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>
                  クリックして画像を選択
                </span>
              </div>
            )}
          </button>

          {file && (
            <div
              className="flex items-center gap-2 rounded-md px-3 py-2.5"
              style={{ background: '#F7F7F8', border: '1px solid #E6E6E8', borderRadius: 6 }}
            >
              <Image size={16} color="#9A9A9F" />
              <span className="flex-1 truncate" style={{ color: '#1A1A1A', fontFamily: 'Geist Mono, monospace', fontSize: 12 }}>
                {file.name}
              </span>
              <span style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 11 }}>
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </span>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                style={{ color: '#3B7DD8', fontFamily: 'Geist, sans-serif', fontSize: 12, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
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
              if (f) {
                onSideChange({ inputType: 'image_upload', file: f, imageKey: '' });
              }
            }}
          />
        </>
      )}

      {(activeTab === 'figma_url' || activeTab === 'site_url') && (
        <div className="flex flex-col gap-2.5">
          <div
            className="flex items-center gap-2 rounded-md px-3"
            style={{ border: '1px solid #E6E6E8', borderRadius: 6, background: '#FFFFFF' }}
          >
            <Link2 size={15} color="#9A9A9F" style={{ flexShrink: 0 }} />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder={
                activeTab === 'figma_url'
                  ? 'https://www.figma.com/design/...'
                  : 'https://example.com'
              }
              style={{
                flex: 1,
                padding: '10px 0',
                fontFamily: 'Geist, sans-serif',
                fontSize: 13,
                color: '#1A1A1A',
                background: 'none',
                border: 'none',
                outline: 'none',
              }}
            />
          </div>

          {/* Preview area */}
          <div
            className="flex items-center justify-center overflow-hidden rounded-md"
            style={{ height: 150, background: '#F7F7F8', border: '1px solid #E6E6E8', borderRadius: 6 }}
          >
            {isCapturing ? (
              <div className="flex flex-col items-center gap-2">
                <div role="status" className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: '#9A9A9F' }} />
                <span style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 12 }}>取得中...</span>
              </div>
            ) : capturedPreviewUrl ? (
              <img src={capturedPreviewUrl} alt={`${side}案プレビュー`} className="w-full h-full object-cover" />
            ) : (
              <span style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 12 }}>
                {urlInput.trim() ? '「スクリーンショットを取得」を押してください' : 'URLを入力してください'}
              </span>
            )}
          </div>

          {/* Capture button */}
          {urlInput.trim() && (
            <button
              type="button"
              disabled={isCapturing}
              onClick={handleCapture}
              className="flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium disabled:opacity-40 transition-opacity"
              style={{ background: '#F0F1F3', border: '1px solid #E6E6E8', borderRadius: 6, color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 13 }}
            >
              <Camera size={14} color="#1A1A1A" />
              {capturedPreviewUrl ? 'スクリーンショットを再取得' : 'スクリーンショットを取得'}
            </button>
          )}

          {captureError && (
            <p style={{ color: '#D64545', fontFamily: 'Geist, sans-serif', fontSize: 12 }}>{captureError}</p>
          )}
        </div>
      )}
    </div>
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

  const canProceed = title.trim().length > 0 && isSideReady(sideA) && isSideReady(sideB);
  const [isSaving, setIsSaving] = useState(false);

  function handleTitleChange(value: string) {
    setTitle(value);
    testDraft.setTitle(value);
  }

  function handleSideChange(side: 'A' | 'B', data: DesignSideData | null) {
    testDraft.setSide(side, data);
    if (side === 'A') setSideA(data);
    else setSideB(data);
  }

  async function handleNext() {
    if (!sideA || !sideB) return;
    setIsSaving(true);
    try {
      const draft = testDraft.get();
      const designAInput = sideToDesignInput(sideA);
      const designBInput = sideToDesignInput(sideB);
      if (draft.resumeId) {
        await updateTest(draft.resumeId, { title, designAInput, designBInput });
      } else {
        const test = await createTest({ title, designAInput, designBInput, personaIds: draft.personaIds });
        testDraft.resume({ ...draft, resumeId: test.testId });
      }
      navigate('/tests/new/personas');
    } catch {
      navigate('/tests/new/personas');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-8 pb-10">
      <div className="flex flex-col gap-1">
        <h1 style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 28, fontWeight: 600 }}>
          新しいA/Bテスト
        </h1>
        <p style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 14 }}>
          比較する2案を、URLまたは画像アップロードで指定してください
        </p>
      </div>

      <Stepper
        steps={[
          { label: '比較対象', state: 'active' },
          { label: 'ペルソナ選択', state: 'pending' },
          { label: '確認', state: 'pending' },
        ]}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="test-title" style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 12 }}>
          テストタイトル
        </label>
        <input
          id="test-title"
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="例: ランディングページ A/B テスト"
          className="rounded-md px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#3B7DD8]"
          style={{
            border: '1px solid #E6E6E8',
            borderRadius: 6,
            fontFamily: 'Geist, sans-serif',
            fontSize: 14,
            color: '#1A1A1A',
          }}
        />
      </div>

      <div className="flex gap-5">
        <DesignSidePanel side="A" sideData={sideA} onSideChange={(d) => handleSideChange('A', d)} />
        <DesignSidePanel side="B" sideData={sideB} onSideChange={(d) => handleSideChange('B', d)} />
      </div>

      <div className="flex items-start gap-2">
        <Info size={14} color="#9A9A9F" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 12 }}>
          FigmaやサイトのURLを入力した場合は、スクリーンショットを取得してからペルソナ選択に進んでください。
        </p>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Link
          to="/dashboard"
          style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 14, fontWeight: 500 }}
        >
          キャンセル
        </Link>
        <button
          type="button"
          disabled={!canProceed || isSaving}
          onClick={handleNext}
          className="flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ background: '#0A0A0A', borderRadius: 6 }}
        >
          {isSaving ? '保存中...' : '次へ: ペルソナを選択'}
          <ArrowRight size={16} color="#FFFFFF" />
        </button>
      </div>
    </div>
  );
}
