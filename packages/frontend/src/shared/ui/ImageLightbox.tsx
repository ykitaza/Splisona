import { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const ZOOM_STEP = 0.3;

export function ImageLightbox({ src, alt, onClose }: { src: string; alt?: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetAtDragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') zoomBy(ZOOM_STEP);
      if (e.key === '-') zoomBy(-ZOOM_STEP);
      if (e.key === '0') reset();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function zoomBy(delta: number) {
    setScale((s) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta));
      if (next === MIN_SCALE) setOffset({ x: 0, y: 0 });
      return next;
    });
  }

  function reset() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  function handleWheel(e: React.WheelEvent) {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    zoomBy(delta);
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (scale <= 1) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetAtDragStart.current = offset;
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return;
    setOffset({
      x: offsetAtDragStart.current.x + (e.clientX - dragStart.current.x),
      y: offsetAtDragStart.current.y + (e.clientY - dragStart.current.y),
    });
  }

  function handleMouseUp() {
    dragging.current = false;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(0,0,0,0.85)',
        cursor: scale > 1 ? 'grab' : 'default',
        overflow: 'hidden',
      }}
      onClick={scale > 1 ? undefined : onClose}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Image — transforms freely within the viewport */}
      <img
        src={src}
        alt={alt ?? ''}
        onClick={(e) => { e.stopPropagation(); if (scale === 1) onClose(); }}
        onDoubleClick={(e) => { e.stopPropagation(); scale > 1 ? reset() : zoomBy(ZOOM_STEP * 3); }}
        style={{
          maxWidth: scale === 1 ? 'min(90vw, 1200px)' : 'none',
          maxHeight: scale === 1 ? '85vh' : 'none',
          objectFit: 'contain',
          borderRadius: 8,
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
          transformOrigin: 'center',
          transition: dragging.current ? 'none' : 'transform 0.12s ease',
          userSelect: 'none',
          pointerEvents: 'auto',
          display: 'block',
          flexShrink: 0,
        }}
        draggable={false}
      />

      {/* Controls — always on top, never triggers close */}
      <div
        className="absolute top-4 right-4 flex items-center gap-1 z-10"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => zoomBy(-ZOOM_STEP)}
          disabled={scale <= MIN_SCALE}
          className="flex items-center justify-center rounded-md transition-colors hover:bg-white/20 disabled:opacity-30"
          style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer' }}
        >
          <ZoomOut size={15} color="#FFFFFF" />
        </button>
        <span
          className="text-center"
          style={{ color: '#FFFFFF', fontFamily: 'Geist Mono, monospace', fontSize: 11, minWidth: 40 }}
        >
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={() => zoomBy(ZOOM_STEP)}
          disabled={scale >= MAX_SCALE}
          className="flex items-center justify-center rounded-md transition-colors hover:bg-white/20 disabled:opacity-30"
          style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer' }}
        >
          <ZoomIn size={15} color="#FFFFFF" />
        </button>
        {scale > 1 && (
          <button
            type="button"
            onClick={reset}
            className="flex items-center justify-center rounded-md transition-colors hover:bg-white/20"
            style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer' }}
          >
            <RotateCcw size={15} color="#FFFFFF" />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center rounded-md transition-colors hover:bg-white/20 ml-1"
          style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer' }}
        >
          <X size={15} color="#FFFFFF" />
        </button>
      </div>

      {/* Hint */}
      {scale === 1 && (
        <p
          className="absolute bottom-4 pointer-events-none"
          style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Geist, sans-serif', fontSize: 11 }}
        >
          スクロールでズーム・ズーム中はドラッグで移動
        </p>
      )}
    </div>
  );
}
