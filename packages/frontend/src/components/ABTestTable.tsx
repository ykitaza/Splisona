import { ChevronUp, ChevronDown, ChevronsUpDown, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ABTest, DesignInput } from '../types';
import { testDraft, type DesignSideData } from '../lib/testDraft';
import { API_BASE } from '../api/client';

// ─── shared sub-components ───────────────────────────────────────────────────

function DesignThumb({ input, label }: { input: DesignInput; label: string }) {
  const src = input.imageKey ? `${API_BASE}/images/${input.imageKey}` : null;
  return (
    <div
      className="overflow-hidden flex-shrink-0"
      style={{ width: 68, height: 40, borderRadius: 5, background: '#F0F1F3', border: '1px solid #E6E6E8' }}
    >
      {src && <img src={src} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
    </div>
  );
}

// ─── sort icon ───────────────────────────────────────────────────────────────

export type SortKey = 'title' | 'createdAt';
export type SortDir = 'asc' | 'desc';

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey?: SortKey; sortDir?: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={12} color="#C4C4C8" />;
  return sortDir === 'asc' ? <ChevronUp size={12} color="#666666" /> : <ChevronDown size={12} color="#666666" />;
}

// ─── draft resume helper ─────────────────────────────────────────────────────

function restoreSide(input: ABTest['designAInput']): DesignSideData | null {
  if (!input) return null;
  const { inputType, imageKey } = input;
  if (inputType === 'image_upload') {
    if (!imageKey) return null;
    return { inputType: 'image_upload', file: new File([], 'uploaded'), imageKey };
  }
  if (inputType === 'figma_url') return { inputType: 'figma_url', url: '', imageKey: imageKey ?? '' };
  if (inputType === 'site_url') return { inputType: 'site_url', url: '', imageKey: imageKey ?? '' };
  return null;
}

// ─── main component ───────────────────────────────────────────────────────────

type Props = {
  tests: ABTest[];
  mode?: 'dashboard' | 'list';
  sortKey?: SortKey;
  sortDir?: SortDir;
  onSort?: (col: SortKey) => void;
  selectionMode?: boolean;
  selected?: Set<string>;
  onToggleAll?: (checked: boolean) => void;
  onToggleOne?: (id: string) => void;
  onDelete?: (e: React.MouseEvent, id: string) => void;
  isDeleting?: boolean;
};

export function ABTestTable({
  tests,
  mode = 'list',
  sortKey,
  sortDir,
  onSort,
  selectionMode = false,
  selected,
  onToggleAll,
  onToggleOne,
  onDelete,
  isDeleting,
}: Props) {
  const navigate = useNavigate();
  const isDashboard = mode === 'dashboard';
  const selecting = !isDashboard && selectionMode;

  const hPad      = isDashboard ? '12px 20px' : '10px 16px';
  const rPad      = isDashboard ? '15px 20px' : '13px 16px';
  const dateLbl   = isDashboard ? '日付' : '日時';

  function handleRowClick(test: ABTest) {
    if (test.status === 'running') navigate(`/tests/${test.testId}/running`);
    else if (test.status === 'completed' || test.status === 'failed') navigate(`/tests/${test.testId}/report`);
    else if (test.status === 'draft') {
      const sideA = restoreSide(test.designAInput);
      const sideB = restoreSide(test.designBInput);
      const bothReady = !!sideA?.imageKey && !!sideB?.imageKey;
      testDraft.resume({ title: test.title, sideA, sideB, personaIds: test.personaIds, resumeId: test.testId });
      if (bothReady && test.personaIds.length > 0) navigate('/tests/new/confirm');
      else if (bothReady) navigate('/tests/new/personas');
      else navigate('/tests/new');
    }
  }

  const allSelected = tests.length > 0 && tests.every((t) => selected?.has(t.testId));

  // ── header ────────────────────────────────────────────────────────────────
  const SortableHdr = ({ col, label, w }: { col: SortKey; label: string; w: number }) =>
    onSort ? (
      <button
        type="button"
        className="flex items-center gap-1"
        onClick={() => onSort(col)}
        style={{ width: w, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: '0.5px' }}>{label}</span>
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </button>
    ) : (
      <div style={{ width: w, flexShrink: 0 }}>
        <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: '0.5px' }}>{label}</span>
      </div>
    );

  return (
    <div className="overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 10 }}>

      {/* Table Header */}
      <div
        className="flex items-center justify-between"
        style={{ background: '#F7F7F8', padding: hPad, position: 'relative' }}
      >
        {!isDashboard && selectionMode && (
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => onToggleAll?.(e.target.checked)}
            style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, cursor: 'pointer', accentColor: '#1A1A1A', zIndex: 1 }}
          />
        )}

        {onSort ? (
          <button
            type="button"
            className="flex items-center gap-1"
            onClick={() => onSort('title')}
            style={{ width: 210, flexShrink: 0, paddingLeft: selecting ? 24 : 0, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: '0.5px' }}>テスト名</span>
            <SortIcon col="title" sortKey={sortKey} sortDir={sortDir} />
          </button>
        ) : (
          <div style={{ width: 210, flexShrink: 0, paddingLeft: selecting ? 24 : 0 }}>
            <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: '0.5px' }}>テスト名</span>
          </div>
        )}

        <div style={{ width: 170, flexShrink: 0 }}>
          <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: '0.5px' }}>プレビュー</span>
        </div>

        <SortableHdr col="createdAt" label={dateLbl} w={120} />

        {!isDashboard && <div style={{ width: 64, flexShrink: 0 }} />}
      </div>

      {/* Rows */}
      {tests.map((test, i) => {
        const isChecked = selected?.has(test.testId) ?? false;
        return (
          <div
            key={test.testId}
            className="flex items-center justify-between group"
            style={{
              padding: rPad,
              position: 'relative',
              borderTop: i > 0 ? '1px solid #E6E6E8' : 'none',
              background: isChecked ? '#EEF2FF' : '#FFFFFF',
              cursor: 'pointer',
            }}
            onClick={() => handleRowClick(test)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleRowClick(test)}
          >
            {selecting && (
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onToggleOne?.(test.testId)}
                onClick={(e) => e.stopPropagation()}
                style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, cursor: 'pointer', accentColor: '#1A1A1A', zIndex: 1 }}
              />
            )}

            <div style={{ width: 210, flexShrink: 0, overflow: 'hidden', paddingLeft: selecting ? 24 : 0 }}>
              <span
                className="block truncate"
                style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 14, fontWeight: 500 }}
              >
                {test.title}
              </span>
            </div>

            <div className="flex items-center flex-shrink-0" style={{ width: 170, gap: 8 }}>
              <DesignThumb input={test.designAInput} label="A" />
              <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11 }}>vs</span>
              <DesignThumb input={test.designBInput} label="B" />
            </div>

            <div style={{ width: 120, flexShrink: 0 }}>
              <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 12 }}>
                {new Date(test.createdAt).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {!isDashboard && (
              <div
                style={{ width: 64, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}
                onClick={(e) => e.stopPropagation()}
              >
                {onDelete && (
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={(e) => onDelete(e, test.testId)}
                    className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
                    style={{ width: 28, height: 28, background: 'none', border: '1px solid #E6E6E8', borderRadius: 6, cursor: 'pointer' }}
                    title="削除"
                  >
                    <Trash2 size={13} color="#D64545" />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
