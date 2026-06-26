import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronLeft, Check, Sparkles } from 'lucide-react';
import { getPersona, createPersona, updatePersona, deletePersona, generateDraft } from '../api/personas';
import { getApiErrorMessage } from '../api/client';
import { PERSONA_TYPE_LABELS, type PersonaType, type Persona } from '../types';
import { PersonaCard } from '../components/persona/PersonaCard';

const PERSONA_TYPES = Object.entries(PERSONA_TYPE_LABELS) as [PersonaType, string][];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium" style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>
      {children}
    </label>
  );
}

function TextInput({ id, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { id: string }) {
  return (
    <input
      id={id}
      {...props}
      className="block w-full rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3B7DD8]"
      style={{ border: '1px solid #E6E6E8', borderRadius: 6, fontFamily: 'Geist, sans-serif', fontSize: 14 }}
    />
  );
}

export function PersonaEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [displayName, setDisplayName] = useState('');
  const [type, setType] = useState<PersonaType>('consumer');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [occupation, setOccupation] = useState('');
  const [deviationScore, setDeviationScore] = useState('');
  const [annualIncome, setAnnualIncome] = useState('');
  const [education, setEducation] = useState('');
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
        setDeviationScore(p.deviationScore?.toString() ?? '');
        setAnnualIncome(p.annualIncome?.toString() ?? '');
        setEducation(p.education ?? '');
        setFreeText(p.freeText ?? '');
      })
      .catch(() => setError('ペルソナの読み込みに失敗しました'))
      .finally(() => setIsLoading(false));
  }, [id, isEdit]);

  const previewPersona: Persona = {
    personaId: id ?? 'preview',
    userId: '',
    displayName: displayName || '（名前未入力）',
    type,
    age: age ? parseInt(age, 10) : undefined,
    gender: gender || undefined,
    occupation: occupation || undefined,
    deviationScore: deviationScore ? parseInt(deviationScore, 10) : undefined,
    annualIncome: annualIncome ? parseInt(annualIncome, 10) : undefined,
    education: education || undefined,
    freeText: freeText || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

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
      deviationScore: deviationScore ? parseInt(deviationScore, 10) : undefined,
      annualIncome: annualIncome ? parseInt(annualIncome, 10) : undefined,
      education: education || undefined,
      freeText: freeText || undefined,
    };

    try {
      if (isEdit) {
        await updatePersona(id, input);
      } else {
        await createPersona(input);
      }
      navigate('/personas');
    } catch (err) {
      setError(getApiErrorMessage(err));
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
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div role="status" className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-5 p-8 pb-10">
        {/* Page Header */}
        <div className="flex flex-col gap-1.5">
          <Link
            to="/personas"
            className="flex items-center gap-1"
            style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 12 }}
          >
            <ChevronLeft size={14} color="#9A9A9F" />
            ペルソナ一覧
          </Link>
          <h1 style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 28, fontWeight: 600 }}>
            {isEdit ? 'ペルソナを編集' : '新規ペルソナ作成'}
          </h1>
        </div>

        {error && (
          <div role="alert" className="rounded-md px-4 py-3 text-sm" style={{ background: '#FDEAEA', color: '#D64545', borderRadius: 6 }}>
            {error}
          </div>
        )}

        {/* Content Row */}
        <div className="flex gap-6">
          {/* Form Col */}
          <div className="flex flex-col gap-5" style={{ width: 680 }}>
            {/* Basic Card */}
            <div className="flex flex-col gap-4 rounded-md p-5" style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 10 }}>
              <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 15, fontWeight: 600 }}>基本情報</span>

              <div className="flex flex-col gap-1.5">
                <FieldLabel>ペルソナ名 <span style={{ color: '#D64545' }}>*</span></FieldLabel>
                <TextInput
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="例: せっかちなビジネスマン"
                />
                {validationError && (
                  <p className="text-xs" style={{ color: '#D64545' }}>{validationError}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <FieldLabel>タイプ</FieldLabel>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as PersonaType)}
                  className="block w-full rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3B7DD8]"
                  style={{ border: '1px solid #E6E6E8', borderRadius: 6, fontFamily: 'Geist, sans-serif', fontSize: 14 }}
                >
                  {PERSONA_TYPES.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Attrs Card */}
            <div className="flex flex-col gap-5 rounded-md p-5" style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 10 }}>
              <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 15, fontWeight: 600 }}>属性（任意）</span>

              {/* 年齢 スライダー */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <FieldLabel>年齢</FieldLabel>
                  {age && (
                    <span style={{ color: '#3B7DD8', fontFamily: 'Geist, sans-serif', fontSize: 13, fontWeight: 600 }}>
                      {age}歳
                    </span>
                  )}
                </div>
                <input
                  id="age"
                  type="range"
                  min="18"
                  max="80"
                  step="1"
                  value={age || 30}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full"
                  style={{ accentColor: '#3B7DD8', cursor: 'pointer' }}
                />
              </div>

              {/* 性別 セグメント */}
              <div className="flex flex-col gap-2">
                <FieldLabel>性別</FieldLabel>
                <div className="flex gap-1.5">
                  {['男性', '女性', 'その他', '指定なし'].map((g) => {
                    const val = g === '指定なし' ? '' : g;
                    const selected = gender === val;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(val)}
                        className="flex-1 rounded-md py-2 text-sm transition-colors"
                        style={{
                          border: `1px solid ${selected ? '#3B7DD8' : '#E6E6E8'}`,
                          background: selected ? '#E8F0FB' : '#FFFFFF',
                          color: selected ? '#3B7DD8' : '#666666',
                          fontFamily: 'Geist, sans-serif',
                          fontSize: 13,
                          fontWeight: selected ? 600 : 400,
                          cursor: 'pointer',
                          borderRadius: 6,
                        }}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 偏差値 スライダー */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <FieldLabel>偏差値</FieldLabel>
                  {deviationScore && (
                    <span style={{ color: '#3B7DD8', fontFamily: 'Geist, sans-serif', fontSize: 13, fontWeight: 600 }}>
                      {deviationScore}
                    </span>
                  )}
                </div>
                <input
                  id="deviationScore"
                  type="range"
                  min="30"
                  max="80"
                  step="1"
                  value={deviationScore || 50}
                  onChange={(e) => setDeviationScore(e.target.value)}
                  className="w-full"
                  style={{ accentColor: '#3B7DD8', cursor: 'pointer' }}
                />
              </div>

              {/* 年収 / 学歴 / 職業 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>年収</FieldLabel>
                  <select
                    id="annualIncome"
                    value={annualIncome}
                    onChange={(e) => setAnnualIncome(e.target.value)}
                    className="block w-full rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3B7DD8]"
                    style={{ border: '1px solid #E6E6E8', borderRadius: 6, fontFamily: 'Geist, sans-serif', fontSize: 13, color: annualIncome ? '#1A1A1A' : '#9A9A9F' }}
                  >
                    <option value="">選択</option>
                    {[200, 300, 400, 500, 600, 700, 800, 900, 1000, 1200, 1500, 2000].map((v) => (
                      <option key={v} value={v}>{v}万円</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>学歴</FieldLabel>
                  <select
                    id="education"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    className="block w-full rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3B7DD8]"
                    style={{ border: '1px solid #E6E6E8', borderRadius: 6, fontFamily: 'Geist, sans-serif', fontSize: 13, color: education ? '#1A1A1A' : '#9A9A9F' }}
                  >
                    <option value="">選択</option>
                    {['中卒', '高卒', '専門卒', '短大卒', '大卒', '院卒'].map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>職業</FieldLabel>
                  <TextInput
                    id="occupation"
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="営業職"
                  />
                </div>
              </div>
            </div>

            {/* Free text Card */}
            <div className="flex flex-col gap-2 rounded-md p-5" style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 10 }}>
              <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 15, fontWeight: 600 }}>自由記述（性格・行動特性）</span>
              <textarea
                id="freeText"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                rows={5}
                placeholder="このペルソナの性格や行動特性を記述してください"
                className="block w-full rounded-md px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#3B7DD8] resize-none"
                style={{ border: '1px solid #E6E6E8', borderRadius: 6, fontFamily: 'Geist, sans-serif', fontSize: 14, lineHeight: 1.6 }}
              />
            </div>
          </div>

          {/* Side Col */}
          <div className="flex flex-col gap-5 flex-1">
            {/* AI Assist */}
            <div
              className="flex flex-col gap-3 rounded-md p-5"
              style={{ background: '#E8F0FB', borderRadius: 10 }}
            >
              <div className="flex items-center gap-2">
                <Sparkles size={16} color="#3B7DD8" />
                <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 14, fontWeight: 600 }}>
                  AIアシスト
                </span>
              </div>
              <p style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 13, lineHeight: 1.5 }}>
                入力した属性をもとに、人物像と自由記述を自動で下書きします。
              </p>
              <button
                type="button"
                onClick={handleGenerateDraft}
                disabled={!isEdit || isGenerating}
                className="flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                style={{ background: '#3B7DD8', borderRadius: 6 }}
              >
                <Sparkles size={14} color="#FFFFFF" />
                {isGenerating ? '生成中...' : 'AIで下書きを生成'}
              </button>
              {!isEdit && (
                <p className="text-xs text-center" style={{ color: '#9A9A9F' }}>
                  ※ 保存後に使用できます
                </p>
              )}
            </div>

            {/* Preview */}
            <div className="flex flex-col gap-2.5">
              <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: '0.5px' }}>
                プレビュー
              </span>
              <PersonaCard persona={previewPersona} isAiGenerated={!!freeText} />
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-md px-4 py-2.5 text-sm font-medium transition-colors hover:bg-red-50"
                style={{ border: '1px solid #D64545', color: '#D64545', borderRadius: 6 }}
              >
                削除
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/personas')}
              className="rounded-md px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
              style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 6, color: '#666666' }}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: '#0A0A0A', borderRadius: 6 }}
            >
              <Check size={16} color="#FFFFFF" />
              {isSaving ? '保存中...' : '保存する'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
