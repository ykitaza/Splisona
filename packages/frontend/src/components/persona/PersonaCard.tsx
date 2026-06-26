import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, PencilLine, MoreHorizontal, Layers2 } from 'lucide-react';
import { PERSONA_TYPE_LABELS } from '../../types';
import type { Persona } from '../../types';
import { getAvatarUrl } from '../../api/personas';

const AVATAR_COLORS: { bg: string; text: string }[] = [
  { bg: '#E8F0FB', text: '#3B7DD8' },
  { bg: '#FBF0E4', text: '#E0883A' },
  { bg: '#E6F4EC', text: '#2E9E5B' },
  { bg: '#F0F1F3', text: '#666666' },
];

function getAvatarColor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function initials(name: string) {
  return name.charAt(0);
}

interface Props {
  persona: Persona;
  onDelete?: (id: string) => void;
}

export function PersonaCard({ persona, onDelete }: Props) {
  const color = getAvatarColor(persona.displayName);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const menuItems = [
    {
      label: '詳細・インタビュー',
      onClick: () => { navigate(`/personas/${persona.personaId}`); setMenuOpen(false); },
    },
    {
      label: '編集',
      onClick: () => { navigate(`/personas/${persona.personaId}/edit`); setMenuOpen(false); },
    },
    ...(onDelete
      ? [{
          label: '削除',
          danger: true,
          onClick: () => { setMenuOpen(false); onDelete(persona.personaId); },
        }]
      : []),
  ];

  return (
    <div
      className="flex flex-col gap-4 rounded-md p-5"
      style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 10, width: '100%', flex: 1 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center rounded-full flex-shrink-0 overflow-hidden"
          style={{ width: 44, height: 44, background: color.bg, borderRadius: 9999 }}
        >
          {persona.avatarImageKey ? (
            <img
              src={getAvatarUrl(persona.avatarImageKey)}
              alt={persona.displayName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ color: color.text, fontFamily: 'Geist, sans-serif', fontSize: 15, fontWeight: 600 }}>
              {initials(persona.displayName)}
            </span>
          )}
        </div>

        <div className="flex flex-col flex-1" style={{ gap: 5 }}>
          <Link
            to={`/personas/${persona.personaId}`}
            className="font-semibold hover:underline"
            style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 15, fontWeight: 600 }}
          >
            {persona.displayName}
          </Link>
          <span style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 12 }}>
            {(PERSONA_TYPE_LABELS as Record<string, string>)[persona.type] ?? persona.type}
          </span>
          {(() => {
            const isPreset = persona.source === 'preset';
            const isAi = persona.source === 'ai' || (!persona.source && !!persona.freeText);
            const bg = isPreset ? '#EDE9FE' : isAi ? '#E8F0FB' : '#F0F1F3';
            const color = isPreset ? '#7C3AED' : isAi ? '#3B7DD8' : '#666666';
            const label = isPreset ? 'プリセット' : isAi ? 'AI生成' : '手動作成';
            const Icon = isPreset ? Layers2 : isAi ? Sparkles : PencilLine;
            return (
              <div className="flex items-center gap-1 self-start rounded-full px-2 py-0.5" style={{ background: bg, borderRadius: 9999 }}>
                <Icon size={11} color={color} />
                <span style={{ color, fontFamily: 'Geist, sans-serif', fontSize: 11, fontWeight: 500 }}>{label}</span>
              </div>
            );
          })()}
        </div>

        {/* ⋯ menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
            className="flex items-center justify-center rounded-md transition-colors hover:bg-[#F0F1F3]"
            style={{ width: 30, height: 30, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <MoreHorizontal size={18} color="#9A9A9F" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-50 rounded-md overflow-hidden"
              style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', minWidth: 160 }}
            >
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[#F7F7F8]"
                  style={{
                    color: item.danger ? '#D64545' : '#1A1A1A',
                    fontFamily: 'Geist, sans-serif',
                    fontSize: 13,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'block',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Attrs */}
      <div className="flex flex-col gap-2.5">
        <div className="flex gap-3">
          <AttrCell label="年齢" value={persona.age != null ? `${persona.age}歳` : '—'} />
          <AttrCell label="性別" value={persona.gender ?? '—'} />
        </div>
        <div className="flex gap-3">
          <AttrCell label="偏差値" value={persona.deviationScore != null ? String(persona.deviationScore) : '—'} />
          <AttrCell label="年収" value={persona.annualIncome != null ? `${persona.annualIncome.toLocaleString()}万円` : '—'} />
        </div>
        <div className="flex gap-3">
          <AttrCell label="学歴" value={persona.education ?? '—'} />
          <AttrCell label="職業" value={persona.occupation ?? '—'} />
        </div>
      </div>

      {persona.freeText && (
        <div className="pt-3.5" style={{ borderTop: '1px solid #E6E6E8' }}>
          <p style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 12, lineHeight: 1.5 }}>
            {persona.freeText}
          </p>
        </div>
      )}
    </div>
  );
}

function AttrCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col flex-1" style={{ gap: 2 }}>
      <span style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 11 }}>{label}</span>
      <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 13, fontWeight: 500 }}>{value}</span>
    </div>
  );
}
