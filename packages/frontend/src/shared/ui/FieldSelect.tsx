import { useState, useRef, useEffect } from 'react';
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

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative" id={id}>
      <button
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

      {open && (
        <div
          className="absolute z-50 w-full overflow-y-auto"
          style={{
            top: 'calc(100% + 4px)',
            maxHeight: 240,
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
        </div>
      )}
    </div>
  );
}
