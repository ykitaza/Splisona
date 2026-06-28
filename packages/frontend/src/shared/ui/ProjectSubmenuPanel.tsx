import { useState } from 'react';
import { Search } from 'lucide-react';

type Props = {
  projects: { projectId: string; name: string }[];
  onSelect: (projectId: string) => void;
};

export function ProjectSubmenuPanel({ projects, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const filtered = query.trim()
    ? projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : projects;

  return (
    <>
      <div className="flex items-center" style={{ gap: 6, padding: '8px 12px', borderBottom: '1px solid #FFFFFF14' }}>
        <Search size={13} style={{ color: '#5B616B', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="プロジェクトを検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className="flex-1 bg-transparent font-sans text-sm"
          style={{ padding: 0, border: 'none', outline: 'none', boxShadow: 'none', color: '#E1E4EA', caretColor: '#6E78D9' }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {filtered.length > 0 ? filtered.map((p) => (
          <button
            key={p.projectId}
            type="button"
            onClick={() => onSelect(p.projectId)}
            className="flex items-center w-full px-4 py-2.5 font-sans text-sm transition-colors hover:bg-raised truncate"
            style={{ color: '#E1E4EA' }}
          >
            {p.name}
          </button>
        )) : (
          <span className="block px-4 py-2.5 font-sans text-sm text-text-lo">
            利用可能なプロジェクトがありません
          </span>
        )}
      </div>
    </>
  );
}
