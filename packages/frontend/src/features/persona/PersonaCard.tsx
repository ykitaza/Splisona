import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Eye, Copy, Trash2 } from 'lucide-react';
import type { Persona, PersonaType } from './types';
import { PersonaNode, getNodeColor } from './PersonaNode';
import { getAvatarUrl } from './api';

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

  type MenuItem = { label: string; icon: typeof Eye; onClick: () => void; danger?: boolean; separator?: boolean };
  const menuItems: MenuItem[] = [
    {
      label: '詳細',
      icon: Eye,
      onClick: () => { navigate(`/personas/${persona.personaId}`); setMenuOpen(false); },
    },
    ...(onDuplicate
      ? [{
          label: '複製',
          icon: Copy,
          onClick: () => { setMenuOpen(false); onDuplicate(persona); },
        } as MenuItem]
      : []),
    ...(onDelete && !isDefault
      ? [{
          label: '削除',
          icon: Trash2,
          danger: true,
          separator: true,
          onClick: () => { setMenuOpen(false); onDelete(persona.personaId); },
        } as MenuItem]
      : []),
  ];

  const demographics = [
    persona.age != null ? String(persona.age) : '—',
    persona.gender || '—',
    persona.occupation || '—',
  ].join('  ·  ');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/personas/${persona.personaId}`)}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/personas/${persona.personaId}`); }}
      className="flex flex-col gap-3 bg-surface cursor-pointer group"
      style={{ borderRadius: 14, padding: '16px 20px', border: '1px solid var(--card-border, #FFFFFF0F)', width: '100%', flex: 1, transition: 'background 150ms, border-color 150ms', ['--card-border' as string]: '#FFFFFF0F' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#1C1F23'; e.currentTarget.style.borderColor = '#FFFFFF29'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.borderColor = '#FFFFFF0F'; }}
    >
      {/* Top */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center flex-shrink-0 bg-raised"
          style={{
            width: 48, height: 48, borderRadius: 12,
            border: '1px solid #FFFFFF1F',
            boxShadow: `0 0 12px ${glowColor}40`,
          }}
        >
          <PersonaNode seed={persona.personaId} size={28} avatarUrl={persona.avatarImageKey ? getAvatarUrl(persona.avatarImageKey) : undefined} />
        </div>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <span className="text-text-hi font-sans font-semibold truncate" style={{ fontSize: 16 }}>
            {persona.displayName}
          </span>
          <div className="flex items-center gap-2">
            <span
              className="font-mono"
              style={{ fontSize: 10, fontWeight: 400, background: 'var(--color-accent-dim)', color: 'var(--color-accent)', borderRadius: 5, padding: '3px 9px' }}
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
            className="flex items-center justify-center rounded-md transition-colors hover:bg-raised outline-none"
            style={{ width: 30, height: 30 }}
          >
            <MoreHorizontal size={18} className="text-text-lo group-hover:text-text-mid transition-colors" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-50 flex flex-col"
              style={{
                width: 200,
                borderRadius: 10,
                background: '#1C1F23',
                border: '1px solid #FFFFFF14',
                boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
                overflow: 'hidden',
              }}
            >
              {menuItems.map((item) => {
                const Icon = item.icon;
                const color = item.danger ? '#E06A6A' : '#F2F4F7';
                const iconColor = item.danger ? '#E06A6A' : '#9BA1AC';
                return (
                  <div key={item.label}>
                    {item.separator && <div style={{ height: 1, background: '#FFFFFF14' }} />}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); item.onClick(); }}
                      className="flex items-center w-full font-sans transition-colors hover:bg-raised outline-none"
                      style={{ gap: 10, padding: '10px 14px', fontSize: 14, color }}
                    >
                      <Icon size={16} style={{ color: iconColor }} />
                      {item.label}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Personality */}
      <p className="text-text-mid font-sans text-sm" style={{ lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {persona.freeText || ' '}
      </p>


      {/* Demographics */}
      <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 0.3 }}>
        {demographics || ' '}
      </span>
    </div>
  );
}
