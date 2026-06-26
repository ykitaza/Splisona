import { useEffect } from 'react';
import { X } from 'lucide-react';

export function ImageLightbox({ src, alt, onClose }: { src: string; alt?: string; onClose: () => void }) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.80)' }}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 flex items-center justify-center rounded-full transition-colors hover:bg-white/20"
        style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer' }}
      >
        <X size={18} color="#FFFFFF" />
      </button>
      <img
        src={src}
        alt={alt ?? ''}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 'min(90vw, 1200px)',
          maxHeight: '85vh',
          objectFit: 'contain',
          borderRadius: 8,
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
      />
    </div>
  );
}
