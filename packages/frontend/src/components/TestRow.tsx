import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MoreVertical, X } from 'lucide-react';
import { API_BASE } from '../api/client';
import type { ABTest } from '../types';

export function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes} 分前`;
  if (hours < 24) return `${hours} 時間前`;
  if (days < 30) return `${days} 日前`;
  return new Date(dateStr).toLocaleDateString('ja-JP');
}

export interface TestRowProps {
  test: ABTest;
  expanded: boolean;
  onToggleExpand: () => void;
  prefix?: ReactNode;
  titleSuffix?: ReactNode;
  menu?: ReactNode;
  hideMenuOnHover?: boolean;
  highlighted?: boolean;
  isRenaming?: boolean;
  renameValue?: string;
  onRenameChange?: (value: string) => void;
  onRenameSubmit?: () => void;
  onRenameCancel?: () => void;
  onNavigateToDraft?: () => void;
  expandPadding?: string;
  borderBottom?: boolean;
  expandExtra?: ReactNode;
}

export function TestRow({
  test,
  expanded,
  onToggleExpand,
  prefix,
  titleSuffix,
  menu,
  hideMenuOnHover = true,
  highlighted,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  onNavigateToDraft,
  expandPadding = '8px 12px 16px 12px',
  borderBottom,
  expandExtra,
}: TestRowProps) {
  const thumbA = test.designAInput?.imageKey ? `${API_BASE}/images/${test.designAInput.imageKey}` : null;
  const thumbB = test.designBInput?.imageKey ? `${API_BASE}/images/${test.designBInput.imageKey}` : null;

  return (
    <div className="flex flex-col" style={borderBottom ? { borderBottom: '1px solid #FFFFFF14' } : undefined}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => { if (!isRenaming) onToggleExpand(); }}
        onKeyDown={(e) => { if (e.key === 'Enter' && !isRenaming) onToggleExpand(); }}
        className="group flex items-center cursor-pointer transition-[background-color] duration-150 hover:bg-[#1C1F26]"
        style={{
          gap: 16,
          padding: '0 12px',
          height: 48,
          marginInline: -4,
          borderRadius: 10,
          background: highlighted ? '#6E78D926' : undefined,
        }}
      >
        {prefix}
        <div className="flex items-center flex-1 min-w-0" style={{ gap: 8 }}>
          {isRenaming ? (
            <input
              type="text"
              value={renameValue}
              onChange={(e) => onRenameChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onRenameSubmit?.();
                if (e.key === 'Escape') onRenameCancel?.();
              }}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="bg-raised border border-hairline rounded-md outline-none font-sans text-text-hi transition-colors focus:border-accent"
              style={{ padding: '4px 10px', fontSize: 14, width: 320 }}
            />
          ) : (
            <>
              <span className="font-sans font-medium min-w-0 truncate" style={{ fontSize: 14, color: '#F2F4F7' }}>{test.title}</span>
              {titleSuffix}
            </>
          )}
        </div>
        {hideMenuOnHover ? (
          <>
            <span className="font-mono text-text-lo flex-shrink-0 group-hover:hidden" style={{ fontSize: 13, width: 96, textAlign: 'right' }}>
              {relativeDate(test.createdAt)}
            </span>
            <div className="hidden group-hover:block">
              {menu}
            </div>
          </>
        ) : (
          <>
            <span className="font-mono text-text-lo flex-shrink-0" style={{ fontSize: 13, width: 96, textAlign: 'right' }}>
              {relativeDate(test.createdAt)}
            </span>
          </>
        )}
      </div>

      {expanded && (
        <div className="flex flex-col" style={{ padding: expandPadding, gap: 12 }}>
          <div className="flex items-center" style={{ gap: 12 }}>
            <div className="overflow-hidden flex-shrink-0 flex" style={{ width: 200, height: 120, borderRadius: 6, background: '#1C1F23' }}>
              <div className="flex-shrink-0" style={{ width: 3, background: '#6E78D9' }} />
              <div className="flex-1 min-w-0" style={{ overflow: 'hidden' }}>
                {thumbA && <img src={thumbA} alt="A" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
            </div>
            <span className="text-text-lo" style={{ fontSize: 14 }}>→</span>
            <div className="overflow-hidden flex-shrink-0 flex" style={{ width: 200, height: 120, borderRadius: 6, background: '#1C1F23' }}>
              <div className="flex-shrink-0" style={{ width: 3, background: '#C9974F' }} />
              <div className="flex-1 min-w-0" style={{ overflow: 'hidden' }}>
                {thumbB && <img src={thumbB} alt="B" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
            </div>
          </div>
          {expandExtra}
          <div className="flex items-center" style={{ gap: 12 }}>
            {(test.status === 'completed' || test.status === 'failed') && (
              <Link to={`/tests/${test.testId}/report`} className="font-sans font-medium text-accent" style={{ fontSize: 13 }}>
                詳細レポートを見る →
              </Link>
            )}
            {test.status === 'running' && (
              <Link to={`/tests/${test.testId}/running`} className="font-sans font-medium text-accent" style={{ fontSize: 13 }}>
                実行状況を見る →
              </Link>
            )}
            {test.status === 'draft' && onNavigateToDraft && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onNavigateToDraft(); }}
                className="font-sans font-medium text-accent"
                style={{ fontSize: 13 }}
              >
                編集を続ける →
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
              className="flex items-center justify-center w-6 h-6 rounded-md transition-colors hover:bg-raised"
            >
              <X size={14} className="text-text-lo" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TestRowMenu({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className="absolute right-0 top-full mt-1 bg-surface border border-hairline rounded-lg overflow-visible z-30"
      style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.4)', minWidth: 200 }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function TestRowMenuButton({
  onClick,
  icon,
  label,
  danger,
}: {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center w-full px-4 py-2.5 font-sans text-sm transition-colors hover:bg-raised"
      style={{ gap: 10, color: danger ? '#E5484D' : '#E1E4EA' }}
    >
      {icon}
      {label}
    </button>
  );
}

export function TestRowMenuDivider() {
  return <div style={{ height: 1, background: '#FFFFFF14', margin: '0 12px' }} />;
}

export function MoreButton({
  onClick,
}: {
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center w-5 h-5 rounded transition-colors hover:bg-surface"
    >
      <MoreVertical size={14} style={{ color: '#9BA1AC' }} />
    </button>
  );
}
