import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useABTests } from '../hooks/useABTests';
import { Plus, Trash2, Check, Image } from 'lucide-react';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { ABTEST_STATUS_LABELS, type ABTest, type ABTestStatus } from '../types';
import { testDraft, type DesignSideData } from '../lib/testDraft';
import { API_BASE } from '../api/client';

type SortKey = 'title' | 'status' | 'createdAt';
type SortDir = 'asc' | 'desc';
const STATUS_ORDER = { draft: 0, running: 1, completed: 2, failed: 3 };

const STATUS_COLORS: Record<ABTestStatus, { bg: string; text: string }> = {
  draft: { bg: 'var(--color-bg-raised)', text: 'var(--color-text-lo)' },
  running: { bg: 'var(--color-accent-dim)', text: 'var(--color-accent)' },
  completed: { bg: 'var(--color-win-b-dim, rgba(201,151,79,0.15))', text: 'var(--color-win-b)' },
  failed: { bg: 'var(--color-danger-dim, rgba(214,69,69,0.15))', text: 'var(--color-danger)' },
};

function StatusChip({ status }: { status: ABTestStatus }) {
  const { bg, text } = STATUS_COLORS[status];
  return (
    <span className="inline-block rounded-full px-2.5 py-0.5 font-sans text-xs font-medium" style={{ background: bg, color: text }}>
      {ABTEST_STATUS_LABELS[status]}
    </span>
  );
}

function WinnerThumb({ test }: { test: ABTest }) {
  const winner = (test as ABTest & { summary?: { winner?: string } }).summary?.winner;
  const input = winner === 'B' ? test.designBInput : test.designAInput;
  const src = input?.imageKey ? `${API_BASE}/stub-upload/${input.imageKey}` : null;
  return (
    <div className="overflow-hidden rounded flex-shrink-0" style={{ width: 48, height: 32, background: 'var(--color-bg-raised)' }}>
      {src ? (
        <img src={src} alt="サムネイル" className="w-full h-full object-cover" />
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          <Image size={14} className="text-text-lo" />
        </div>
      )}
    </div>
  );
}

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

type PendingDelete = { type: 'single'; id: string } | { type: 'bulk' };

