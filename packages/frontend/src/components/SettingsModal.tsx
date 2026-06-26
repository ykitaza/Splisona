import { useState, useEffect, useCallback } from 'react';
import { X, Settings, PenTool, Cpu, FileText, Search, ChevronRight, Lock, Plus, ArrowLeft, RotateCcw } from 'lucide-react';
import { Modal } from './ui/Modal';
import { getSettings, putSettings, getConfig, type SettingsSection } from '../api/settings';

const SECTIONS = [
  { key: 'general' as const, label: '一般', icon: Settings },
  { key: 'figma' as const, label: 'Figma 連携', icon: PenTool },
  { key: 'model' as const, label: 'AI モデル', icon: Cpu },
  { key: 'prompt' as const, label: 'プロンプト', icon: FileText },
];

const SECTION_DESCS: Partial<Record<SettingsSection, string>> = {
  prompt: 'テストで使用するプロンプトの確認と追加指示の設定',
};

const PROMPT_TEMPLATES = [
  {
    id: 'evaluation', label: 'ペルソナ評価', tag: 'evaluation',
    desc: 'ペルソナ視点から2つのデザインを5観点で採点', date: '06/20',
    context: 'あなたは「{表示名}」というペルソナです。\n属性: {年齢}歳・{性別}・{職業}（{タイプ}）\n偏差値 {偏差値}・年収 {年収}・{学歴}\n\n人物像:\n{自由記述}',
    instruction: 'あなたのペルソナ視点から、提示された2つのデザインを\n以下の5観点で 1〜5 の整数で採点し、どちらが優れて\nいるか理由とともに回答してください。\n\n1. 使いやすさ  2. 魅力  3. 分かりやすさ\n4. 行動喚起  5. 信頼感',
  },
  {
    id: 'summary', label: '理由要約', tag: 'summary',
    desc: '評価理由を構造化して要約', date: '06/20',
    context: 'あなたは「{表示名}」というペルソナです。\n属性: {年齢}歳・{性別}・{職業}（{タイプ}）\n\n人物像:\n{自由記述}',
    instruction: '各ペルソナの評価理由を以下の構造で要約してください。\n\n- 主要な判断軸\n- 決め手となったポイント\n- 懸念点や改善提案',
  },
  {
    id: 'interview', label: 'インタビュー', tag: 'interview',
    desc: 'ペルソナへの深掘りインタビュー', date: '06/18',
    context: 'あなたは「{表示名}」というペルソナです。\n属性: {年齢}歳・{性別}・{職業}（{タイプ}）\n\n人物像:\n{自由記述}',
    instruction: 'ペルソナとして自然な口調で回答してください。\nインタビュアーの質問に対し、自分の価値観・\n経験・立場を踏まえて具体的に答えてください。',
  },
  {
    id: 'draft', label: 'AI 生成', tag: 'draft',
    desc: 'ペルソナの属性から自由記述を自動生成', date: '06/15',
    context: 'ペルソナ名: {表示名}\n属性: {年齢}歳・{性別}・{職業}（{タイプ}）\n偏差値 {偏差値}・年収 {年収}・{学歴}',
    instruction: '与えられた属性から、このペルソナの人物像・\n行動特性・価値観を具体的に描写する\n自由記述文を生成してください。',
  },
];

