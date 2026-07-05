import { useEffect, useState, useRef } from 'react';
import { ChevronDown, Download, FileJson, FileText } from 'lucide-react';

export function ExportMenu({ onJson, onHtml }: { onJson: () => void; onHtml: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const items = [
    { label: 'HTML', icon: <FileText size={14} />, action: onHtml },
    { label: 'JSON', icon: <FileJson size={14} />, action: onJson },
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center bg-surface border border-hairline text-text-mid font-sans font-medium transition-colors hover:text-text-hi"
        style={{ gap: 8, borderRadius: 10, padding: '10px 15px', fontSize: 13 }}
      >
        <Download size={15} />
        書き出し
        <ChevronDown size={13} style={{ marginLeft: 2, opacity: 0.5 }} />
      </button>
      {open && (
        <div
          className="bg-raised border border-hairline"
          style={{
            position: 'absolute', right: 0, top: '100%', marginTop: 6,
            borderRadius: 10, padding: 4, minWidth: 220, zIndex: 50,
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => { setOpen(false); item.action(); }}
              className="flex items-center w-full text-left text-text-mid font-sans transition-colors hover:text-text-hi hover:bg-surface"
              style={{ gap: 10, padding: '9px 12px', borderRadius: 8, fontSize: 13, border: 'none', background: 'none', cursor: 'pointer' }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
