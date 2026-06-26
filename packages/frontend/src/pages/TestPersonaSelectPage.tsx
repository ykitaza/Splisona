import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CheckCheck, Sparkles, PencilLine, Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { usePersonas } from '../hooks/usePersonas';
import { testDraft } from '../lib/testDraft';
import { updateTest } from '../api/tests';
import { PERSONA_TYPE_LABELS } from '../types';
import { Stepper } from '../components/Stepper';

const AVATAR_COLORS = [
  { bg: '#E8F0FB', text: '#3B7DD8' },
  { bg: '#FBF0E4', text: '#E0883A' },
  { bg: '#E6F4EC', text: '#2E9E5B' },
  { bg: '#F0F1F3', text: '#666666' },
];

function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

export function TestPersonaSelectPage() {
  const navigate = useNavigate();
  const { personas, isLoading } = usePersonas();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(testDraft.get().personaIds),
  );
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
          (p.occupation ?? '').includes(query),
      )
    : personas;

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

  const [isSaving, setIsSaving] = useState(false);

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
    <div className="flex flex-col gap-5 p-8 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 28, fontWeight: 600 }}>
          ペルソナを選択
        </h1>
        <p style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 14 }}>
          このA/Bテストでレビューさせるペルソナを選びます
        </p>
      </div>

      <Stepper
        steps={[
          { label: '比較対象', state: 'done' },
          { label: 'ペルソナ選択', state: 'active' },
          { label: '確認', state: 'pending' },
        ]}
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Search */}
          <div
            className="flex items-center gap-2 rounded-md px-3 py-2.5"
            style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 6, width: 280 }}
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
          {/* Filter chips */}
          <button
            type="button"
            className="rounded-full px-3.5 py-2 text-sm font-medium"
            style={{ background: '#0A0A0A', color: '#FFFFFF', borderRadius: 9999, border: '1px solid #0A0A0A' }}
          >
            すべて
          </button>
          <button
            type="button"
            className="rounded-full px-3.5 py-2 text-sm"
            style={{ background: '#FFFFFF', color: '#666666', borderRadius: 9999, border: '1px solid #E6E6E8' }}
          >
            AI生成
          </button>
          <button
            type="button"
            className="rounded-full px-3.5 py-2 text-sm"
            style={{ background: '#FFFFFF', color: '#666666', borderRadius: 9999, border: '1px solid #E6E6E8' }}
          >
            手動作成
          </button>
        </div>
        <div className="flex items-center gap-3.5">
          <span style={{ color: '#3B7DD8', fontFamily: 'Geist, sans-serif', fontSize: 13, fontWeight: 500 }}>
            {selectedIds.size}人を選択中 / 全{personas.length}人
          </span>
          <button
            type="button"
            onClick={selectAll}
            className="flex items-center gap-1.5 rounded-md px-3 py-2"
            style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 6, color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 13, fontWeight: 500 }}
          >
            <CheckCheck size={15} color="#1A1A1A" />
            全選択
          </button>
        </div>
      </div>

      {/* List */}
      {personas.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-md"
          style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 10 }}
        >
          <p style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 14 }}>
            ペルソナがありません。先にペルソナを作成してください。
          </p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-md"
          style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 10 }}
        >
          {filtered.map((persona, i) => {
            const checked = selectedIds.has(persona.personaId);
            const color = getAvatarColor(persona.displayName);
            const isAI = !!persona.freeText;
            return (
              <button
                key={persona.personaId}
                type="button"
                onClick={() => toggle(persona.personaId)}
                className="flex items-center gap-3.5 w-full text-left transition-colors"
                style={{
                  padding: '12px 16px',
                  borderTop: i > 0 ? '1px solid #E6E6E8' : 'none',
                  background: checked ? '#E8F0FB' : '#FFFFFF',
                }}
              >
                {/* Checkbox */}
                <div
                  className="flex items-center justify-center rounded-md flex-shrink-0"
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: checked ? '#3B7DD8' : '#FFFFFF',
                    border: checked ? '1px solid #3B7DD8' : '1.5px solid #D4D4D8',
                  }}
                >
                  {checked && <Check size={12} color="#FFFFFF" />}
                </div>
                {/* Avatar */}
                <div
                  className="flex items-center justify-center rounded-full flex-shrink-0"
                  style={{ width: 32, height: 32, background: color.bg, borderRadius: 9999 }}
                >
                  <span style={{ color: color.text, fontFamily: 'Geist, sans-serif', fontSize: 12, fontWeight: 600 }}>
                    {persona.displayName.charAt(0)}
                  </span>
                </div>
                {/* Name + attrs */}
                <div className="flex flex-col flex-1" style={{ gap: 2 }}>
                  <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 14, fontWeight: 500 }}>
                    {persona.displayName}
                  </span>
                  <span style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 12 }}>
                    {PERSONA_TYPE_LABELS[persona.type]}
                    {persona.age ? ` ・ ${persona.age}歳` : ''}
                    {persona.gender ? `・${persona.gender}` : ''}
                    {persona.occupation ? ` ・ ${persona.occupation}` : ''}
                  </span>
                </div>
                {/* Badge */}
                <div
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 flex-shrink-0"
                  style={{ background: isAI ? '#E8F0FB' : '#F0F1F3', borderRadius: 9999 }}
                >
                  {isAI ? (
                    <Sparkles size={11} color="#3B7DD8" />
                  ) : (
                    <PencilLine size={11} color="#666666" />
                  )}
                  <span style={{ color: isAI ? '#3B7DD8' : '#666666', fontFamily: 'Geist, sans-serif', fontSize: 11, fontWeight: 500 }}>
                    {isAI ? 'AI生成' : '手動作成'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => navigate('/tests/new')}
          className="flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium"
          style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 6, color: '#1A1A1A' }}
        >
          <ArrowLeft size={16} color="#1A1A1A" />
          戻る
        </button>
        <button
          type="button"
          disabled={selectedIds.size === 0 || isSaving}
          onClick={handleNext}
          className="flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ background: '#0A0A0A', borderRadius: 6 }}
        >
          {isSaving ? '保存中...' : '次へ: 確認'}
          <ArrowRight size={16} color="#FFFFFF" />
        </button>
      </div>
    </div>
  );
}
