import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { PersonaCard } from '../components/persona/PersonaCard';
import { usePersonas } from '../hooks/usePersonas';
import type { Persona } from '../types';

type FilterKey = 'all' | 'default' | 'custom';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'default', label: 'デフォルト' },
  { key: 'custom', label: 'カスタム' },
];

export function PersonaListPage() {
  const { personas, isLoading, deletePersona } = usePersonas();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  async function handleDuplicate(persona: Persona) {
    // Navigate to edit page for duplication (handled there)
    navigate(`/personas/${persona.personaId}/edit`);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div role="status" className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  const q = query.trim();
  const filtered = personas.filter((p) => {
    const matchQuery =
      !q ||
      p.displayName.includes(q) ||
      (p.occupation ?? '').includes(q) ||
      (p.freeText ?? '').includes(q);
    const matchFilter =
      filter === 'all' ||
      (filter === 'default' && (p.source === 'default' || p.source === 'preset')) ||
      (filter === 'custom' && p.source !== 'default' && p.source !== 'preset');
    return matchQuery && matchFilter;
  });

  return (
    <div className="flex flex-col" style={{ padding: '48px 128px', gap: 32 }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs text-text-lo" style={{ letterSpacing: 1.5 }}>
            PHASE 2 · PERSONAS
          </span>
          <div className="flex items-center gap-3">
            <h1 className="text-text-hi font-sans text-xl font-semibold" style={{ fontSize: 24 }}>ペルソナ管理</h1>
            <span
              className="text-text-mid font-mono text-xs"
              style={{ background: 'var(--color-raised)', borderRadius: 6, padding: '4px 8px' }}
            >
              {filtered.length}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2"
            style={{ width: 220, borderRadius: 10, background: 'var(--color-surface)', border: '1px solid var(--color-hairline)', padding: '8px 12px' }}
          >
            <Search size={15} className="text-text-lo flex-shrink-0" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ペルソナを検索"
              className="flex-1 bg-transparent text-text-hi font-sans text-sm outline-none"
            />
          </div>
          <Link
            to="/personas/new"
            className="flex items-center gap-2 text-text-hi font-sans text-sm font-semibold border border-hairline transition-colors hover:bg-raised"
            style={{ borderRadius: 6, padding: '8px 14px' }}
          >
            <Plus size={14} className="text-text-hi" />
            新規ペルソナ
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className="font-mono text-xs"
              style={{
                borderRadius: 999,
                padding: '8px 16px',
                background: active ? 'var(--color-raised)' : 'transparent',
                border: active ? '1px solid var(--color-hairline)' : '1px solid transparent',
                color: active ? 'var(--color-text-hi)' : 'var(--color-text-lo)',
                letterSpacing: 0.5,
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-text-lo font-sans text-sm">
            {query ? '該当するペルソナがありません' : 'ペルソナがありません'}
          </p>
          {!query && (
            <Link to="/personas/new" className="mt-3 text-accent font-sans text-sm font-medium">
              最初のペルソナを作成する
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {filtered.map((persona) => (
            <PersonaCard key={persona.personaId} persona={persona} onDelete={deletePersona} onDuplicate={handleDuplicate} />
          ))}
        </div>
      )}
    </div>
  );
}
