interface FieldSliderProps {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export function FieldSlider({ label, value, min, max, step = 1, disabled, onChange }: FieldSliderProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-text-mid font-sans text-sm">{label}</span>
          <span className="text-text-hi font-mono text-sm">{value}</span>
        </div>
      )}
      <input
        type="range"
        role="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
    </div>
  );
}