export function TestListPage() {
  const navigate = useNavigate();
  const { tests, isLoading, deleteTest, deleteTests } = useABTests();

  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const sorted = useMemo(() => {
    return [...tests].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'title') cmp = a.title.localeCompare(b.title, 'ja');
      else if (sortKey === 'status') cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [tests, sortKey, sortDir]);

  function toggleSort(col: SortKey) {
    if (sortKey === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(col); setSortDir('asc'); }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelected(new Set());
  }

  function requestBulkDelete() {
    if (selected.size === 0) return;
    setPendingDelete({ type: 'bulk' });
  }

  function requestSingleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setPendingDelete({ type: 'single', id });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      if (pendingDelete.type === 'bulk') {
        await deleteTests([...selected]);
        exitSelectionMode();
      } else {
        const { id } = pendingDelete;
        await deleteTest(id);
        setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
      }
      setPendingDelete(null);
    } finally {
      setIsDeleting(false);
    }
  }

  function handleRowClick(test: ABTest) {
    if (test.status === 'running') navigate(`/tests/${test.testId}/running`);
    else if (test.status === 'completed' || test.status === 'failed') navigate(`/tests/${test.testId}/report`);
    else if (test.status === 'draft') {
      const sideA = restoreSide(test.designAInput);
      const sideB = restoreSide(test.designBInput);
      testDraft.resume({ title: test.title, sideA, sideB, personaIds: test.personaIds, resumeId: test.testId });
      navigate('/tests/new');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div role="status" className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-8 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-text-hi font-sans text-xl font-semibold">テスト一覧</h1>
          <p className="text-text-lo font-sans text-sm">{sorted.length}件のA/Bテスト</p>
        </div>
        <Link
          to="/tests/new"
          className="flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-white font-sans text-sm font-semibold transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          新しいA/Bテスト
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        {selectionMode ? (
          <>
            <span className="text-text-lo font-sans text-sm">{selected.size}件を選択中</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exitSelectionMode}
                className="rounded-md bg-raised border border-hairline px-3 py-1.5 text-text-mid font-sans text-sm transition-colors hover:bg-surface"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={selected.size === 0 || isDeleting}
                onClick={requestBulkDelete}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-sans text-sm font-medium transition-opacity disabled:opacity-40"
                style={{ background: 'var(--color-danger-dim, rgba(214,69,69,0.15))', color: 'var(--color-danger)' }}
              >
                <Trash2 size={13} />
                {selected.size}件を削除
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1" />
        )}
        {!selectionMode && (
          <button
            type="button"
            onClick={() => setSelectionMode(true)}
            className="flex items-center gap-1.5 rounded-md bg-raised border border-hairline px-3 py-1.5 text-text-lo font-sans text-sm transition-colors hover:bg-surface"
          >
            <Trash2 size={13} />
            一括削除
          </button>
        )}
      </div>

      {tests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-text-lo font-sans text-sm">テストがありません</p>
          <Link to="/tests/new" className="mt-3 text-accent font-sans text-sm font-medium">
            最初のテストを作成する
          </Link>
        </div>
      ) : (
        <div>
          {/* Header row */}
          <div className="flex items-center py-2.5 px-4 border-b border-hairline">
            {selectionMode && <div style={{ width: 32 }} />}
            <div style={{ width: 56 }}>
              <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: '0.5px' }}></span>
            </div>
            <div className="flex-1">
              <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: '0.5px' }}>テスト名</span>
            </div>
            <div style={{ width: 80 }}>
              <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: '0.5px' }}>ペルソナ</span>
            </div>
            <div style={{ width: 100 }}>
              <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: '0.5px' }}>ステータス</span>
            </div>
            <div style={{ width: 100 }}>
              <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: '0.5px' }}>日時</span>
            </div>
            {!selectionMode && <div style={{ width: 40 }} />}
          </div>

          {/* Rows */}
          {sorted.map((test, i) => {
            const isChecked = selected.has(test.testId);
            return (
              <div
                key={test.testId}
                role="button"
                tabIndex={0}
                onClick={() => { if (selectionMode) toggleOne(test.testId); else handleRowClick(test); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { if (selectionMode) toggleOne(test.testId); else handleRowClick(test); } }}
                className="flex items-center w-full text-left py-3.5 px-4 transition-colors hover:bg-raised cursor-pointer"
                style={{
                  borderTop: i > 0 ? '1px solid var(--color-hairline)' : 'none',
                  background: isChecked ? 'var(--color-accent-dim)' : 'transparent',
                }}
              >
                {selectionMode && (
                  <div className="flex items-center justify-center flex-shrink-0" style={{ width: 32 }}>
                    <div
                      className="flex items-center justify-center w-4 h-4 rounded"
                      style={{
                        background: isChecked ? 'var(--color-accent)' : 'transparent',
                        border: isChecked ? 'none' : '1.5px solid var(--color-text-lo)',
                      }}
                    >
                      {isChecked && <Check size={10} color="#FFFFFF" />}
                    </div>
                  </div>
                )}
                <div style={{ width: 56 }}>
                  <WinnerThumb test={test} />
                </div>
                <div className="flex-1 min-w-0 pr-3">
                  <span className="block truncate text-text-hi font-sans text-sm font-medium">{test.title}</span>
                </div>
                <div style={{ width: 80 }}>
                  <span className="text-text-mid font-sans text-sm">{test.personaIds.length}人</span>
                </div>
                <div style={{ width: 100 }}>
                  <StatusChip status={test.status} />
                </div>
                <div style={{ width: 100 }}>
                  <span className="text-text-lo font-mono text-xs">
                    {new Date(test.createdAt).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {!selectionMode && (
                  <div style={{ width: 40 }} className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={(e) => requestSingleDelete(e, test.testId)}
                      className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md border border-hairline disabled:opacity-30"
                      style={{ width: 28, height: 28 }}
                      title="削除"
                    >
                      <Trash2 size={13} className="text-danger" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pendingDelete && (
        <ConfirmDeleteModal
          count={pendingDelete.type === 'bulk' ? selected.size : 1}
          isDeleting={isDeleting}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
