import { useState } from 'react';
import { Image } from 'lucide-react';
import { ImageLightbox } from '@/shared/ui/ImageLightbox';
import { SegmentViewer } from '../SegmentViewer';
import { DesignSourceInfo } from './DesignSourceInfo';
import type { DesignInput } from '@/features/test/types';

export function DesignCard({ side, input, isWinner, supportCount, totalCount, imageSrc, onZoom, enableSegmentViewer }: {
  side: 'A' | 'B';
  input: DesignInput;
  isWinner: boolean;
  supportCount: number;
  totalCount: number;
  imageSrc: string | null;
  onZoom?: (src: string, alt: string) => void;
  enableSegmentViewer?: boolean;
}) {
  const [lightbox, setLightbox] = useState(false);
  const [segmentViewerOpen, setSegmentViewerOpen] = useState(false);
  const borderColor = isWinner
    ? (side === 'A' ? 'var(--color-win-a)' : 'var(--color-win-b)')
    : 'var(--color-hairline)';

  function handleZoom() {
    if (!imageSrc) return;
    if (onZoom) onZoom(imageSrc, `${side}案`);
    else setLightbox(true);
  }

  return (
    <>
      {lightbox && imageSrc && <ImageLightbox src={imageSrc} alt={`${side}案`} onClose={() => setLightbox(false)} />}
      {segmentViewerOpen && input.segmentKeys && input.segmentKeys.length > 0 && (
        <SegmentViewer side={side} segmentKeys={input.segmentKeys} onClose={() => setSegmentViewerOpen(false)} />
      )}
      <div
        className="flex flex-col flex-1 min-w-0"
        style={{ gap: 16, paddingLeft: 16, borderLeft: `2px solid ${borderColor}` }}
      >
        <div className="flex items-center justify-between">
          <span className="text-text-hi font-mono text-xs font-semibold" style={{ letterSpacing: 0.5 }}>{side}案</span>
        </div>
        {onZoom ? (
          <div
            className="flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{ height: 180, borderRadius: 10, border: '1px solid var(--color-hairline)' }}
          >
            {imageSrc ? (
              <img src={imageSrc} alt={`${side}案`} className="w-full h-full object-cover" style={{ cursor: 'zoom-in' }} onClick={handleZoom} />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Image size={32} className="text-text-lo" />
                <span className="text-text-lo font-sans text-xs">画像なし</span>
              </div>
            )}
          </div>
        ) : (
          <div
            className="flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{ height: 180, borderRadius: 10, border: '1px solid var(--color-hairline)', cursor: imageSrc ? 'zoom-in' : 'default' }}
            onClick={handleZoom}
          >
            {imageSrc ? (
              <img src={imageSrc} alt={`${side}案`} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Image size={32} className="text-text-lo" />
                <span className="text-text-lo font-sans text-xs">画像なし</span>
              </div>
            )}
          </div>
        )}
        <DesignSourceInfo input={input} linkable={!onZoom} />
        {input.segmentKeys && input.segmentKeys.length > 0 && (
          enableSegmentViewer ? (
            <div className="flex items-center" style={{ gap: 8 }}>
              <span className="text-text-lo font-mono text-xs">評価入力: {input.segmentKeys.length}分割</span>
              <button
                type="button"
                onClick={() => setSegmentViewerOpen(true)}
                className="text-accent font-sans text-xs font-medium hover:opacity-80 transition-opacity"
              >
                入力画像を確認
              </button>
            </div>
          ) : (
            <span className="text-text-lo font-mono text-xs">評価入力: {input.segmentKeys.length}分割</span>
          )
        )}
        <div className="h-px bg-hairline" />
        <div className="flex items-center justify-between">
          <span className="text-text-mid font-sans text-sm">{totalCount}人中{supportCount}人が支持</span>
        </div>
      </div>
    </>
  );
}
