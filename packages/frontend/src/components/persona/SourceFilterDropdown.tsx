import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { SOURCE_FILTERS, type SourceFilterKey } from '../../lib/personaFilter';

interface Props {
  value: SourceFilterKey;
  onChange: (key: SourceFilterKey) => void;
}

// ペルソナの出自フィルタ。チップの羅列をやめ、コンパクトなドロップダウンにまとめる。
export function SourceFilterDropdown({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const current = SOURCE_FILTERS.find((f) => f.key === value) ?? SOURCE_FILTERS[0];
  const active = value !== 'all';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md px-3.5 py-2.5 text-sm transition-colors"
        style={{
          background: '#FFFFFF',
          border: `1px solid ${active ? '#0A0A0A' : '#E6E6E8'}`,
          borderRadius: 6,
          color: active ? '#0A0A0A' : '#666666',
          fontFamily: 'Geist, sans-serif',
          fontWeight: active ? 500 : 400,
        }}
      >
        種類: {current.label}
        <ChevronDown size={14} color={active ? '#0A0A0A' : '#9A9A9F'} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 rounded-md overflow-hidden"
          style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', minWidth: 180 }}
        >
          {SOURCE_FILTERS.map((f) => {
            const selected = f.key === value;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => { onChange(f.key); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 transition-colors hover:bg-[#F7F7F8] flex items-center justify-between"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 13 }}
              >
                {f.label}
                {selected && <Check size={14} color="#0A0A0A" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
