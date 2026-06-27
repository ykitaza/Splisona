import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Sparkles, Camera, ArrowUp, RotateCcw, Trash2, ChevronDown, Copy, ArrowLeft } from 'lucide-react';
import { getPersona, updatePersona, deletePersona, generateDraft, sendInterviewMessage, uploadPersonaAvatar, getAvatarUrl } from '../api/personas';
import { getApiErrorMessage } from '../api/client';
import { PERSONA_TYPE_LABELS, PERSONA_TYPE_DESCRIPTIONS, type PersonaType, type Persona, type ConversationMessage } from '../types';
import { PersonaNode, getNodeColor } from '../components/persona/PersonaNode';
import { ChatBubble } from '../components/ui/ChatBubble';
import { FieldSlider } from '../components/ui/FieldSlider';
import { SegmentControl } from '../components/ui/SegmentControl';
import { FieldSelect } from '../components/ui/FieldSelect';
import { HelpDot } from '../components/report/HelpDot';

const PERSONA_TYPES = Object.entries(PERSONA_TYPE_LABELS) as [PersonaType, string][];

const GENDER_OPTIONS = [
  { value: '男性', label: '男性' },
  { value: '女性', label: '女性' },
  { value: 'その他', label: 'その他' },
  { value: '', label: '指定なし' },
];

function buildPromptPreview(fields: { displayName: string; type: string; age: string; gender: string; occupation: string; deviationScore: string; freeText: string }) {
  const lines: string[] = [];
  lines.push(`あなたは「${fields.displayName || '（名前未入力）'}」というペルソナです。`);
  const typeName = (PERSONA_TYPE_LABELS as Record<string, string>)[fields.type] ?? fields.type;
  const typeDesc = (PERSONA_TYPE_DESCRIPTIONS as Record<string, string>)[fields.type];
  lines.push(`タイプ: ${typeName}${typeDesc ? `（${typeDesc}）` : ''}`);
  if (fields.age) lines.push(`年齢: ${fields.age}歳`);
  if (fields.gender) lines.push(`性別: ${fields.gender}`);
  if (fields.occupation) lines.push(`職業: ${fields.occupation}`);
  if (fields.deviationScore) lines.push(`偏差値: ${fields.deviationScore}`);
  if (fields.freeText) lines.push(`\n人物像:\n${fields.freeText}`);
  return lines.join('\n');
}

type Tab = 'detail' | 'edit' | 'interview';

function PromptPreview({ fields }: { fields: { displayName: string; type: string; age: string; gender: string; occupation: string; deviationScore: string; freeText: string } }) {
  const [open, setOpen] = useState(false);
  const preview = buildPromptPreview(fields);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-text-lo font-mono text-xs"
          style={{ letterSpacing: '0.5px' }}
        >
          <ChevronDown size={14} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
          合成プロンプト プレビュー
        </button>
        {open && (
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(preview)}
            className="flex items-center gap-1 text-text-lo font-sans text-xs hover:text-text-mid transition-colors"
            data-testid="copy-prompt"
          >
            <Copy size={12} />
            コピー
          </button>
        )}
      </div>
      {open && (
        <pre className="rounded-sm bg-raised border border-hairline p-3 text-text-mid font-mono text-xs whitespace-pre-wrap overflow-x-auto" style={{ lineHeight: 1.7 }}>
          {preview}
        </pre>
      )}
    </div>
  );
}