type PromptData = Record<string, { additionalInstruction?: string }>;

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [section, setSection] = useState<SettingsSection>('general');
  const [data, setData] = useState<Record<string, unknown>>({});
  const [modelId, setModelId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [promptData, setPromptData] = useState<PromptData>({});

  const loadSettings = useCallback(() => {
    getSettings().then((d) => {
      setData(d);
      if (d.prompt && typeof d.prompt === 'object') {
        setPromptData(d.prompt as PromptData);
      }
    });
    getConfig().then((c) => setModelId(c.modelId)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    loadSettings();
  }, [open, loadSettings]);

  useEffect(() => {
    if (!open) {
      setSelectedTemplate(null);
    }
  }, [open]);

  const template = selectedTemplate ? PROMPT_TEMPLATES.find((t) => t.id === selectedTemplate) : null;

  async function handleSavePrompt(templateId: string, additionalInstruction: string) {
    const updated = { ...promptData, [templateId]: { additionalInstruction } };
    await putSettings('prompt', updated);
    setPromptData(updated);
    setSelectedTemplate(null);
  }

  async function handleResetPrompt(templateId: string) {
    const updated = { ...promptData, [templateId]: { additionalInstruction: '' } };
    await putSettings('prompt', updated);
    setPromptData(updated);
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex" style={{ width: 1040, height: 680 }}>
        {/* Left nav */}
        <div
          className="flex flex-col border-r border-hairline"
          style={{ width: 220, padding: '24px 16px', gap: 20 }}
        >
          <span className="text-text-hi font-sans text-lg font-semibold px-3">設定</span>
          <div
            className="flex items-center bg-raised"
            style={{ gap: 8, borderRadius: 6, padding: '8px 12px' }}
          >
            <Search size={14} className="text-text-lo flex-shrink-0" />
            <span className="text-text-lo font-sans text-sm">検索</span>
          </div>
          <div className="flex flex-col" style={{ gap: 2 }}>
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = section === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => { setSection(s.key); setSelectedTemplate(null); }}
                  className="flex items-center font-sans text-sm transition-colors text-left"
                  style={{
                    gap: 10,
                    borderRadius: 6,
                    padding: '8px 12px',
                    background: active ? 'var(--color-accent-dim)' : 'transparent',
                    color: active ? 'var(--color-text-hi)' : 'var(--color-text-mid)',
                    fontWeight: active ? 500 : 400,
                  }}
                >
                  <Icon size={16} style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-lo)' }} />
                  {s.label}
                </button>
              );
            })}
          </div>
          <div className="flex-1" />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col bg-base overflow-y-auto" style={{ padding: '28px 32px', gap: template ? 20 : 24 }}>
          {template ? (
            <PromptDetail
              template={template}
              savedInstruction={promptData[template.id]?.additionalInstruction ?? ''}
              onBack={() => setSelectedTemplate(null)}
              onClose={onClose}
              onSave={(text) => handleSavePrompt(template.id, text)}
              onReset={() => handleResetPrompt(template.id)}
            />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-text-hi font-sans text-xl font-semibold">
                  {section === 'prompt' ? 'プロンプトテンプレート' : SECTIONS.find((s) => s.key === section)?.label}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center justify-center rounded-sm text-text-mid hover:text-text-hi transition-colors"
                  style={{ width: 28, height: 28 }}
                >
                  <X size={16} />
                </button>
              </div>
              {SECTION_DESCS[section] && (
                <p className="text-text-mid font-sans text-sm">{SECTION_DESCS[section]}</p>
              )}
              <div className="flex-1">
                {section === 'general' && <GeneralSection />}
                {section === 'figma' && <FigmaSection />}
                {section === 'model' && <ModelSection modelId={modelId} />}
                {section === 'prompt' && <PromptSection promptData={promptData} onSelect={setSelectedTemplate} />}
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

function GeneralSection() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-text-mid font-sans text-sm">一般設定はまだ項目がありません。</p>
    </div>
  );
}

