import { Link } from 'react-router-dom';
import { usePersonas } from '../hooks/usePersonas';
import { Search, Sparkles, Plus } from 'lucide-react';
import { PersonaCard } from '../components/persona/PersonaCard';
import { useState } from 'react';

export function PersonaListPage() {
  const { personas, isLoading } = usePersonas();
  const [query, setQuery] = useState('');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div role="status" className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  const filtered = query.trim()
    ? personas.filter(
        (p) =>
          p.displayName.includes(query) ||
          (p.occupation ?? '').includes(query) ||
          (p.freeText ?? '').includes(query),
      )
    : personas;

  // chunk into rows of 3
  const rows: (typeof filtered)[] = [];
  for (let i = 0; i < filtered.length; i += 3) rows.push(filtered.slice(i, i + 3));

  return (
    <div className="flex flex-col gap-6 p-8 pb-10">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 28, fontWeight: 600 }}>
            ペルソナ
          </h1>
          <p style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 14 }}>
            評価に使うAIペルソナを作成・管理します
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E6E6E8',
              borderRadius: 6,
              color: '#1A1A1A',
              fontFamily: 'Geist, sans-serif',
            }}
          >
            <Sparkles size={16} color="#1A1A1A" />
            AI一括生成
          </button>
          <Link
            to="/personas/new"
            className="flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
            style={{ background: '#0A0A0A', borderRadius: 6 }}
            aria-label="ペルソナを作成"
          >
            <Plus size={16} color="#FFFFFF" />
            ペルソナを作成
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-2 rounded-md px-3 py-2.5"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E6E6E8',
            borderRadius: 6,
            width: 300,
          }}
        >
          <Search size={16} color="#9A9A9F" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ペルソナを検索"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 14 }}
          />
        </div>
        <span style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>
          {filtered.length}人のペルソナ
        </span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 14 }}>
            {query ? '該当するペルソナがありません' : 'ペルソナがありません'}
          </p>
          {!query && (
            <Link
              to="/personas/new"
              className="mt-3 text-sm font-medium"
              style={{ color: '#3B7DD8' }}
            >
              最初のペルソナを作成する
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {rows.map((row, ri) => (
            <div key={ri} className="flex gap-5">
              {row.map((persona) => (
                <div key={persona.personaId} style={{ flex: '1 1 0', minWidth: 0 }}>
                  <PersonaCard persona={persona} isAiGenerated={!!persona.freeText} />
                </div>
              ))}
              {/* fill empty slots */}
              {row.length < 3 &&
                Array.from({ length: 3 - row.length }).map((_, i) => (
                  <div key={`empty-${i}`} style={{ flex: '1 1 0' }} />
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