export function PersonaUnifiedPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [persona, setPersona] = useState<Persona | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('detail');

  // Edit state
  const [displayName, setDisplayName] = useState('');
  const [type, setType] = useState<PersonaType>('action_oriented');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [occupation, setOccupation] = useState('');
  const [deviationScore, setDeviationScore] = useState('');
  const [annualIncome, setAnnualIncome] = useState('');
  const [education, setEducation] = useState('');
  const [freeText, setFreeText] = useState('');
  const [avatarImageKey, setAvatarImageKey] = useState<string | undefined>();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Interview state
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    getPersona(id)
      .then((p) => {
        setPersona(p);
        setDisplayName(p.displayName);
        setType(p.type);
        setAge(p.age?.toString() ?? '');
        setGender(p.gender ?? '');
        setOccupation(p.occupation ?? '');
        setDeviationScore(p.deviationScore?.toString() ?? '');
        setAnnualIncome(p.annualIncome?.toString() ?? '');
        setEducation(p.education ?? '');
        setFreeText(p.freeText ?? '');
        setAvatarImageKey(p.avatarImageKey);
      })
      .catch(() => setError('ペルソナの読み込みに失敗しました'))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages, isSending]);

  async function handleSave(e?: FormEvent) {
    e?.preventDefault();
    if (!id || !displayName.trim()) {
      setValidationError('表示名は必須です');
      return;
    }
    setValidationError(null);
    setIsSaving(true);
    setError(null);
    try {
      await updatePersona(id, {
        displayName: displayName.trim(),
        type,
        age: age ? parseInt(age, 10) : undefined,
        gender: gender || undefined,
        occupation: occupation || undefined,
        deviationScore: deviationScore ? parseInt(deviationScore, 10) : undefined,
        annualIncome: annualIncome ? parseInt(annualIncome, 10) : undefined,
        education: education || undefined,
        freeText: freeText || undefined,
      });
      navigate('/personas');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    try {
      await deletePersona(id);
      navigate('/personas');
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function handleGenerateDraft() {
    if (!id) return;
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

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setIsUploadingAvatar(true);
    try {
      const key = await uploadPersonaAvatar(id, file);
      await updatePersona(id, { avatarImageKey: key });
      setAvatarImageKey(key);
    } catch {
      setError('アバターのアップロードに失敗しました');
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function sendMessage(text: string) {
    if (!id || !text.trim()) return;
    const userMessage: ConversationMessage = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setLastUserMessage(text.trim());
    setIsSending(true);
    setChatError(null);
    try {
      const content = await sendInterviewMessage(id, newMessages);
      setMessages((prev) => [...prev, { role: 'assistant', content }]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : '生成に失敗しました');
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div role="status" className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (!persona) {
    return (
      <div className="p-8">
        <p className="text-text-lo font-sans text-sm">ペルソナが見つかりません</p>
      </div>
    );
  }

  const isDefault = persona.source === 'default';
  const isReadOnly = isDefault || tab === 'detail';

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header + tabs */}
        <div className="flex flex-col pb-0 flex-shrink-0 border-b border-hairline" style={{ paddingTop: 48, paddingLeft: 128, paddingRight: 128 }}>
          <div className="flex flex-col mb-6" style={{ gap: 4 }}>
            <button
              type="button"
              onClick={() => navigate('/personas')}
              className="flex items-center transition-colors hover:text-text-mid"
              style={{ gap: 4, color: '#9BA1AC' }}
            >
              <ArrowLeft size={14} />
              <span className="font-sans" style={{ fontSize: 13 }}>ペルソナ一覧</span>
            </button>
            <h1 className="text-text-hi font-sans font-semibold" style={{ fontSize: 24 }}>{displayName || persona.displayName}</h1>
          </div>
          <div className="flex" style={{ gap: 24 }}>
            {(['detail', 'edit', 'interview'] as const).map((t) => {
              const label = t === 'detail' ? '詳細' : t === 'edit' ? '編集' : 'インタビュー';
              const isActive = tab === t;
              const disabled = t === 'edit' && isDefault;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => { if (!disabled) setTab(t); }}
                  disabled={disabled}
                  className="font-sans transition-colors"
                  style={{
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 400,
                    color: disabled ? 'var(--color-text-lo)' : isActive ? 'var(--color-text-hi)' : 'var(--color-text-mid)',
                    borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                    paddingBottom: isActive ? 4 : 4,
                    marginBottom: -1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.5 : 1,
                  }}
                  title={disabled ? 'デフォルトペルソナは編集できません' : undefined}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        {(tab === 'edit' || tab === 'detail') ? (
          <form onSubmit={handleSave} noValidate className="flex flex-col flex-1 overflow-y-auto">
            <div className="flex flex-col gap-6 pb-24" style={{ padding: '48px 128px', paddingBottom: 96 }}>
              {error && (
                <div role="alert" className="rounded-md bg-danger/10 text-danger px-4 py-3 font-sans text-sm">
                  {error}
                </div>
              )}

              {/* 基本情報 */}
              <div className="flex flex-col gap-6">
                <span className="font-mono text-xs text-text-lo" style={{ letterSpacing: '0.5px' }}>基本情報</span>

                <div className="flex flex-col gap-1 pb-2 border-b border-hairline">
                  <label htmlFor="displayName" className="text-text-mid font-sans text-sm">表示名</label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={isReadOnly}
                    placeholder="例: せっかちなビジネスマン"
                    className="bg-transparent text-text-hi font-sans text-base outline-none disabled:opacity-50"
                  />
                  {validationError && <p className="text-danger font-sans text-xs">{validationError}</p>}
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="type" className="text-text-mid font-sans text-sm">タイプ</label>
                    <HelpDot
                      title={(PERSONA_TYPE_LABELS as Record<string, string>)[type] ?? type}
                      content={(PERSONA_TYPE_DESCRIPTIONS as Record<string, string>)[type] ?? ''}
                    />
                  </div>
                  <FieldSelect
                    id="type"
                    value={type}
                    onChange={(v) => setType(v as PersonaType)}
                    disabled={isReadOnly}
                    options={PERSONA_TYPES.map(([value, label]) => ({ value, label }))}
                  />
                </div>

                {/* Avatar */}
                {!isReadOnly && (
                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      <div className="flex items-center justify-center rounded-full overflow-hidden bg-raised" style={{ width: 56, height: 56 }}>
                        {avatarImageKey ? (
                          <img src={getAvatarUrl(avatarImageKey)} alt="アバター" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-text-mid font-sans text-lg font-semibold">{displayName?.charAt(0) ?? '?'}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="absolute bottom-0 right-0 flex items-center justify-center rounded-full bg-accent disabled:opacity-50"
                        style={{ width: 20, height: 20, border: '2px solid var(--color-surface)' }}
                      >
                        <Camera size={10} color="#FFFFFF" />
                      </button>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarChange} />
                  </div>
                )}
              </div>

              <div className="h-px bg-hairline" />

              {/* 属性 */}
              <div className="flex flex-col gap-6">
                <span className="font-mono text-xs text-text-lo" style={{ letterSpacing: '0.5px' }}>属性</span>

                <FieldSlider
                  label="年齢"
                  min={18}
                  max={80}
                  value={age !== '' ? Number(age) : 18}
                  disabled={isReadOnly}
                  onChange={(v) => setAge(String(v))}
                />

                <SegmentControl
                  label="性別"
                  options={GENDER_OPTIONS}
                  selected={gender}
                  disabled={isReadOnly}
                  onChange={setGender}
                />

                <FieldSlider
                  label="偏差値"
                  min={30}
                  max={80}
                  value={deviationScore !== '' ? Number(deviationScore) : 30}
                  disabled={isReadOnly}
                  onChange={(v) => setDeviationScore(String(v))}
                />

                <div className="flex flex-col gap-1">
                  <span className="text-text-mid font-sans text-sm">年収</span>
                  <FieldSelect
                    value={annualIncome}
                    onChange={setAnnualIncome}
                    disabled={isReadOnly}
                    placeholder="選択"
                    options={[200, 300, 400, 500, 600, 700, 800, 900, 1000, 1200, 1500, 2000].map((v) => ({ value: String(v), label: `${v}万円` }))}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-text-mid font-sans text-sm">学歴</span>
                  <FieldSelect
                    value={education}
                    onChange={setEducation}
                    disabled={isReadOnly}
                    placeholder="選択"
                    options={['中卒', '高卒', '専門卒', '短大卒', '大卒', '院卒'].map((v) => ({ value: v, label: v }))}
                  />
                </div>

                <div className="flex flex-col gap-1 pb-2 border-b border-hairline">
                  <span className="text-text-mid font-sans text-sm">職業</span>
                  <input
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    disabled={isReadOnly}
                    placeholder="営業職"
                    className="bg-transparent text-text-hi font-sans text-base outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="h-px bg-hairline" />

              {/* 自由記述 */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-text-lo" style={{ letterSpacing: '0.5px' }}>自由記述</span>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={handleGenerateDraft}
                      disabled={isGenerating}
                      className="flex items-center gap-1 text-accent font-sans text-sm font-medium disabled:opacity-50"
                    >
                      <Sparkles size={14} />
                      {isGenerating ? '生成中...' : 'AIで生成'}
                    </button>
                  )}
                </div>
                <div className="pb-3 border-b border-hairline">
                  <textarea
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    disabled={isReadOnly}
                    rows={4}
                    placeholder="このペルソナの性格や行動特性を記述してください"
                    className="w-full bg-transparent text-text-mid font-sans text-base outline-none resize-none disabled:opacity-50"
                    style={{ lineHeight: 1.6 }}
                  />
                </div>
              </div>

              {/* Prompt preview */}
              <PromptPreview fields={{ displayName, type, age, gender, occupation, deviationScore, freeText }} />
            </div>

            {/* Sticky footer */}
            {!isReadOnly && (
              <div className="sticky bottom-0 flex items-center justify-between px-6 pt-4 pb-4 border-t border-hairline bg-base">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 rounded-md border border-danger text-danger px-4 font-sans text-sm font-medium transition-colors hover:bg-danger/10"
                  style={{ paddingTop: 12, paddingBottom: 12 }}
                >
                  <Trash2 size={14} />
                  削除
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/personas')}
                    className="rounded-md border border-hairline px-4 text-text-mid font-sans text-sm transition-colors hover:bg-raised"
                    style={{ paddingTop: 12, paddingBottom: 12 }}
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 rounded-md bg-accent font-sans text-sm font-semibold transition-colors disabled:opacity-50"
                    style={{ color: '#0A0B0D', padding: '12px 16px' }}
                  >
                    <Check size={14} />
                    {isSaving ? '保存中...' : '保存する'}
                  </button>
                </div>
              </div>
            )}
          </form>
        ) : (
          /* Interview tab */
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto flex flex-col" style={{ padding: '48px 128px', gap: 24 }}>
              {messages.length === 0 && !isSending && !chatError && (
                <div className="flex flex-col items-center justify-center flex-1 py-16">
                  <p className="text-text-lo font-sans text-sm">{persona.displayName}に話しかけてみましょう</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <ChatBubble key={i} role={msg.role} content={msg.content} displayName={persona.displayName} avatarColor={getNodeColor(persona.personaId)} />
              ))}
              {isSending && (
                <div className="flex justify-start" style={{ gap: 10 }}>
                  <div className="flex items-center justify-center rounded-full flex-shrink-0 font-sans font-semibold text-white" style={{ width: 28, height: 28, fontSize: 12, backgroundColor: getNodeColor(persona.personaId) }}>
                    {persona.displayName.charAt(0)}
                  </div>
                  <div className="bg-raised" style={{ borderRadius: 10, padding: 12 }}>
                    <div role="status" className="animate-spin rounded-full h-4 w-4 border-b-2 border-text-lo" />
                  </div>
                </div>
              )}
              {chatError && (
                <div className="flex flex-col items-start gap-2">
                  <p className="text-danger font-sans text-sm">{chatError}</p>
                  <button
                    type="button"
                    onClick={() => sendMessage(lastUserMessage)}
                    className="flex items-center gap-1 text-accent font-sans text-xs font-medium"
                  >
                    <RotateCcw size={12} />
                    再試行
                  </button>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div className="flex-shrink-0" style={{ padding: '16px 128px' }}>
              <div className="flex items-center gap-3 bg-base border border-hairline py-2 pl-4 pr-2" style={{ borderRadius: 10 }}>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSending}
                  placeholder={`${displayName || persona.displayName} に質問する…`}
                  className="flex-1 bg-transparent text-text-hi font-sans text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => sendMessage(inputText)}
                  disabled={isSending || !inputText.trim()}
                  className="flex items-center justify-center bg-accent flex-shrink-0 disabled:opacity-40"
                  style={{ width: 36, height: 36, borderRadius: 10 }}
                >
                  <ArrowUp size={18} color="#FFFFFF" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right column: Persona identity */}
      <div className="flex flex-col gap-4 flex-shrink-0 p-6 border-l border-hairline overflow-y-auto" style={{ width: 320 }}>
        <div className="rounded-[24px] overflow-hidden flex-shrink-0 self-center">
          <PersonaNode seed={persona.personaId} size={96} avatarUrl={avatarImageKey ? getAvatarUrl(avatarImageKey) : undefined} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-text-hi font-sans font-semibold" style={{ fontSize: 24 }}>{displayName || persona.displayName}</span>
          <span className="flex items-center gap-1.5 text-text-mid font-sans text-sm">
            {(PERSONA_TYPE_LABELS as Record<string, string>)[type] ?? type}
            <HelpDot content={(PERSONA_TYPE_DESCRIPTIONS as Record<string, string>)[type] ?? ''} />
          </span>
        </div>
        {freeText && (
          <p className="text-text-mid font-sans text-sm" style={{ lineHeight: 1.6 }}>{freeText}</p>
        )}
      </div>
    </div>
  );
}
