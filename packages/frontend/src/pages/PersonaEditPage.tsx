import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getPersona, createPersona, updatePersona, deletePersona, generateDraft } from '../api/personas';
import { PERSONA_TYPE_LABELS, type PersonaType } from '../types';

const PERSONA_TYPES = Object.entries(PERSONA_TYPE_LABELS) as [PersonaType, string][];

export function PersonaEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [displayName, setDisplayName] = useState('');
  const [type, setType] = useState<PersonaType>('consumer');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [occupation, setOccupation] = useState('');
  const [freeText, setFreeText] = useState('');

  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit) return;
    getPersona(id)
      .then((p) => {
        setDisplayName(p.displayName);
        setType(p.type);
        setAge(p.age?.toString() ?? '');
        setGender(p.gender ?? '');
        setOccupation(p.occupation ?? '');
        setFreeText(p.freeText ?? '');
      })
      .catch(() => setError('ペルソナの読み込みに失敗しました'))
      .finally(() => setIsLoading(false));
  }, [id, isEdit]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) {
      setValidationError('表示名は必須です');
      return;
    }
    setValidationError(null);
    setIsSaving(true);
    setError(null);

    const input = {
      displayName: displayName.trim(),
      type,
      age: age ? parseInt(age, 10) : undefined,
      gender: gender || undefined,
      occupation: occupation || undefined,
      freeText: freeText || undefined,
    };

    try {
      if (isEdit) {
        await updatePersona(id, input);
      } else {
        await createPersona(input);
      }
      navigate('/personas');
    } catch {
      setError('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGenerateDraft() {
    if (!isEdit) return;
    setIsGenerating(true);
    try {
      const draft = await generateDraft(id);
      setFreeText(draft.freeText);
    } catch {
      setError('AIアシストに失敗しました');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!window.confirm('このペルソナを削除しますか？')) return;
    try {
      await deletePersona(id);
      navigate('/personas');
    } catch {
      setError('削除に失敗しました');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div role="status" className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">{isEdit ? 'ペルソナ編集' : '新規ペルソナ作成'}</h1>

      {error && (
        <div role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
            表示名 <span className="text-red-500">*</span>
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {validationError && (
            <p className="mt-1 text-sm text-red-600">{validationError}</p>
          )}
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">タイプ</label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as PersonaType)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {PERSONA_TYPES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="age" className="block text-sm font-medium text-gray-700">年齢</label>
            <input
              id="age"
              type="number"
              min="1"
              max="120"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700">性別</label>
            <input
              id="gender"
              type="text"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="occupation" className="block text-sm font-medium text-gray-700">職業</label>
          <input
            id="occupation"
            type="text"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="freeText" className="block text-sm font-medium text-gray-700">自由記述</label>
            {isEdit && (
              <button
                type="button"
                onClick={handleGenerateDraft}
                disabled={isGenerating}
                className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
              >
                {isGenerating ? '生成中...' : 'AIアシスト'}
              </button>
            )}
          </div>
          <textarea
            id="freeText"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            rows={4}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              削除
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
