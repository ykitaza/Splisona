import { useState, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, Camera, X, Trash2 } from 'lucide-react';
import { createPersona, generateDraft, uploadPersonaAvatar, updatePersona, getAvatarUrl } from './api';
import { getApiErrorMessage } from '@/shared/api/client';
import { PERSONA_TYPE_LABELS, PERSONA_TYPE_DESCRIPTIONS, type PersonaType } from './types';
import { PersonaNode, getNodeColor } from './PersonaNode';
import { FieldSelect } from '@/shared/ui/FieldSelect';
import { HelpDot } from '@/shared/ui/HelpDot';

const PERSONA_TYPES = Object.entries(PERSONA_TYPE_LABELS) as [PersonaType, string][];

export function PersonaEditPage() {
  const navigate = useNavigate();

  const [personaId, setPersonaId] = useState<string | undefined>(undefined);
  const [displayName, setDisplayName] = useState('');
  const [type, setType] = useState<PersonaType>('action_oriented');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [occupation, setOccupation] = useState('');
  const [deviationScore, setDeviationScore] = useState('');
  const [annualIncome, setAnnualIncome] = useState('');
  const [education, setEducation] = useState('');
  const [freeText, setFreeText] = useState('');
  const [avatarImageKey, setAvatarImageKey] = useState<string | undefined>(undefined);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ensureSaved(): Promise<string> {
    if (!displayName.trim()) {
      setValidationError('表示名は必須です');
      throw new Error('displayName required');
    }
    setValidationError(null);
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
    if (personaId) {
      await updatePersona(personaId, input);
      return personaId;
    }
    const created = await createPersona(input);
    setPersonaId(created.personaId);
    return created.personaId;
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const pid = await ensureSaved();
      const key = await uploadPersonaAvatar(pid, file);
      await updatePersona(pid, { avatarImageKey: key });
      setAvatarImageKey(key);
    } catch {
      setError('アバターのアップロードに失敗しました');
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) {
      setValidationError('表示名は必須です');
      return;
    }
    setValidationError(null);
    setIsSaving(true);
    setError(null);
    try {
      await ensureSaved();
      navigate('/personas');
    } catch (err) {
      if (err instanceof Error && err.message !== 'displayName required') {
        setError(getApiErrorMessage(err));
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGenerateDraft() {
    setIsGenerating(true);
    try {
      const pid = await ensureSaved();
      const draft = await generateDraft(pid);
      setFreeText(draft.freeText);
    } catch (err) {
      if (err instanceof Error && err.message !== 'displayName required') {
        setError('AIアシストに失敗しました');
      }
    } finally {
      setIsGenerating(false);
    }
  }

  const glowColor = getNodeColor(personaId ?? 'preview');

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col" style={{ width: '100%', maxWidth: 864, margin: '0 auto', padding: '48px 24px', gap: 32 }}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs text-text-lo" style={{ letterSpacing: 1.5 }}>
              新規ペルソナ
            </span>
            <h1 className="text-text-hi font-sans font-semibold" style={{ fontSize: 24 }}>
              ペルソナを作成
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate('/personas')}
            className="flex items-center justify-center rounded-md hover:bg-raised transition-colors"
            style={{ width: 32, height: 32 }}
            aria-label="閉じる"
          >
            <X size={18} className="text-text-lo" />
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-md px-4 py-3 text-sm bg-danger-dim text-danger" style={{ borderRadius: 10 }}>
            {error}
          </div>
        )}

        <div className="flex" style={{ gap: 48 }}>
          {/* Form */}
          <div className="flex flex-col flex-1" style={{ gap: 32 }}>
            {/* Avatar + Name */}
            <div className="flex items-center gap-5">
              <div className="relative flex-shrink-0">
                <div
                  className="flex items-center justify-center bg-raised"
                  style={{
                    width: 64, height: 64, borderRadius: 16,
                    border: '1px solid #FFFFFF1F',
                    boxShadow: `0 0 12px ${glowColor}40`,
                    overflow: 'hidden',
                  }}
                >
                  {avatarImageKey ? (
                    <img src={getAvatarUrl(avatarImageKey)} alt="アバター" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <PersonaNode seed={personaId ?? 'preview'} size={38} />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full transition-opacity disabled:opacity-50 bg-accent"
                  style={{ width: 22, height: 22, border: '2px solid var(--color-base)' }}
                >
                  <Camera size={10} color="#FFFFFF" />
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-text-mid font-sans text-sm">表示名</span>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="例: せっかちなビジネスマン"
                  className="bg-transparent text-text-hi font-sans text-base border-b border-hairline pb-2 outline-none focus:border-accent"
                  aria-label="表示名"
                />
                {validationError && (
                  <p className="text-danger text-xs">{validationError}</p>
                )}
              </div>
            </div>

            {/* Section: 基本情報 */}
            <div className="flex flex-col" style={{ gap: 16 }}>
              <span className="font-mono text-xs text-text-lo" style={{ letterSpacing: 0.5 }}>基本情報</span>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-text-mid font-sans text-sm">タイプ</span>
                  <HelpDot
                    title={(PERSONA_TYPE_LABELS as Record<string, string>)[type] ?? type}
                    content={(PERSONA_TYPE_DESCRIPTIONS as Record<string, string>)[type] ?? ''}
                  />
                </div>
                <FieldSelect
                  id="type"
                  value={type}
                  onChange={(v) => setType(v as PersonaType)}
                  options={PERSONA_TYPES.map(([value, label]) => ({ value, label }))}
                />
              </div>
            </div>

            {/* Section: 属性 */}
            <div className="flex flex-col" style={{ gap: 16 }}>
              <span className="font-mono text-xs text-text-lo" style={{ letterSpacing: 0.5 }}>属性</span>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-text-mid font-sans text-sm">年齢</span>
                  {age && <span className="text-accent font-mono text-sm">{age}歳</span>}
                </div>
                <input
                  id="age"
                  type="range"
                  min="18"
                  max="80"
                  step="1"
                  value={age !== '' ? Number(age) : 18}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full"
                  style={{ accentColor: 'var(--color-accent)' }}
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-text-mid font-sans text-sm">性別</span>
                <div className="flex gap-2">
                  {['男性', '女性', 'その他', '指定なし'].map((g) => {
                    const val = g === '指定なし' ? '' : g;
                    const selected = gender === val;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(val)}
                        className="flex-1 font-sans text-sm transition-colors"
                        style={{
                          borderRadius: 10,
                          padding: '8px 0',
                          border: selected ? '1px solid var(--color-accent)' : '1px solid var(--color-hairline)',
                          background: selected ? 'var(--color-accent-dim)' : 'transparent',
                          color: selected ? 'var(--color-accent)' : 'var(--color-text-lo)',
                          fontWeight: selected ? 600 : 400,
                        }}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-text-mid font-sans text-sm">職業</span>
                <input
                  id="occupation"
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="営業職"
                  className="bg-transparent text-text-hi font-sans text-base border-b border-hairline pb-2 outline-none focus:border-accent"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-text-mid font-sans text-sm">年収</span>
                <FieldSelect
                  id="annualIncome"
                  value={annualIncome}
                  onChange={setAnnualIncome}
                  placeholder="選択"
                  options={[200, 300, 400, 500, 600, 700, 800, 900, 1000, 1200, 1500, 2000].map((v) => ({ value: String(v), label: `${v}万円` }))}
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-text-mid font-sans text-sm">学歴</span>
                <FieldSelect
                  id="education"
                  value={education}
                  onChange={setEducation}
                  placeholder="選択"
                  options={['中卒', '高卒', '専門卒', '短大卒', '大卒', '院卒'].map((v) => ({ value: v, label: v }))}
                />
              </div>
            </div>

            {/* Section: 自由記述 */}
            <div className="flex flex-col" style={{ gap: 16 }}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-text-lo" style={{ letterSpacing: 0.5 }}>自由記述</span>
                <button
                  type="button"
                  onClick={handleGenerateDraft}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 text-accent font-sans text-xs font-medium transition-opacity disabled:opacity-50"
                >
                  <Sparkles size={13} />
                  {isGenerating ? '生成中...' : 'AIで下書き'}
                </button>
              </div>
              <textarea
                id="freeText"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                rows={5}
                placeholder="このペルソナの性格や行動特性を記述してください"
                className="bg-transparent text-text-hi font-sans text-base border-b border-hairline pb-2 outline-none focus:border-accent resize-none"
                style={{ lineHeight: 1.6 }}
              />
            </div>
          </div>

          {/* Preview column */}
          <div className="flex flex-col gap-4" style={{ width: 320 }}>
            <span className="font-mono text-xs text-text-lo" style={{ letterSpacing: 0.5 }}>プレビュー</span>
            <div className="flex flex-col items-center gap-4">
              <div
                className="flex items-center justify-center bg-raised"
                style={{
                  width: 96, height: 96, borderRadius: 24,
                  border: '1px solid #FFFFFF1F',
                  boxShadow: `0 0 16px ${glowColor}40`,
                  overflow: 'hidden',
                }}
              >
                {avatarImageKey ? (
                  <img src={getAvatarUrl(avatarImageKey)} alt="アバター" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <PersonaNode seed={personaId ?? 'preview'} size={56} />
                )}
              </div>
              <span className="text-text-hi font-sans font-semibold" style={{ fontSize: 18 }}>
                {displayName || '（名前未入力）'}
              </span>
              <span className="text-text-mid font-sans text-sm">
                {PERSONA_TYPE_LABELS[type]}
              </span>
              {freeText && (
                <p className="text-text-mid font-sans text-sm text-center" style={{ lineHeight: 1.6 }}>
                  {freeText}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3" style={{ borderTop: '1px solid var(--color-hairline)', paddingTop: 16 }}>
          <button
            type="button"
            onClick={() => navigate('/personas')}
            className="text-text-mid font-sans text-sm font-medium transition-colors hover:text-text-hi"
            style={{ borderRadius: 10, border: '1px solid var(--color-hairline)', padding: '10px 16px' }}
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 text-white font-sans text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ borderRadius: 10, background: 'var(--color-accent)', padding: '10px 24px' }}
          >
            <Check size={16} />
            {isSaving ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>
    </form>
  );
}
