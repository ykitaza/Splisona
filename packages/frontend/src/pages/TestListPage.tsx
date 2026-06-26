import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useABTests } from '../hooks/useABTests';
import { ABTEST_STATUS_LABELS, type ABTestStatus } from '../types';
import { Plus, ArrowRight, Search, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

const STATUS_COLORS: Record<ABTestStatus, { bg: string; text: string }> = {
  draft: { bg: '#F0F1F3', text: '#666666' },
  running: { bg: '#E8F0FB', text: '#3B7DD8' },
  completed: { bg: '#E6F4EC', text: '#2E9E5B' },
  failed: { bg: '#FDEAEA', text: '#D64545' },
};

type SortKey = 'title' | 'status' | 'createdAt';
type SortDir = 'asc' | 'desc';

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={12} color="#C4C4C8" />;
  return sortDir === 'asc' ? <ChevronUp size={12} color="#666666" /> : <ChevronDown size={12} color="#666666" />;
}

const STATUS_ORDER: Record<ABTestStatus, number> = { draft: 0, running: 1, completed: 2, failed: 3 };

export function TestListPage() {
  const { tests, isLoading, deleteTest, deleteTests } = useABTests();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? tests.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            ABTEST_STATUS_LABELS[t.status].includes(q),
        )
      : tests;

    return [...base].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'title') cmp = a.title.localeCompare(b.title, 'ja');
      else if (sortKey === 'status') cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [tests, query, sortKey, sortDir]);

  function toggleSort(col: SortKey) {
    if (sortKey === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(col); setSortDir('asc'); }
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(filtered.map((t) => t.testId)) : new Set());
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleClick(testId: string, status: ABTestStatus) {
    if (status === 'running') navigate(`/tests/${testId}/running`);
    else if (status === 'completed' || status === 'failed') navigate(`/tests/${testId}/report`);
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    setIsDeleting(true);
    try {
      await deleteTests([...selected]);
      setSelected(new Set());
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSingleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await deleteTest(id);
      setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
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

  const allSelected = filtered.length > 0 && filtered.every((t) => selected.has(t.testId));
  const someSelected = selected.size > 0;

  return (
    <div className="flex flex-col gap-6 p-8 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 28, fontWeight: 600 }}>
            結果レポート
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

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 rounded-md px-3 py-2.5"
          style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 6, flex: 1, maxWidth: 340 }}
        >
          <Search size={15} color="#9A9A9F" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="テスト名・ステータスで検索"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 13 }}
          />
        </div>

        {someSelected && (
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleBulkDelete}
            className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-40"
            style={{ background: '#FDEAEA', border: '1px solid #F5C5C5', borderRadius: 6, color: '#D64545', fontFamily: 'Geist, sans-serif', fontSize: 13 }}
          >
            <Trash2 size={14} color="#D64545" />
            {selected.size}件を削除
          </button>
        )}

        <span style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 13, marginLeft: 'auto' }}>
          {filtered.length}件
        </span>
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
        <div
          className="overflow-hidden"
          style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 10 }}
        >
          {/* Table header */}
          <div className="flex items-center" style={{ background: '#F0F1F3', padding: '10px 16px' }}>
            <div style={{ width: 36, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => toggleAll(e.target.checked)}
                style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#1A1A1A' }}
              />
            </div>

            <button
              type="button"
              className="flex items-center gap-1 flex-1"
              onClick={() => toggleSort('title')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: '0.5px' }}>テスト名</span>
              <SortIcon col="title" sortKey={sortKey} sortDir={sortDir} />
            </button>

            <div style={{ width: 80, flexShrink: 0 }}>
              <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: '0.5px' }}>ペルソナ</span>
            </div>

            <button
              type="button"
              className="flex items-center gap-1"
              onClick={() => toggleSort('status')}
              style={{ width: 110, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: '0.5px' }}>ステータス</span>
              <SortIcon col="status" sortKey={sortKey} sortDir={sortDir} />
            </button>

            <button
              type="button"
              className="flex items-center gap-1"
              onClick={() => toggleSort('createdAt')}
              style={{ width: 90, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: '0.5px' }}>日付</span>
              <SortIcon col="createdAt" sortKey={sortKey} sortDir={sortDir} />
            </button>

            <div style={{ width: 64, flexShrink: 0 }} />
          </div>

          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>
                該当するテストがありません
              </p>
            </div>
          ) : (
            filtered.map((test, i) => {
              const colors = STATUS_COLORS[test.status];
              const isClickable = test.status !== 'draft';
              const isChecked = selected.has(test.testId);
              return (
                <div
                  key={test.testId}
                  className="flex items-center group"
                  style={{
                    padding: '13px 16px',
                    borderTop: i > 0 ? '1px solid #E6E6E8' : 'none',
                    background: isChecked ? '#F7F8FF' : '#FFFFFF',
                    cursor: isClickable ? 'pointer' : 'default',
                  }}
                  onClick={() => isClickable && handleClick(test.testId, test.status)}
                  role={isClickable ? 'button' : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onKeyDown={(e) => e.key === 'Enter' && isClickable && handleClick(test.testId, test.status)}
                >
                  <div
                    style={{ width: 36, flexShrink: 0, display: 'flex', alignItems: 'center' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleOne(test.testId)}
                      style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#1A1A1A' }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <span
                      className="block truncate"
                      style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 14, fontWeight: 500 }}
                    >
                      {test.title}
                    </span>
                  </div>

                  <div style={{ width: 80, flexShrink: 0 }}>
                    <span style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>
                      {test.personaIds.length}人
                    </span>
                  </div>

                  <div style={{ width: 110, flexShrink: 0 }}>
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{ background: colors.bg, color: colors.text, borderRadius: 9999, fontSize: 11 }}
                    >
                      {ABTEST_STATUS_LABELS[test.status]}
                    </span>
                  </div>

                  <div style={{ width: 90, flexShrink: 0 }}>
                    <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 12 }}>
                      {new Date(test.createdAt).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })}
                    </span>
                  </div>

                  <div
                    style={{ width: 64, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={(e) => handleSingleDelete(e, test.testId)}
                      className="flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
                      style={{ width: 28, height: 28, background: 'none', border: '1px solid #E6E6E8', borderRadius: 6, cursor: 'pointer' }}
                      title="削除"
                    >
                      <Trash2 size={13} color="#D64545" />
                    </button>
                    {isClickable && <ArrowRight size={16} color="#9A9A9F" />}
                    {!isClickable && <div style={{ width: 16 }} />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