function FigmaSection() {
  const [token, setToken] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings().then((d) => {
      const figma = d.figma as { token?: string } | undefined;
      if (figma?.token) setToken(figma.token);
    });
  }, []);

  const isConnected = token.length > 0;

  async function handleSave() {
    setSaving(true);
    try {
      await putSettings('figma', { token });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col" style={{ gap: 24 }}>
      <div className="flex items-center" style={{ gap: 10 }}>
        <span className="text-text-mid font-sans text-sm">接続状態</span>
        <span
          className="font-mono text-xs font-medium"
          style={{
            padding: '3px 10px',
            borderRadius: 999,
            background: isConnected ? '#54B58720' : '#E06A6A20',
            color: isConnected ? '#54B587' : '#E06A6A',
          }}
        >
          {isConnected ? '接続済み' : '未接続'}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-text-mid font-sans text-xs font-medium">アクセストークン</label>
        <input
          type="password"
          placeholder="figd_..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="rounded-md bg-raised border border-hairline px-3 py-2 text-text-hi font-mono text-sm"
        />
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="self-start flex items-center bg-accent text-white font-sans text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50"
        style={{ borderRadius: 6, padding: '8px 16px' }}
      >
        {saved ? '保存しました' : saving ? '保存中...' : '更新'}
      </button>
      <div className="h-px bg-hairline" />
      <div className="flex flex-col" style={{ gap: 8 }}>
        <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 0.5 }}>トークンの取得方法</span>
        <ol className="text-text-mid font-sans text-sm list-decimal pl-5" style={{ lineHeight: 1.8 }}>
          <li>Figma にログインし、Settings を開く</li>
          <li>Personal access tokens で新しいトークンを生成</li>
          <li>生成されたトークンをここに貼り付けて更新</li>
        </ol>
      </div>
    </div>
  );
}

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'us.anthropic.claude-haiku-4-5-20251001-v1:0': 'Claude Haiku 4.5',
  'us.anthropic.claude-sonnet-4-20250514-v1:0': 'Claude Sonnet 4',
  'us.anthropic.claude-sonnet-4-5-20250514-v1:0': 'Claude Sonnet 4.5',
  'us.anthropic.claude-opus-4-20250514-v1:0': 'Claude Opus 4',
  'anthropic.claude-haiku-4-5-20251001-v1:0': 'Claude Haiku 4.5',
  'anthropic.claude-sonnet-4-20250514-v1:0': 'Claude Sonnet 4',
};

function formatModelName(modelId: string): string {
  return MODEL_DISPLAY_NAMES[modelId] ?? modelId;
}

function ModelSection({ modelId }: { modelId: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-text-mid font-sans text-xs font-medium">評価モデル</span>
        <p className="text-text-hi font-sans text-sm">
          {modelId ? formatModelName(modelId) : '読み込み中...'}
        </p>
        {modelId && (
          <span className="text-text-lo font-mono text-xs">{modelId}</span>
        )}
      </div>
    </div>
  );
}

