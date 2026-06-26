import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useABTests } from '../hooks/useABTests';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { ABTestTable, type SortKey, type SortDir } from '../components/ABTestTable';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';

const STATUS_ORDER = { draft: 0, running: 1, completed: 2, failed: 3 };

/** 削除確認モーダルの対象 */
type PendingDelete = { type: 'single'; id: string } | { type: 'bulk' };

export function TestListPage() {
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

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(sorted.map((t) => t.testId)) : new Set());
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div role="status" className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-8 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-2.5">
        <Link
          to="/dashboard"
          className="flex items-center gap-1.5 w-fit transition-opacity hover:opacity-70"
          style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 13 }}
        >
          <ArrowLeft size={13} color="#9A9A9F" />
          ダッシュボード
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 28, fontWeight: 600 }}>
              テスト一覧
            </h1>
            <p style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 14 }}>
              A/B テスト一覧
            </p>
          </div>
          <Link
            to="/tests/new"
            className="flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
            style={{ background: '#0A0A0A', borderRadius: 6 }}
          >
            <Plus size={16} color="#FFFFFF" />
            新しいA/Bテスト
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        {selectionMode ? (
          <>
            <span style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>
              {selected.size}件を選択中
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exitSelectionMode}
                className="flex items-center rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-[#F0F1F3]"
                style={{ border: '1px solid #E6E6E8', borderRadius: 6, color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 13, background: 'none', cursor: 'pointer' }}
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={selected.size === 0 || isDeleting}
                onClick={requestBulkDelete}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: '#FDEAEA', border: '1px solid #F5C5C5', borderRadius: 6, color: '#D64545', fontFamily: 'Geist, sans-serif', fontSize: 13, cursor: 'pointer' }}
              >
                <Trash2 size={13} color="#D64545" />
                {selected.size}件を削除
              </button>
            </div>
          </>
        ) : (
          <>
            <span style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>
              {sorted.length}件
            </span>
            <button
              type="button"
              onClick={() => setSelectionMode(true)}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors hover:bg-[#F0F1F3]"
              style={{ border: '1px solid #E6E6E8', borderRadius: 6, color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 13, background: 'none', cursor: 'pointer' }}
            >
              <Trash2 size={13} color="#9A9A9F" />
              一括削除
            </button>
          </>
        )}
      </div>

      {tests.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20"
          style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 10 }}
        >
          <p style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 14 }}>テストがありません</p>
          <Link to="/tests/new" className="mt-3 text-sm font-medium" style={{ color: '#3B7DD8' }}>
            最初のテストを作成する
          </Link>
        </div>
      ) : (
        <ABTestTable
          tests={sorted}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggleSort}
          selectionMode={selectionMode}
          selected={selected}
          onToggleAll={toggleAll}
          onToggleOne={toggleOne}
          onDelete={requestSingleDelete}
          isDeleting={isDeleting}
        />
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
