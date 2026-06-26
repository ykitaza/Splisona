import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronLeft, Check, Sparkles, Camera, Send, RotateCcw, Trash2, ChevronDown } from 'lucide-react';
import { getPersona, updatePersona, deletePersona, generateDraft, sendInterviewMessage, uploadPersonaAvatar, getAvatarUrl } from '../api/personas';
import { getApiErrorMessage } from '../api/client';
import { PERSONA_TYPE_LABELS, type PersonaType, type Persona, type ConversationMessage } from '../types';
import { PersonaNode } from '../components/persona/PersonaNode';
import { ChatBubble } from '../components/ui/ChatBubble';
import { FieldSlider } from '../components/ui/FieldSlider';
import { SegmentControl } from '../components/ui/SegmentControl';

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
  lines.push(`タイプ: ${typeName}`);
  if (fields.age) lines.push(`年齢: ${fields.age}歳`);
  if (fields.gender) lines.push(`性別: ${fields.gender}`);
  if (fields.occupation) lines.push(`職業: ${fields.occupation}`);
  if (fields.deviationScore) lines.push(`偏差値: ${fields.deviationScore}`);
  if (fields.freeText) lines.push(`\n人物像:\n${fields.freeText}`);
  return lines.join('\n');
}

type Tab = 'edit' | 'interview';

