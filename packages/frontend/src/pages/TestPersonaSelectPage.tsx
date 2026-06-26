import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Check, ArrowLeft, ArrowRight, CheckCheck } from 'lucide-react';
import { usePersonas } from '../hooks/usePersonas';
import { testDraft } from '../lib/testDraft';
import { updateTest } from '../api/tests';
import { PERSONA_TYPE_LABELS } from '../types';
import { PersonaNode, getNodeColor } from '../components/persona/PersonaNode';

export function TestPersonaSelectPage() {
  const navigate = useNavigate();
  const { personas, isLoading } = usePersonas();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(testDraft.get().personaIds),
  );
  const [query, setQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div role="status" className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  const q = query.trim();
  const filtered = personas.filter((p) => {
    return !q || p.displayName.includes(q) || (p.occupation ?? '').includes(q);
  });

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(filtered.map((p) => p.personaId)));
  }

  async function handleNext() {
    const ids = Array.from(selectedIds);
    testDraft.setPersonaIds(ids);
    setIsSaving(true);
    try {
      const { resumeId } = testDraft.get();
      if (resumeId) await updateTest(resumeId, { personaIds: ids });
    } catch {
      // 保存失敗でも遷移は続行
    } finally {
      setIsSaving(false);
    }
    navigate('/tests/new/confirm');
  }

  return (
    <div className="flex flex-col gap-6" style={{ padding: 32 }}>
      {/* Header */}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-xs text-text-lo" style={{ letterSpacing: 1.5 }}>
          ペルソナ選択
        </span>
        <div className="flex items-center justify-between">
          <h1 className="text-text-hi font-sans font-semibold" style={{ fontSize: 24 }}>
            ペルソナを選択
          </h1>
          <span className="text-text-mid font-sans text-sm">
            このA/Bテストでレビューさせるペルソナを選びます
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-2"
          style={{ width: 280, borderRadius: 10, background: 'var(--color-surface)', border: '1px solid var(--color-hairline)', padding: '8px 12px' }}
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
        <div className="flex items-center gap-4">
          <span className="text-accent font-mono text-sm">
            {selectedIds.size} / {personas.length} 体
          </span>
          <button
            type="button"
            onClick={selectAll}
            className="flex items-center gap-2 text-text-mid font-sans text-sm transition-colors hover:text-text-hi"
            style={{ borderRadius: 10, border: '1px solid var(--color-hairline)', padding: '8px 14px' }}
          >
            <CheckCheck size={15} />
            全選択
          </button>
        </div>
      </div>

      {/* List */}
      {personas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-text-lo font-sans text-sm">
            ペルソナがありません。先にペルソナを作成してください。
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {filtered.map((persona) => {
            const checked = selectedIds.has(persona.personaId);
            const glowColor = getNodeColor(persona.personaId);
            const attrs = [
              PERSONA_TYPE_LABELS[persona.type],
              persona.age ? `${persona.age}歳` : null,
              persona.gender,
              persona.occupation,
            ].filter(Boolean).join(' · ');

            return (
              <button
                key={persona.personaId}
                type="button"
                onClick={() => toggle(persona.personaId)}
                className="flex items-center gap-3 w-full text-left transition-colors"
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: checked ? 'var(--color-accent-dim)' : 'transparent',
                }}
              >
                {/* Checkbox */}
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: checked ? 'var(--color-accent)' : 'transparent',
                    border: checked ? 'none' : '1.5px solid var(--color-text-lo)',
                  }}
                >
                  {checked && <Check size={12} color="#FFFFFF" />}
                </div>
                {/* Avatar */}
                <div
                  className="flex items-center justify-center flex-shrink-0 bg-raised"
                  style={{
                    width: 32, height: 32, borderRadius: 10,
                    boxShadow: checked ? `0 0 8px ${glowColor}40` : 'none',
                  }}
                >
                  <PersonaNode seed={persona.personaId} size={20} />
                </div>
                {/* Name + attrs */}
                <div className="flex flex-col flex-1 min-w-0" style={{ gap: 2 }}>
                  <span className="text-text-hi font-sans text-sm font-medium truncate">
                    {persona.displayName}
                  </span>
                  <span className="text-text-lo font-mono text-xs truncate">
                    {attrs}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between" style={{ borderTop: '1px solid var(--color-hairline)', paddingTop: 16 }}>
        <button
          type="button"
          onClick={() => navigate('/tests/new')}
          className="flex items-center gap-2 text-text-mid font-sans text-sm font-medium transition-colors hover:text-text-hi"
          style={{ borderRadius: 10, border: '1px solid var(--color-hairline)', padding: '10px 16px' }}
        >
          <ArrowLeft size={16} />
          戻る
        </button>
        <div className="flex items-center gap-4">
          <span className="text-text-lo font-mono text-sm">
            {selectedIds.size} / {personas.length} 体
          </span>
          <button
            type="button"
            disabled={selectedIds.size === 0 || isSaving}
            onClick={handleNext}
            className="flex items-center gap-2 text-white font-sans text-sm font-semibold transition-opacity disabled:opacity-40"
            style={{ borderRadius: 10, background: 'var(--color-accent)', padding: '10px 24px' }}
          >
            {isSaving ? '保存中...' : '確定して次へ'}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
