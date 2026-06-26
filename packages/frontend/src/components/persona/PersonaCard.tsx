import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { PERSONA_TYPE_LABELS } from '../../types';
import type { Persona, PersonaType } from '../../types';
import { PersonaNode, getNodeColor } from './PersonaNode';

const STANCE_LABELS: Record<PersonaType, string> = {
  action_oriented: 'せっかち',
  cautious: '慎重',
  info_savvy: '感度高',
  efficiency: '効率重視',
  cost_conscious: 'コスパ重視',
  trend_sensitive: '流行敏感',
  other: 'その他',
};

function sourceLabel(persona: Persona): string {
  if (persona.source === 'default') return 'DEFAULT';
  if (persona.source === 'preset') return 'PRESET';
  if (persona.source === 'ai') return 'AI';
  return 'CUSTOM';
}

interface Props {
  persona: Persona;
  onDelete?: (id: string) => void;
  onDuplicate?: (persona: Persona) => void;
}

export function PersonaCard({ persona, onDelete, onDuplicate }: Props) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const glowColor = getNodeColor(persona.personaId);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const isDefault = persona.source === 'default';

  const menuItems = [
    {
      label: '詳細・インタビュー',
      onClick: () => { navigate(`/personas/${persona.personaId}`); setMenuOpen(false); },
    },
    ...(!isDefault
      ? [{
          label: '編集',
          onClick: () => { navigate(`/personas/${persona.personaId}/edit`); setMenuOpen(false); },
        }]
      : []),
    ...(onDuplicate
      ? [{
          label: '複製して編集',
          onClick: () => { setMenuOpen(false); onDuplicate(persona); },
        }]
      : []),
    ...(onDelete && !isDefault
      ? [{
          label: '削除',
          danger: true,
          onClick: () => { setMenuOpen(false); onDelete(persona.personaId); },
        }]
      : []),
  ];

  const demographics = [
    persona.age != null ? String(persona.age) : null,
    persona.gender || null,
    persona.occupation || null,
  ].filter(Boolean).join('  ·  ');

  return (
    <div
      className="flex flex-col gap-4 bg-surface"
      style={{ borderRadius: 14, padding: 24, border: '1px solid #FFFFFF0F', width: '100%', flex: 1 }}
    >
      {/* Top */}
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0" style={{ filter: `drop-shadow(0 0 12px ${glowColor}40)` }}>
          <PersonaNode seed={persona.personaId} size={64} />
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <span className="text-text-hi font-sans font-semibold truncate" style={{ fontSize: 18 }}>
            {persona.displayName}
          </span>
          <div className="flex items-center gap-2">
            <span
              className="font-sans text-xs font-medium"
              style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent)', borderRadius: 5, padding: '3px 9px' }}
            >
              {STANCE_LABELS[persona.type] ?? persona.type}
            </span>
            <span className="text-text-lo font-mono" style={{ fontSize: 10, letterSpacing: 0.5 }}>
              {sourceLabel(persona)}
            </span>
          </div>
        </div>

        {/* ⋯ menu */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
            className="flex items-center justify-center rounded-md transition-colors hover:bg-raised"
            style={{ width: 30, height: 30 }}
          >
            <MoreHorizontal size={18} className="text-text-lo" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-50 rounded-md overflow-hidden bg-surface border border-hairline"
              style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.4)', minWidth: 160 }}
            >
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className="w-full text-left px-4 py-2.5 font-sans text-sm transition-colors hover:bg-raised"
                  style={{ color: item.danger ? 'var(--color-danger)' : 'var(--color-text-hi)' }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Personality */}
      {persona.freeText && (
        <p className="text-text-mid font-sans text-base" style={{ lineHeight: 1.5 }}>
          {persona.freeText}
        </p>
      )}

      {/* Divider */}
      <div className="h-px bg-hairline" />

      {/* Demographics */}
      {demographics && (
        <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 0.3 }}>
          {demographics}
        </span>
      )}
    </div>
  );
}