function PromptPreview({ fields }: { fields: { displayName: string; type: string; age: string; gender: string; occupation: string; deviationScore: string; freeText: string } }) {
  const [open, setOpen] = useState(false);
  const preview = buildPromptPreview(fields);
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-text-lo font-sans text-xs font-medium"
      >
        <ChevronDown size={14} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
        合成プロンプト
      </button>
      {open && (
        <pre className="mt-2 rounded-md bg-raised border border-hairline px-4 py-3 text-text-mid font-mono text-xs whitespace-pre-wrap leading-relaxed overflow-x-auto">
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
  const [tab, setTab] = useState<Tab>('edit');

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

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
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

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header + tabs */}
        <div className="flex flex-col px-8 pt-6 pb-0 flex-shrink-0 border-b border-hairline">
          <Link to="/personas" className="flex items-center gap-1 text-text-lo font-sans text-xs mb-2">
            <ChevronLeft size={14} className="text-text-lo" />
            ペルソナ一覧
          </Link>
          <h1 className="text-text-hi font-sans text-xl font-semibold mb-4">{displayName || persona.displayName}</h1>
          <div className="flex gap-0">
            {(['edit', 'interview'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className="px-4 py-2 font-sans text-sm transition-colors"
                style={{
                  fontWeight: tab === t ? 600 : 400,
                  color: tab === t ? 'var(--color-accent)' : 'var(--color-text-lo)',
                  borderBottom: tab === t ? '2px solid var(--color-accent)' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                {t === 'edit' ? '編集' : 'インタビュー'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {tab === 'edit' ? (
          <form onSubmit={handleSave} noValidate className="flex flex-col flex-1 overflow-y-auto">
            <div className="flex flex-col gap-5 p-8 pb-24">
              {error && (
                <div role="alert" className="rounded-md bg-danger/10 text-danger px-4 py-3 font-sans text-sm">
                  {error}
                </div>
              )}

              {/* Basic info */}
              <div className="flex flex-col gap-4">
                <span className="text-text-hi font-sans text-base font-semibold">基本情報</span>

                {/* Avatar */}
                {!isDefault && (
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
                        style={{ width: 20, height: 20, border: '2px solid var(--color-bg-surface)' }}
                      >
                        <Camera size={10} color="#FFFFFF" />
                      </button>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarChange} />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="displayName" className="text-text-lo font-sans text-xs">ペルソナ名 <span className="text-danger">*</span></label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={isDefault}
                    placeholder="例: せっかちなビジネスマン"
                    className="rounded-md bg-raised border border-hairline px-3 py-2 text-text-hi font-sans text-sm outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
                  />
                  {validationError && <p className="text-danger font-sans text-xs">{validationError}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="type" className="text-text-lo font-sans text-xs">タイプ</label>
                  <select
                    id="type"
                    value={type}
                    onChange={(e) => setType(e.target.value as PersonaType)}
                    disabled={isDefault}
                    className="rounded-md bg-raised border border-hairline px-3 py-2 text-text-hi font-sans text-sm outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
                  >
                    {PERSONA_TYPES.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="h-px bg-hairline" />

              {/* Attributes */}
              <div className="flex flex-col gap-4">
                <span className="text-text-hi font-sans text-base font-semibold">属性</span>

                <FieldSlider
                  label="年齢"
                  min={18}
                  max={80}
                  value={age !== '' ? Number(age) : 18}
                  disabled={isDefault}
                  onChange={(v) => setAge(String(v))}
                />

                <SegmentControl
                  label="性別"
                  options={GENDER_OPTIONS}
                  selected={gender}
                  disabled={isDefault}
                  onChange={setGender}
                />

                <FieldSlider
                  label="偏差値"
                  min={30}
                  max={80}
                  value={deviationScore !== '' ? Number(deviationScore) : 30}
                  disabled={isDefault}
                  onChange={(v) => setDeviationScore(String(v))}
                />

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-text-lo font-sans text-xs">年収</span>
                    <select
                      value={annualIncome}
                      onChange={(e) => setAnnualIncome(e.target.value)}
                      disabled={isDefault}
                      className="rounded-md bg-raised border border-hairline px-3 py-2 text-text-hi font-sans text-xs outline-none disabled:opacity-50"
                    >
                      <option value="">選択</option>
                      {[200, 300, 400, 500, 600, 700, 800, 900, 1000, 1200, 1500, 2000].map((v) => (
                        <option key={v} value={v}>{v}万円</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-text-lo font-sans text-xs">学歴</span>
                    <select
                      value={education}
                      onChange={(e) => setEducation(e.target.value)}
                      disabled={isDefault}
                      className="rounded-md bg-raised border border-hairline px-3 py-2 text-text-hi font-sans text-xs outline-none disabled:opacity-50"
                    >
                      <option value="">選択</option>
                      {['中卒', '高卒', '専門卒', '短大卒', '大卒', '院卒'].map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-text-lo font-sans text-xs">職業</span>
                    <input
                      type="text"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      disabled={isDefault}
                      placeholder="営業職"
                      className="rounded-md bg-raised border border-hairline px-3 py-2 text-text-hi font-sans text-xs outline-none disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              <div className="h-px bg-hairline" />

              {/* Free text */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-text-hi font-sans text-base font-semibold">人物像・行動特性</span>
                  {!isDefault && (
                    <button
                      type="button"
                      onClick={handleGenerateDraft}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 text-accent font-sans text-xs font-medium disabled:opacity-50"
                    >
                      <Sparkles size={13} />
                      {isGenerating ? '生成中...' : 'AIで下書き'}
                    </button>
                  )}
                </div>
                <textarea
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  disabled={isDefault}
                  rows={4}
                  placeholder="このペルソナの性格や行動特性を記述してください"
                  className="rounded-md bg-raised border border-hairline px-3 py-2.5 text-text-hi font-sans text-sm outline-none resize-none focus:ring-1 focus:ring-accent disabled:opacity-50"
                  style={{ lineHeight: 1.6 }}
                />
              </div>

              <div className="h-px bg-hairline" />

              {/* Prompt preview */}
              <PromptPreview fields={{ displayName, type, age, gender, occupation, deviationScore, freeText }} />
            </div>

            {/* Sticky footer */}
            {!isDefault && (
              <div className="sticky bottom-0 flex items-center justify-between px-8 py-4 border-t border-hairline bg-surface">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 text-danger font-sans text-sm font-medium"
                >
                  <Trash2 size={14} />
                  削除
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/personas')}
                    className="rounded-md bg-raised border border-hairline px-4 py-2 text-text-mid font-sans text-sm transition-colors hover:bg-surface"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-white font-sans text-sm font-semibold disabled:opacity-50"
                  >
                    <Check size={14} />
                    {isSaving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            )}
          </form>
        ) : (
          /* Interview tab */
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-8 py-5 flex flex-col gap-3">
              {messages.length === 0 && !isSending && !chatError && (
                <div className="flex flex-col items-center justify-center flex-1 py-16">
                  <p className="text-text-lo font-sans text-sm">{persona.displayName}に話しかけてみましょう</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <ChatBubble key={i} role={msg.role} content={msg.content} />
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="rounded-lg bg-raised px-4 py-2.5">
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
            <div className="flex-shrink-0 px-8 py-4 flex items-end gap-3 border-t border-hairline">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSending}
                placeholder="メッセージを入力（Enter で送信、Shift+Enter で改行）"
                rows={2}
                className="flex-1 rounded-md bg-raised border border-hairline px-3 py-2.5 text-text-hi font-sans text-sm resize-none outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                type="button"
                onClick={() => sendMessage(inputText)}
                disabled={isSending || !inputText.trim()}
                className="flex items-center justify-center rounded-md bg-accent flex-shrink-0 disabled:opacity-40"
                style={{ width: 40, height: 40 }}
              >
                <Send size={16} color="#FFFFFF" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right column: Persona identity */}
      <div className="flex flex-col gap-5 flex-shrink-0 p-6 border-l border-hairline overflow-y-auto" style={{ width: 260 }}>
        <div className="flex flex-col items-center gap-3">
          <PersonaNode seed={persona.personaId} size={64} />
          <div className="flex flex-col items-center gap-1">
            <span className="text-text-hi font-sans text-base font-semibold">{displayName || persona.displayName}</span>
            <span className="text-text-lo font-sans text-xs">{(PERSONA_TYPE_LABELS as Record<string, string>)[type] ?? type}</span>
          </div>
        </div>

        <div className="h-px bg-hairline" />

        <div className="flex flex-col gap-3">
          {[
            { label: '年齢', value: age ? `${age}歳` : '—' },
            { label: '性別', value: gender || '—' },
            { label: '職業', value: occupation || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-text-lo font-sans text-xs">{label}</span>
              <span className="text-text-hi font-sans text-xs font-medium">{value}</span>
            </div>
          ))}
        </div>

        {freeText && (
          <>
            <div className="h-px bg-hairline" />
            <div className="flex flex-col gap-1.5">
              <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: '0.5px' }}>人物像</span>
              <p className="text-text-mid font-sans text-xs leading-relaxed">{freeText}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
