import { useState, useEffect } from 'react';
import { X, Settings, PenTool, Cpu, FileText } from 'lucide-react';
import { Modal } from './ui/Modal';
import { getSettings, putSettings, type SettingsSection } from '../api/settings';

const SECTIONS = [
  { key: 'general' as const, label: '一般', icon: Settings },
  { key: 'figma' as const, label: 'Figma 連携', icon: PenTool },
  { key: 'model' as const, label: 'AI モデル', icon: Cpu },
  { key: 'prompt' as const, label: 'プロンプト', icon: FileText },
];

const PROMPT_TEMPLATES = [
  { id: 'evaluation', label: '評価プロンプト', desc: 'A/B テスト評価時のシステムプロンプト' },
  { id: 'interview', label: 'インタビュープロンプト', desc: 'ペルソナインタビューの基本指示' },
  { id: 'persona_draft', label: 'ペルソナ生成プロンプト', desc: 'AI ペルソナドラフト生成の指示' },
  { id: 'reason_summary', label: '理由要約プロンプト', desc: '評価理由の要約生成プロンプト' },
];

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [section, setSection] = useState<SettingsSection>('general');
  const [data, setData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!open) return;
    getSettings().then(setData);
  }, [open]);

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex" style={{ width: 640, height: 480 }}>
        {/* Left nav */}
        <div className="flex flex-col gap-1 py-4 px-3 border-r border-hairline" style={{ width: 180 }}>
          <span className="text-text-hi font-sans text-sm font-semibold px-2 pb-2">設定</span>
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = section === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSection(s.key)}
                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 font-sans text-sm transition-colors text-left"
                style={{
                  background: active ? 'var(--color-accent-dim, #6E78D926)' : 'transparent',
                  color: active ? 'var(--color-accent, #6E78D9)' : 'var(--color-text-mid, #9BA1AC)',
                }}
              >
                <Icon size={15} />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-hairline">
            <span className="text-text-hi font-sans text-sm font-semibold">
              {SECTIONS.find((s) => s.key === section)?.label}
            </span>
            <button type="button" onClick={onClose} className="text-text-lo hover:text-text-hi transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {section === 'general' && <GeneralSection />}
            {section === 'figma' && <FigmaSection />}
            {section === 'model' && <ModelSection />}
            {section === 'prompt' && <PromptSection />}
          </div>
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
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-text-mid font-sans text-xs font-medium">Figma トークン</label>
        <input
          type="text"
          placeholder="figd_..."
          className="rounded-md bg-raised border border-hairline px-3 py-2 text-text-hi font-mono text-sm"
        />
      </div>
    </div>
  );
}

function ModelSection() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-text-mid font-sans text-xs font-medium">評価モデル</span>
        <p className="text-text-lo font-sans text-sm">Claude Sonnet 4 (デフォルト)</p>
      </div>
    </div>
  );
}

function PromptSection() {
  return (
    <div className="flex flex-col gap-2">
      {PROMPT_TEMPLATES.map((t) => (
        <button
          key={t.id}
          type="button"
          className="flex flex-col gap-0.5 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-raised"
        >
          <span className="text-text-hi font-sans text-sm font-medium">{t.label}</span>
          <span className="text-text-lo font-sans text-xs">{t.desc}</span>
        </button>
      ))}
    </div>
  );
}
