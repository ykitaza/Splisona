import { useEffect, useRef, useState } from 'react';
import { X, Copy, Check, ChevronDown, Eye } from 'lucide-react';
import { HelpDot } from '@/shared/ui/HelpDot';
import type { ImprovementReport, ImprovementSuggestion } from './types';

function CopyIconButton({ text, label, compact }: { text: string; label: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard 不許可時は何もしない
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={label}
      className="flex items-center flex-shrink-0 font-sans transition-colors hover:bg-raised"
      style={{
        gap: 6,
        padding: compact ? 6 : '5px 10px',
        borderRadius: 6,
        fontSize: 12,
        border: compact ? 'none' : '1px solid var(--color-hairline)',
        color: copied ? 'var(--color-success)' : 'var(--color-text-mid)',
        background: 'transparent',
        cursor: 'pointer',
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {!compact && (copied ? 'コピーしました' : label)}
    </button>
  );
}

function SuggestionRow({ suggestion, index, contextHeader, designSummary, onViewPrompt }: {
  suggestion: ImprovementSuggestion;
  index: number;
  contextHeader: string;
  designSummary?: string;
  onViewPrompt: (title: string, text: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const kindTag = suggestion.kind === 'transplant'
    ? `${suggestion.target === 'A' ? 'B' : 'A'} の強み移植`
    : `${suggestion.target} の弱点`;

  const suggestionText = [
    suggestion.title,
    `根拠: ${kindTag} · ${suggestion.evidence}`,
    suggestion.quote,
  ].filter(Boolean).join('\n');

  const targetBlock = [
    '## 今回の改善対象',
    `デザイン${suggestion.target}${designSummary ? `（${designSummary}）` : ''}`,
  ].join('\n');
  const fullPrompt = `${contextHeader}\n\n${targetBlock}\n\n${suggestion.implementationPrompt}`;

  return (
    <div style={{ borderBottom: '1px solid var(--color-hairline)' }}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="group flex items-start w-full text-left"
        style={{ gap: 14, padding: '14px 0', border: 'none', background: 'transparent', cursor: 'pointer' }}
      >
        <span className="text-text-lo font-mono text-sm font-semibold flex-shrink-0" style={{ paddingTop: 1 }}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="text-text-hi font-sans text-sm font-medium flex-1 min-w-0" style={{ lineHeight: 1.5 }}>
          {suggestion.title}
        </span>
        <span
          className="flex items-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={expanded ? { opacity: 1 } : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          <CopyIconButton text={suggestionText} label="提案をコピー" compact />
        </span>
        <ChevronDown
          size={15}
          className="text-text-lo flex-shrink-0"
          style={{ marginTop: 2, transition: 'transform 0.15s', transform: expanded ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {expanded && (
      <div className="flex flex-col" style={{ padding: '2px 29px 18px 30px', gap: 16 }}>
        <div className="flex flex-col" style={{ gap: 5 }}>
          <div className="flex items-center" style={{ gap: 8 }}>
            <span className="text-text-lo font-mono" style={{ fontSize: 11, letterSpacing: 1 }}>根拠</span>
            <span
              className="text-text-lo font-mono"
              style={{ fontSize: 10, padding: '1px 7px', borderRadius: 999, border: '1px solid var(--color-hairline)' }}
            >
              {kindTag}
            </span>
            <HelpDot content="AI がペルソナの評価コメントと5軸スコアから要約した、この提案の裏付けです。タグは「対象案自身の弱点」か「もう一方の案の強みの移植」かを示します。" />
          </div>
          <p className="text-text-mid font-sans text-sm" style={{ lineHeight: 1.6 }}>
            {suggestion.evidence}
          </p>
        </div>

        {suggestion.quote && (
          <div className="flex flex-col" style={{ gap: 5 }}>
            <div className="flex items-center" style={{ gap: 8 }}>
              <span className="text-text-lo font-mono" style={{ fontSize: 11, letterSpacing: 1 }}>コメント抜粋</span>
              <HelpDot content="評価時にペルソナが実際に書いたコメントからの原文引用です（要約ではありません）。" />
            </div>
            <p
              className="text-text-mid font-sans text-sm"
              style={{ lineHeight: 1.6, paddingLeft: 10, borderLeft: '2px solid var(--color-hairline)' }}
            >
              {suggestion.quote}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center" style={{ gap: 8 }}>
            <span className="text-text-lo font-mono" style={{ fontSize: 11, letterSpacing: 1 }}>実装プロンプト</span>
            <HelpDot content="Claude Code や Figma などの AI ツールに貼り付けて使える自己完結プロンプトです。テスト概要・改善対象はコピー時にアプリが自動で組み込みます。「内容を確認」で全文を表示できます。" />
          </div>
          <div className="flex items-center" style={{ gap: 6 }}>
            <CopyIconButton text={fullPrompt} label="コピー" />
            <button
              type="button"
              onClick={() => onViewPrompt(suggestion.title, fullPrompt)}
              className="flex items-center font-sans transition-colors hover:bg-raised"
              style={{ gap: 6, padding: '5px 10px', borderRadius: 6, fontSize: 12, border: '1px solid var(--color-hairline)', color: 'var(--color-text-mid)', background: 'transparent', cursor: 'pointer' }}
            >
              <Eye size={13} />
              内容を確認
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

export function ImprovementDrawer({ report, contextHeader, onClose }: {
  report: ImprovementReport;
  contextHeader: string;
  onClose: () => void;
}) {
  const suggestions = report.suggestions;
  const [promptModal, setPromptModal] = useState<{ title: string; text: string } | null>(null);
  const promptModalRef = useRef(promptModal);
  promptModalRef.current = promptModal;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (promptModalRef.current) setPromptModal(null);
      else onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // 表示順は A → B の固定
  const groups: { target: 'A' | 'B'; items: ImprovementSuggestion[] }[] = (['A', 'B'] as const)
    .map((target) => ({ target, items: suggestions.filter((s) => s.target === target) }))
    .filter((g) => g.items.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: 'rgba(5,6,7,0.6)' }}
      onClick={onClose}
    >
      <div
        className="flex flex-col h-full bg-surface"
        style={{ width: 560, maxWidth: '90vw', borderLeft: '1px solid var(--color-hairline)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-hairline)' }}
        >
          <div className="flex flex-col" style={{ gap: 3 }}>
            <h2 className="text-text-hi font-sans font-semibold" style={{ fontSize: 18 }}>改善提案</h2>
            <span className="text-text-lo font-mono text-xs">評価コメントと5軸スコアから生成 · 言及数順</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center transition-colors hover:bg-raised"
            style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid var(--color-hairline)', background: 'transparent', cursor: 'pointer' }}
          >
            <X size={16} className="text-text-mid" />
          </button>
        </div>

        <div className="flex flex-col flex-1 overflow-y-auto" style={{ padding: '8px 24px 16px' }}>
          {groups.map((group) => (
            <div key={group.target} className="flex flex-col">
              <div className="flex items-center" style={{ gap: 8, paddingTop: 16 }}>
                <span
                  className="inline-block"
                  style={{ width: 8, height: 8, borderRadius: 2, background: group.target === 'A' ? 'var(--color-win-a)' : 'var(--color-win-b)' }}
                />
                <span className="text-text-hi font-sans text-sm font-semibold">{group.target}案</span>
                <span className="text-text-lo font-mono text-xs">{group.items.length}件</span>
              </div>
              {group.items.map((s, i) => (
                <SuggestionRow
                  key={`${group.target}-${i}`}
                  suggestion={s}
                  index={i}
                  contextHeader={contextHeader}
                  designSummary={group.target === 'A' ? report.designSummaryA : report.designSummaryB}
                  onViewPrompt={(title, text) => setPromptModal({ title, text })}
                />
              ))}
            </div>
          ))}
          <p className="text-text-lo font-sans text-xs" style={{ lineHeight: 1.6, paddingTop: 12 }}>
            行をクリックすると実装プロンプトを確認できます。プロンプトにはテスト概要・課題の根拠・修正指示・完了条件が含まれます。
          </p>
        </div>

        <div
          className="flex-shrink-0"
          style={{ padding: '14px 24px', borderTop: '1px solid var(--color-hairline)' }}
        >
          <span className="text-text-lo font-mono text-xs">Esc または背景クリックで閉じる</span>
        </div>
      </div>

      {promptModal && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: 'rgba(5,6,7,0.7)', zIndex: 60 }}
          onClick={(e) => { e.stopPropagation(); setPromptModal(null); }}
        >
          <div
            className="flex flex-col bg-surface"
            style={{ width: 'min(760px, 92vw)', maxHeight: '82vh', borderRadius: 14, border: '1px solid var(--color-hairline)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between flex-shrink-0"
              style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-hairline)', gap: 16 }}
            >
              <div className="flex flex-col min-w-0" style={{ gap: 2 }}>
                <span className="text-text-lo font-mono" style={{ fontSize: 11, letterSpacing: 1 }}>実装プロンプト</span>
                <span className="text-text-hi font-sans text-sm font-medium truncate">{promptModal.title}</span>
              </div>
              <div className="flex items-center flex-shrink-0" style={{ gap: 6 }}>
                <CopyIconButton text={promptModal.text} label="コピー" />
                <button
                  type="button"
                  onClick={() => setPromptModal(null)}
                  className="flex items-center justify-center transition-colors hover:bg-raised"
                  style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--color-hairline)', background: 'transparent', cursor: 'pointer' }}
                >
                  <X size={15} className="text-text-mid" />
                </button>
              </div>
            </div>
            <pre
              className="text-text-mid font-mono overflow-y-auto"
              style={{ fontSize: 12.5, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, padding: '18px 22px', fontFamily: 'inherit' }}
            >
              {promptModal.text}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
