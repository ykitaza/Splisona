import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useABTests } from '../hooks/useABTests';
import { Search, ChevronDown, Plus, Trash2, Check, MoreVertical, Pencil, FolderPlus, FolderMinus } from 'lucide-react';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { listProjects, addTestToProject, removeTestFromProject } from '../api/projects';
import { updateTest } from '../api/tests';
import type { ABTest, Project } from '../types';
import { testDraft, type DesignSideData } from '../lib/testDraft';

function relativeDate(dateStr: string): string {
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

function TestRowMenu({
  testId,
  parentProject,
  availableProjects,
  onRename,
  onAddToProject,
  onRemoveFromProject,
  onDelete,
}: {
  testId: string;
  parentProject: Project | null;
  availableProjects: Project[];
  onRename: () => void;
  onAddToProject: (projectId: string) => void;
  onRemoveFromProject: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSubOpen(false); }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); setSubOpen(false); }}
        className="flex items-center justify-center w-7 h-7 rounded-md transition-colors hover:bg-surface"
      >
        <MoreVertical size={15} style={{ color: '#9BA1AC' }} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 bg-surface border border-hairline rounded-lg overflow-visible z-30"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.4)', minWidth: 200 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => { setOpen(false); onRename(); }}
            className="flex items-center w-full px-4 py-2.5 font-sans text-sm transition-colors hover:bg-raised"
            style={{ gap: 10, color: '#E1E4EA' }}
          >
            <Pencil size={14} style={{ color: '#9BA1AC' }} />
            名前を変更
          </button>

          {parentProject ? (
            <button
              type="button"
              onClick={() => { setOpen(false); onRemoveFromProject(); }}
              className="flex items-center w-full px-4 py-2.5 font-sans text-sm transition-colors hover:bg-raised"
              style={{ gap: 10, color: '#E1E4EA' }}
            >
              <FolderMinus size={14} style={{ color: '#9BA1AC' }} />
              プロジェクトから削除
            </button>
          ) : availableProjects.length > 0 ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setSubOpen((o) => !o)}
                className="flex items-center justify-between w-full px-4 py-2.5 font-sans text-sm transition-colors hover:bg-raised"
                style={{ color: '#E1E4EA' }}
              >
                <span className="flex items-center" style={{ gap: 10 }}>
                  <FolderPlus size={14} style={{ color: '#9BA1AC' }} />
                  プロジェクトに追加
                </span>
                <ChevronDown size={12} style={{ color: '#5B616B', transform: 'rotate(-90deg)' }} />
              </button>
              {subOpen && (
                <div
                  className="absolute right-full top-0 mr-1 bg-surface border border-hairline rounded-lg overflow-hidden"
                  style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.4)', minWidth: 180 }}
                >
                  {availableProjects.map((p) => (
                    <button
                      key={p.projectId}
                      type="button"
                      onClick={() => { setOpen(false); setSubOpen(false); onAddToProject(p.projectId); }}
                      className="flex items-center w-full px-4 py-2.5 font-sans text-sm transition-colors hover:bg-raised truncate"
                      style={{ color: '#E1E4EA' }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div style={{ height: 1, background: '#FFFFFF14', margin: '0 12px' }} />
          <button
            type="button"
            onClick={() => { setOpen(false); onDelete(); }}
            className="flex items-center w-full px-4 py-2.5 font-sans text-sm transition-colors hover:bg-raised"
            style={{ gap: 10, color: '#E5484D' }}
          >
            <Trash2 size={14} style={{ color: '#E5484D' }} />
            削除
          </button>
        </div>
      )}
    </div>
  );
}

type PendingDelete = { type: 'single'; id: string } | { type: 'bulk' };

export function TestListPage() {
  const navigate = useNavigate();
  const { tests, isLoading, deleteTest, deleteTests, refresh } = useABTests();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    listProjects().then(setAllProjects);
  }, []);

  function findParentProject(testId: string): Project | null {
    return allProjects.find((p) => p.testIds.includes(testId)) ?? null;
  }

  async function refreshProjects() {
    const projects = await listProjects();
    setAllProjects(projects);
  }

  const filtered = useMemo(() => {
    const sorted = [...tests].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter((t) => t.title.toLowerCase().includes(q));
  }, [tests, searchQuery]);

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
    if (selectionMode) { toggleOne(test.testId); return; }
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
    <div className="flex flex-col" style={{ padding: '48px 128px', gap: 32, height: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline" style={{ gap: 12 }}>
          <h1 className="text-text-hi font-sans font-semibold" style={{ fontSize: 24 }}>A/Bテスト</h1>
          <span className="text-text-mid font-mono text-sm">全 {tests.length} 件</span>
        </div>
        <div className="flex items-center" style={{ gap: 8 }}>
          <button
            type="button"
            className="flex items-center border transition-colors hover:bg-raised"
            style={{ gap: 6, borderRadius: 6, padding: '8px 14px', borderColor: '#FFFFFF14' }}
          >
            <span className="font-sans" style={{ fontSize: 13, color: '#9BA1AC' }}>絞り込み</span>
            <span className="font-sans font-semibold" style={{ fontSize: 13, color: '#F2F4F7' }}>すべて</span>
            <ChevronDown size={14} style={{ color: '#5B616B' }} />
          </button>
          <button
            type="button"
            onClick={() => { if (selectionMode) exitSelectionMode(); else setSelectionMode(true); }}
            className="flex items-center border transition-colors hover:bg-raised"
            style={{ gap: 6, borderRadius: 6, padding: '8px 14px', borderColor: '#FFFFFF14' }}
          >
            <span className="font-sans font-medium" style={{ fontSize: 13, color: '#F2F4F7' }}>テストを選択</span>
          </button>
          <Link
            to="/tests/new"
            className="flex items-center border transition-colors hover:bg-raised"
            style={{ gap: 8, borderRadius: 6, padding: '8px 14px', borderColor: '#FFFFFF14' }}
          >
            <Plus size={14} style={{ color: '#F2F4F7' }} />
            <span className="font-sans font-semibold" style={{ fontSize: 13, color: '#F2F4F7' }}>新規テスト</span>
          </Link>
        </div>
      </div>

      {/* Selection toolbar */}
      {selectionMode && (
        <div className="flex items-center justify-between">
          <span className="font-mono" style={{ fontSize: 13, color: '#9BA1AC' }}>{selected.size}件を選択中</span>
          <div className="flex items-center" style={{ gap: 12 }}>
            <button
              type="button"
              onClick={exitSelectionMode}
              className="flex items-center border transition-colors hover:bg-raised"
              style={{ gap: 6, borderRadius: 6, padding: '8px 14px', borderColor: '#FFFFFF14', color: '#9BA1AC' }}
            >
              <span className="font-sans" style={{ fontSize: 13 }}>キャンセル</span>
            </button>
            <button
              type="button"
              disabled={selected.size === 0 || isDeleting}
              onClick={requestBulkDelete}
              className="flex items-center border transition-colors disabled:opacity-40"
              style={{ gap: 6, borderRadius: 6, padding: '8px 14px', borderColor: '#E06A6A', color: '#E06A6A' }}
            >
              <Trash2 size={14} />
              <span className="font-sans" style={{ fontSize: 13 }}>{selected.size}件を削除</span>
            </button>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div
        className="flex items-center"
        style={{ gap: 8, borderRadius: 10, padding: '12px 16px', background: '#1C1F23' }}
      >
        <Search size={16} style={{ color: '#5B616B', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="テストを検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent border-0 outline-none font-sans"
          style={{ fontSize: 14, color: '#F2F4F7' }}
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-text-lo font-sans text-sm">
            {tests.length === 0 ? 'テストがありません' : '一致するテストがありません'}
          </p>
          {tests.length === 0 && (
            <Link to="/tests/new" className="mt-3 text-accent font-sans text-sm font-medium">
              最初のテストを作成する
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="flex items-center" style={{ gap: 32, padding: '10px 8px', borderBottom: '1px solid #FFFFFF14' }}>
            {selectionMode && <div style={{ width: 16 }} />}
            <span className="font-mono text-text-lo flex-1" style={{ fontSize: 10, letterSpacing: 0.5 }}>テスト名</span>
            <span className="font-mono text-text-lo" style={{ fontSize: 10, letterSpacing: 0.5, width: 96, textAlign: 'right' }}>日時</span>
          </div>
          {filtered.map((test) => {
            const isChecked = selected.has(test.testId);
            const parent = findParentProject(test.testId);
            const isRenaming = renamingId === test.testId;
            return (
              <div
                key={test.testId}
                role="button"
                tabIndex={0}
                onClick={() => { if (!isRenaming) handleRowClick(test); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !isRenaming) handleRowClick(test); }}
                className="group flex items-center cursor-pointer transition-[background-color] duration-150 hover:bg-[#1C1F26]"
                style={{
                  gap: 16,
                  padding: '12px 12px',
                  marginInline: -4,
                  borderRadius: 10,
                  background: isChecked ? '#6E78D926' : undefined,
                }}
              >
                {selectionMode && (
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 3,
                      background: isChecked ? '#6E78D9' : 'transparent',
                      border: isChecked ? 'none' : '1px solid #5B616B',
                    }}
                  >
                    {isChecked && <Check size={10} color="#FFFFFF" />}
                  </div>
                )}
                <div className="flex flex-col flex-1 min-w-0" style={{ gap: 2 }}>
                  {isRenaming ? (
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && renameValue.trim()) {
                          await updateTest(test.testId, { title: renameValue.trim() });
                          refresh();
                          setRenamingId(null);
                        }
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="bg-raised border border-hairline rounded-md outline-none font-sans text-text-hi transition-colors focus:border-accent"
                      style={{ padding: '4px 10px', fontSize: 14, width: 320 }}
                    />
                  ) : (
                    <span className="font-sans font-medium min-w-0 truncate" style={{ fontSize: 14, color: '#F2F4F7' }}>{test.title}</span>
                  )}
                  {parent && !isRenaming && (
                    <span className="font-sans text-text-lo truncate opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: 11 }}>
                      {parent.name}
                    </span>
                  )}
                </div>
                <span className="font-mono text-text-lo flex-shrink-0" style={{ fontSize: 13, width: 96, textAlign: 'right' }}>{relativeDate(test.createdAt)}</span>
                {!selectionMode && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <TestRowMenu
                      testId={test.testId}
                      parentProject={parent}
                      availableProjects={allProjects.filter((p) => !p.testIds.includes(test.testId))}
                      onRename={() => { setRenameValue(test.title); setRenamingId(test.testId); }}
                      onAddToProject={async (projectId) => {
                        await addTestToProject(projectId, test.testId);
                        refreshProjects();
                      }}
                      onRemoveFromProject={async () => {
                        if (parent) {
                          await removeTestFromProject(parent.projectId, test.testId);
                          refreshProjects();
                        }
                      }}
                      onDelete={() => setPendingDelete({ type: 'single', id: test.testId })}
                    />
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
