import { Link } from 'react-router-dom';
import { usePersonas } from '../hooks/usePersonas';
import { PERSONA_TYPE_LABELS } from '../types';

export function PersonaListPage() {
  const { personas, isLoading } = usePersonas();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div role="status" className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">ペルソナ一覧</h1>
        <Link
          to="/personas/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          aria-label="ペルソナを作成"
        >
          + ペルソナを作成
        </Link>
      </div>

      {personas.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">ペルソナがありません</p>
          <Link
            to="/personas/new"
            className="text-indigo-600 font-medium hover:underline"
            aria-label="ペルソナを作成"
          >
            最初のペルソナを作成する
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {personas.map((persona) => (
            <Link
              key={persona.personaId}
              to={`/personas/${persona.personaId}/edit`}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <p className="font-semibold text-gray-900 text-lg">{persona.displayName}</p>
              <p className="text-sm text-gray-500 mt-0.5">{PERSONA_TYPE_LABELS[persona.type]}</p>
              {persona.occupation && (
                <p className="text-sm text-gray-600 mt-1">{persona.occupation}</p>
              )}
              {persona.age && (
                <p className="text-xs text-gray-400 mt-1">{persona.age}歳{persona.gender ? ` / ${persona.gender}` : ''}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
