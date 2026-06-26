interface SegmentControlProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  selected: T;
  label?: string;
  disabled?: boolean;
  onChange: (value: T) => void;
}

export function SegmentControl<T extends string>({ options, selected, label, disabled, onChange }: SegmentControlProps<T>) {
  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-text-mid font-sans text-sm">{label}</span>}
      <div className="inline-flex rounded-md bg-raised p-0.5 gap-0.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            aria-pressed={opt.value === selected}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-md font-sans text-sm transition-colors ${
              opt.value === selected
                ? 'bg-accent-dim text-accent font-medium'
                : 'text-text-mid hover:text-text-hi'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
