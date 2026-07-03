import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface FieldSelectOption {
  value: string;
  label: string;
}

interface FieldSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: FieldSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export function FieldSelect({ value, onChange, options, placeholder = '選択してください', disabled, id }: FieldSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxH: 240 });

  const updatePos = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const gap = 4;
    const maxH = 240;
    const spaceBelow = window.innerHeight - r.bottom - gap;
    const spaceAbove = r.top - gap;
    if (spaceBelow >= maxH) {
      setPos({ top: r.bottom + gap, left: r.left, width: r.width, maxH });
    } else if (spaceAbove >= maxH) {
      setPos({ top: r.top - gap - maxH, left: r.left, width: r.width, maxH });
    } else if (spaceBelow >= spaceAbove) {
      setPos({ top: r.bottom + gap, left: r.left, width: r.width, maxH: spaceBelow - 8 });
    } else {
      const h = Math.min(maxH, spaceAbove - 8);
      setPos({ top: r.top - gap - h, left: r.left, width: r.width, maxH: h });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    function handleClick(e: MouseEvent) {
      const t = e.target as Node;
      if (ref.current?.contains(t) || dropRef.current?.contains(t)) return;
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    function handleScroll() { updatePos(); }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [open, updatePos]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} id={id}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full font-sans text-sm outline-none transition-colors disabled:opacity-50"
        style={{
          borderRadius: 0,
          padding: '8px 0',
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid var(--color-hairline)',
          color: selected ? 'var(--color-text-hi)' : 'var(--color-text-lo)',
        }}
        onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--color-accent)'; }}
        onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'var(--color-hairline)'; }}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown
          size={16}
          className="flex-shrink-0 text-text-lo transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
        />
      </button>

      {open && createPortal(
        <div
          ref={dropRef}
          className="overflow-y-auto"
          style={{
            position: 'fixed',
            zIndex: 9999,
            top: pos.top,
            left: pos.left,
            width: pos.width,
            maxHeight: pos.maxH,
            borderRadius: 8,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-hairline)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            padding: '4px 0',
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className="flex items-center justify-between w-full text-left font-sans text-sm transition-colors"
                style={{
                  padding: '8px 12px',
                  color: isSelected ? 'var(--color-accent)' : 'var(--color-text-hi)',
                  background: isSelected ? 'var(--color-accent-dim)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--color-raised)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isSelected ? 'var(--color-accent-dim)' : 'transparent';
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={14} />}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}
