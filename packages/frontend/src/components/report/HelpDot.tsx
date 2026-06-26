import { useState } from 'react';

interface HelpDotProps {
  title?: string;
  content: string;
}

export function HelpDot({ title, content }: HelpDotProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        className="flex items-center justify-center rounded-full text-text-lo hover:text-text-mid transition-colors cursor-help"
        style={{ width: 16, height: 16, fontSize: 10, fontWeight: 600, border: '1px solid var(--color-hairline, #FFFFFF14)' }}
      >
        ?
      </span>
      {open && (
        <div
          className="absolute z-50 rounded-md bg-raised border border-hairline pointer-events-none"
          style={{
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: 6,
            padding: '10px 14px',
            minWidth: 200,
            maxWidth: 320,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}
        >
          {title && (
            <p className="text-text-hi font-sans text-xs font-semibold mb-1.5">{title}</p>
          )}
          <p className="text-text-mid font-sans text-xs leading-relaxed">{content}</p>
        </div>
      )}
    </div>
  );
}