function PromptSection({ promptData, onSelect }: { promptData: PromptData; onSelect: (id: string) => void }) {
  return (
    <div className="flex flex-col">
      {PROMPT_TEMPLATES.map((t) => {
        const hasCustom = !!promptData[t.id]?.additionalInstruction;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            className="flex items-center justify-between text-left transition-colors hover:bg-raised"
            style={{ padding: '16px 0', borderBottom: '1px solid var(--color-hairline)' }}
          >
            <div className="flex flex-col" style={{ gap: 4 }}>
              <div className="flex items-center" style={{ gap: 10 }}>
                <span className="text-text-hi font-sans font-medium" style={{ fontSize: 14 }}>{t.label}</span>
                <span className="text-text-lo font-mono text-xs">{t.tag}</span>
                {hasCustom && (
                  <span className="text-accent font-mono text-xs">カスタム</span>
                )}
              </div>
              <span className="text-text-lo font-sans text-xs">{t.desc}</span>
            </div>
            <div className="flex items-center flex-shrink-0" style={{ gap: 16 }}>
              <span className="text-text-lo font-mono text-xs">{t.date}</span>
              <ChevronRight size={16} className="text-text-lo" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

interface PromptDetailProps {
  template: typeof PROMPT_TEMPLATES[number];
  savedInstruction: string;
  onBack: () => void;
  onClose: () => void;
  onSave: (text: string) => Promise<void>;
  onReset: () => Promise<void>;
}

function PromptDetail({ template, savedInstruction, onBack, onClose, onSave, onReset }: PromptDetailProps) {
  const [text, setText] = useState(savedInstruction);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setText(savedInstruction);
  }, [savedInstruction]);

  const isDirty = text !== savedInstruction;

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(text);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    await onReset();
    setText('');
  }

  return (
    <>
      {/* TopBar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center text-text-mid hover:text-text-hi transition-colors"
          style={{ gap: 8 }}
        >
          <ArrowLeft size={16} />
          <span className="font-sans text-sm">プロンプトテンプレート</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center rounded-sm text-text-mid hover:text-text-hi transition-colors"
          style={{ width: 28, height: 28 }}
        >
          <X size={16} />
        </button>
      </div>

      {/* TitleRow */}
      <div className="flex items-center" style={{ gap: 10 }}>
        <span className="text-text-hi font-sans text-lg font-semibold">{template.label}</span>
        <span className="text-text-lo font-mono text-xs">{template.tag}</span>
      </div>

      {/* ContentArea */}
      <div className="flex flex-col flex-1" style={{ gap: 16 }}>
        {/* ペルソナコンテキスト（固定） */}
        <div className="flex flex-col" style={{ gap: 8 }}>
          <div className="flex items-center" style={{ gap: 8 }}>
            <Lock size={12} className="text-text-lo" />
            <span className="font-mono text-xs text-text-lo" style={{ letterSpacing: 0.5 }}>
              ペルソナコンテキスト（固定）
            </span>
          </div>
          <div className="bg-raised" style={{ borderRadius: 6, padding: 12 }}>
            <pre
              className="font-mono text-xs text-text-mid whitespace-pre-wrap"
              style={{ lineHeight: 1.7, margin: 0 }}
            >
              {template.context}
            </pre>
          </div>
        </div>

        {/* 評価指示（固定） */}
        <div className="flex flex-col" style={{ gap: 8 }}>
          <div className="flex items-center" style={{ gap: 8 }}>
            <Lock size={12} className="text-text-lo" />
            <span className="font-mono text-xs text-text-lo" style={{ letterSpacing: 0.5 }}>
              評価指示（固定）
            </span>
          </div>
          <div className="bg-raised" style={{ borderRadius: 6, padding: 12 }}>
            <pre
              className="font-mono text-xs text-text-mid whitespace-pre-wrap"
              style={{ lineHeight: 1.7, margin: 0 }}
            >
              {template.instruction}
            </pre>
          </div>
        </div>

        {/* 追加指示（任意） */}
        <div className="flex flex-col" style={{ gap: 8 }}>
          <div className="flex items-center" style={{ gap: 8 }}>
            <Plus size={12} className="text-accent" />
            <span className="font-mono text-xs text-accent" style={{ letterSpacing: 0.5 }}>
              追加指示（任意）
            </span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="追加の評価基準や指示があればここに入力…"
            className="bg-base border border-hairline font-mono text-xs text-text-hi outline-none resize-none"
            style={{ borderRadius: 6, padding: 12, height: 64, lineHeight: 1.7 }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center border border-hairline text-text-lo font-sans text-sm transition-colors hover:text-text-mid"
          style={{ gap: 8, borderRadius: 6, padding: '8px 14px' }}
        >
          <RotateCcw size={14} />
          デフォルトに戻す
        </button>
        <div className="flex items-center" style={{ gap: 12 }}>
          <button
            type="button"
            onClick={onBack}
            className="flex items-center border border-hairline text-text-mid font-sans text-sm transition-colors hover:text-text-hi"
            style={{ borderRadius: 6, padding: '8px 14px' }}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="flex items-center bg-accent text-white font-sans text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50"
            style={{ borderRadius: 6, padding: '8px 14px' }}
          >
            {saving ? '保存中…' : '保存する'}
          </button>
        </div>
      </div>
    </>
  );
}
