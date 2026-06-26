import { Link } from 'react-router-dom';
import { Sparkles, PencilLine, MoreHorizontal } from 'lucide-react';
import type { Persona } from '../../types';

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
  isAiGenerated?: boolean;
}

export function PersonaCard({ persona, isAiGenerated }: Props) {
  const color = getAvatarColor(persona.displayName);

  return (
    <div
      className="flex flex-col gap-4 rounded-md p-5"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E6E6E8',
        borderRadius: 10,
        width: '100%',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{ width: 44, height: 44, background: color.bg, borderRadius: 9999 }}
        >
          <span style={{ color: color.text, fontFamily: 'Geist, sans-serif', fontSize: 15, fontWeight: 600 }}>
            {initials(persona.displayName)}
          </span>
        </div>

        {/* Name col */}
        <div className="flex flex-col flex-1" style={{ gap: 5 }}>
          <Link
            to={`/personas/${persona.personaId}`}
            className="font-semibold hover:underline"
            style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 15, fontWeight: 600 }}
          >
            {persona.displayName}
          </Link>
          {persona.occupation && (
            <span style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 12 }}>
              {persona.occupation}
            </span>
          )}
          {/* Badge */}
          <div
            className="flex items-center gap-1 self-start rounded-full px-2 py-0.5"
            style={{
              background: isAiGenerated ? '#E8F0FB' : '#F0F1F3',
              borderRadius: 9999,
            }}
          >
            {isAiGenerated ? (
              <Sparkles size={11} color="#3B7DD8" />
            ) : (
              <PencilLine size={11} color="#666666" />
            )}
            <span
              style={{
                color: isAiGenerated ? '#3B7DD8' : '#666666',
                fontFamily: 'Geist, sans-serif',
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              {isAiGenerated ? 'AI生成' : '手動作成'}
            </span>
          </div>
        </div>

        <MoreHorizontal size={18} color="#9A9A9F" />
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

      {/* Free text */}
      {persona.freeText && (
        <div
          className="pt-3.5"
          style={{ borderTop: '1px solid #E6E6E8' }}
        >
          <p
            style={{
              color: '#666666',
              fontFamily: 'Geist, sans-serif',
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
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
