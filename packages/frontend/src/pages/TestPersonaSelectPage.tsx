import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePersonas } from '../hooks/usePersonas';
import { testDraft } from '../lib/testDraft';
import { PERSONA_TYPE_LABELS } from '../types';

export function TestPersonaSelectPage() {
  const navigate = useNavigate();
  const { personas, isLoading } = usePersonas();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(testDraft.get().personaIds)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div role="status" className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleNext() {
    testDraft.setPersonaIds(Array.from(selectedIds));
    navigate('/tests/new/confirm');
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">テスト作成 — ペルソナ選択</h1>
      <p className="text-sm text-gray-500 mb-6">{selectedIds.size}件選択中</p>

      {personas.length === 0 ? (
        <p className="text-gray-500">ペルソナがありません。先にペルソナを作成してください。</p>
      ) : (
        <ul className="space-y-2 mb-8">
          {personas.map((persona) => {
            const checked = selectedIds.has(persona.personaId);
            return (
              <li key={persona.personaId}>
                <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    aria-label={persona.displayName}
                    checked={checked}
                    onChange={() => toggle(persona.personaId)}
                    className="h-4 w-4 rounded text-indigo-600"
                  />
                  <span className="font-medium text-gray-900">{persona.displayName}</span>
                  <span className="text-sm text-gray-500">{PERSONA_TYPE_LABELS[persona.type]}</span>
                  {persona.age && (
                    <span className="text-xs text-gray-400 ml-auto">{persona.age}歳</span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => navigate('/tests/new')}
          className="rounded-md border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          戻る
        </button>
        <button
          type="button"
          disabled={selectedIds.size === 0}
          onClick={handleNext}
          className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          次へ
        </button>
      </div>
    </div>
  );
}
