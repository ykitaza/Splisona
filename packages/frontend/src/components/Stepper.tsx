interface Step {
  label: string;
  state: 'done' | 'active' | 'pending';
}

export function Stepper({ steps }: { steps: Step[] }) {
  return (
    <div className="flex items-center gap-3">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center rounded-full flex-shrink-0"
              style={{
                width: 24,
                height: 24,
                borderRadius: 9999,
                background:
                  step.state === 'done'
                    ? '#E6F4EC'
                    : step.state === 'active'
                    ? '#0A0A0A'
                    : '#F0F1F3',
              }}
            >
              <span
                style={{
                  color:
                    step.state === 'done'
                      ? '#2E9E5B'
                      : step.state === 'active'
                      ? '#FFFFFF'
                      : '#9A9A9F',
                  fontFamily: 'Geist, sans-serif',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {step.state === 'done' ? '✓' : String(i + 1)}
              </span>
            </div>
            <span
              style={{
                color: step.state === 'active' ? '#1A1A1A' : '#9A9A9F',
                fontFamily: 'Geist, sans-serif',
                fontSize: 13,
                fontWeight: step.state === 'active' ? 600 : 400,
              }}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ width: 40, height: 1, background: '#D4D4D8', flexShrink: 0 }} />
          )}
        </div>
      ))}
    </div>
  );
}
