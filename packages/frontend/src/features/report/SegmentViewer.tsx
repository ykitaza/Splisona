import { useEffect } from 'react';
import { X } from 'lucide-react';
import { API_BASE } from '@/shared/api/client';

export function SegmentViewer({
  side,
  segmentKeys,
  onClose,
}: {
  side: 'A' | 'B';
  segmentKeys: string[];
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center"
      style={{ background: 'rgba(5,6,7,0.85)', overflowY: 'auto', padding: '48px 24px' }}
      onClick={onClose}
    >
      <div
        className="flex flex-col w-full"
        style={{ maxWidth: 720, gap: 16 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-text-hi font-sans text-sm font-medium">
            モデルに送信した入力画像 — デザイン{side}（{segmentKeys.length}分割・のりしろ150px）
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="flex items-center justify-center rounded-md transition-colors hover:bg-white/10"
            style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer' }}
          >
            <X size={15} color="#FFFFFF" />
          </button>
        </div>

        <div
          className="flex flex-col bg-base"
          style={{ maxHeight: '85vh', overflowY: 'auto', borderRadius: 8 }}
        >
          {segmentKeys.map((key, i) => (
            <div key={key}>
              {i > 0 && <div className="h-px bg-hairline" />}
              <div className="flex flex-col" style={{ gap: 8, padding: '16px 0' }}>
                <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 0.5 }}>{side}-{i + 1}</span>
                <img
                  src={`${API_BASE}/images/${key}`}
                  alt={`${side}-${i + 1}`}
                  style={{ width: '100%', display: 'block', borderRadius: 6 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
