import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Sparkles, Plus, Layers2, ChevronDown } from 'lucide-react';
import { PersonaCard } from '../components/persona/PersonaCard';
import { usePersonas } from '../hooks/usePersonas';
import type { PersonaType } from '../types';

const PERSONA_PRESETS: {
  displayName: string;
  type: PersonaType;
  age: number;
  gender: string;
  occupation: string;
  freeText: string;
}[] = [
  {
    displayName: 'ハルト',
    type: 'action_oriented',
    age: 32,
    gender: '男性',
    occupation: '営業職',
    freeText: '常に時間に追われており、3秒で要点が伝わらないUIは離脱する。最短手数でゴールに到達したい。',
  },
  {
    displayName: 'ミサキ',
    type: 'cautious',
    age: 41,
    gender: '女性',
    occupation: '専業主婦',
    freeText: '慎重にリスクを確認してから行動する。信頼できる情報源を重視し、衝動買いはしない。',
  },
  {
    displayName: 'ソウタ',
    type: 'info_savvy',
    age: 20,
    gender: '男性',
    occupation: '大学生',
    freeText: 'デジタルネイティブで新しい技術への順応が早い。SNSで情報収集し、UXの細部に気づく。',
  },
  {
    displayName: 'アヤ',
    type: 'efficiency',
    age: 45,
    gender: '女性',
    occupation: '管理職',
    freeText: '効率と合理性を最重視する。無駄なステップは即座にスキップし、ROIで判断する。',
  },
  {
    displayName: 'ユウト',
    type: 'cost_conscious',
    age: 26,
    gender: '男性',
    occupation: '会社員',
    freeText: 'コストパフォーマンスを徹底的に比較してから購入を決定する。レビューサイトを必ず確認する。',
  },
  {
    displayName: 'リナ',
    type: 'trend_sensitive',
    age: 21,
    gender: '女性',
    occupation: '大学生',
    freeText: 'トレンドに敏感で、おしゃれなUIデザインに強く引かれる。SNS映えを重視して選択する。',
  },
];

export function PersonaListPage() {
  const { personas, isLoading, createPersona, deletePersona } = usePersonas();
  const [query, setQuery] = useState('');
  const [presetOpen, setPresetOpen] = useState(false);
  const [addingPreset, setAddingPreset] = useState<string | null>(null);
  const presetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!presetOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (presetRef.current && !presetRef.current.contains(e.target as Node)) {
        setPresetOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [presetOpen]);

  async function handleAddPreset(preset: typeof PERSONA_PRESETS[number]) {
    setAddingPreset(preset.displayName);
    try {
      await createPersona({ ...preset, source: 'preset' });
    } finally {
      setAddingPreset(null);
      setPresetOpen(false);
    }
  }

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
          {/* AI一括生成: 近日公開 */}
          <div className="relative flex items-center gap-1.5 rounded-md px-4 py-2.5" style={{ background: '#F7F7F8', border: '1px solid #E6E6E8', borderRadius: 6, cursor: 'not-allowed' }}>
            <Sparkles size={16} color="#C0C0C5" />
            <span style={{ color: '#C0C0C5', fontFamily: 'Geist, sans-serif', fontSize: 14, fontWeight: 500 }}>AI一括生成</span>
            <span className="rounded-full px-1.5 py-0.5" style={{ background: '#E6E6E8', color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 10, fontWeight: 600 }}>近日公開</span>
          </div>

          {/* プリセットから追加 */}
          <div className="relative" ref={presetRef}>
            <button
              type="button"
              onClick={() => setPresetOpen((o) => !o)}
              className="flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[#F0ECF9]"
              style={{ background: '#FFFFFF', border: '1px solid #C4B5FD', borderRadius: 6, color: '#7C3AED', fontFamily: 'Geist, sans-serif' }}
            >
              <Layers2 size={16} color="#7C3AED" />
              プリセットから追加
              <ChevronDown size={14} color="#7C3AED" />
            </button>

            {presetOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-50 rounded-md overflow-hidden"
                style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', minWidth: 260 }}
              >
                <div className="px-4 py-2.5" style={{ borderBottom: '1px solid #F0F1F3' }}>
                  <span style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.5px' }}>
                    確定ペルソナ 6人
                  </span>
                </div>
                {PERSONA_PRESETS.map((preset) => (
                  <button
                    key={preset.displayName}
                    type="button"
                    onClick={() => handleAddPreset(preset)}
                    disabled={!!addingPreset}
                    className="w-full text-left px-4 py-3 transition-colors hover:bg-[#F7F7F8] disabled:opacity-50"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'block', borderBottom: '1px solid #F7F7F8' }}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 13, fontWeight: 600 }}>
                        {addingPreset === preset.displayName ? '追加中…' : preset.displayName}
                      </span>
                      <span style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 11 }}>
                        {preset.age}歳・{preset.gender}
                      </span>
                    </div>
                    <span style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 11 }}>
                      {preset.occupation}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

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
          style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 6, width: 300 }}
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
            <Link to="/personas/new" className="mt-3 text-sm font-medium" style={{ color: '#3B7DD8' }}>
              最初のペルソナを作成する
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {rows.map((row, ri) => (
            <div key={ri} className="flex gap-5">
              {row.map((persona) => (
                <div key={persona.personaId} style={{ flex: '1 1 0', minWidth: 0, display: 'flex' }}>
                  <PersonaCard persona={persona} onDelete={deletePersona} />
                </div>
              ))}
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
