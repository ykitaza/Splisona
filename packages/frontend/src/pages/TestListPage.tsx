import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useABTests } from '../hooks/useABTests';
import { Search, ChevronDown, Plus, Trash2, Check, Pencil, FolderPlus, FolderMinus } from 'lucide-react';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { TestRow, MoreButton, TestRowMenu, TestRowMenuButton, TestRowMenuDivider } from '../components/TestRow';
import { listProjects, addTestToProject, removeTestFromProject } from '../api/projects';
import { updateTest } from '../api/tests';
import type { ABTest, Project } from '../types';
import { testDraft, type DesignSideData } from '../lib/testDraft';

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

function RowMenu({
  parentProject,
  allProjects,
  onRename,
  onAddToProject,
  onRemoveFromProject,
  onDelete,
}: {
  parentProject: Project | null;
  allProjects: Project[];
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
      <MoreButton onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); setSubOpen(false); }} />
      {open && (
        <TestRowMenu>
          <TestRowMenuButton
            onClick={() => { setOpen(false); onRename(); }}
            icon={<Pencil size={14} style={{ color: '#9BA1AC' }} />}
            label="名前を変更"
          />
          {(() => {
            const targets = parentProject
              ? allProjects.filter((p) => p.projectId !== parentProject.projectId)
              : allProjects;
            if (targets.length === 0 && !parentProject) return null;
            return (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSubOpen((o) => !o)}
                  className="flex items-center justify-between w-full px-4 py-2.5 font-sans text-sm transition-colors hover:bg-raised"
                  style={{ color: targets.length === 0 ? '#5B616B' : '#E1E4EA' }}
                  disabled={targets.length === 0}
                >
                  <span className="flex items-center" style={{ gap: 10 }}>
                    <FolderPlus size={14} style={{ color: '#9BA1AC' }} />
                    {parentProject ? 'プロジェクトを変更' : 'プロジェクトに追加'}
                  </span>
                  {targets.length > 0 && (
                    <ChevronDown size={12} style={{ color: '#5B616B', transform: 'rotate(-90deg)' }} />
                  )}
                </button>
                {subOpen && targets.length > 0 && (
                  <div
                    className="absolute right-full top-0 mr-1 bg-surface border border-hairline rounded-lg overflow-hidden"
                    style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.4)', minWidth: 180 }}
                  >
                    {targets.map((p) => (
                      <button
                        key={p.projectId}
                        type="button"
                        onClick={async () => {
                          if (parentProject) await onRemoveFromProject();
                          setOpen(false); setSubOpen(false); onAddToProject(p.projectId);
                        }}
                        className="flex items-center w-full px-4 py-2.5 font-sans text-sm transition-colors hover:bg-raised truncate"
                        style={{ color: '#E1E4EA' }}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
          {parentProject && (
            <TestRowMenuButton
              onClick={() => { setOpen(false); onRemoveFromProject(); }}
              icon={<FolderMinus size={14} style={{ color: '#9BA1AC' }} />}
              label="プロジェクトから削除"
            />
          )}
          <TestRowMenuDivider />
          <TestRowMenuButton
            onClick={() => { setOpen(false); onDelete(); }}
            icon={<Trash2 size={14} style={{ color: '#E5484D' }} />}
            label="削除"
            danger
          />
        </TestRowMenu>
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);
  const moveMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listProjects().then(setAllProjects);
  }, []);

  useEffect(() => {
    if (!moveMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (moveMenuRef.current && !moveMenuRef.current.contains(e.target as Node)) setMoveMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [moveMenuOpen]);

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
    setExpandedId(expandedId === test.testId ? null : test.testId);
  }

  function navigateToDraft(test: ABTest) {
    const sideA = restoreSide(test.designAInput);
    const sideB = restoreSide(test.designBInput);
    testDraft.resume({ title: test.title, sideA, sideB, personaIds: test.personaIds, resumeId: test.testId });
    navigate('/tests/new');
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div role="status" className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ width: '100%', maxWidth: 864, margin: '0 auto', padding: '48px 24px', gap: 32, height: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline" style={{ gap: 12 }}>
          <h1 className="text-text-hi font-sans font-semibold" style={{ fontSize: 24 }}>A/Bテスト</h1>
          {selectionMode ? (
            <span className="font-mono text-sm" style={{ color: '#9BA1AC' }}>{selected.size}件を選択中</span>
          ) : (
            <span className="text-text-mid font-mono text-sm">全 {tests.length} 件</span>
          )}
        </div>
        <div className="flex items-center" style={{ gap: 8 }}>
          {selectionMode ? (
            <>
              <button
                type="button"
                onClick={() => {
                  if (selected.size === filtered.length) setSelected(new Set());
                  else setSelected(new Set(filtered.map((t) => t.testId)));
                }}
                className="flex items-center border transition-colors hover:bg-raised"
                style={{ gap: 6, borderRadius: 6, padding: '8px 14px', borderColor: '#FFFFFF14' }}
              >
                <span className="font-sans font-semibold" style={{ fontSize: 13, color: '#F2F4F7' }}>すべて選択</span>
              </button>
              <div ref={moveMenuRef} className="relative">
                <button
                  type="button"
                  disabled={selected.size === 0}
                  onClick={() => setMoveMenuOpen((o) => !o)}
                  className="flex items-center border transition-colors hover:bg-raised disabled:opacity-40"
                  style={{ gap: 6, borderRadius: 6, padding: '8px 14px', borderColor: '#FFFFFF14' }}
                >
                  <span className="font-sans font-medium" style={{ fontSize: 13, color: '#F2F4F7' }}>プロジェクトに移動</span>
                </button>
                {moveMenuOpen && allProjects.length > 0 && (
                  <div
                    className="absolute right-0 top-full mt-2 bg-surface border border-hairline rounded-lg overflow-hidden z-30"
                    style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.4)', minWidth: 200 }}
                  >
                    {allProjects.map((p) => (
                      <button
                        key={p.projectId}
                        type="button"
                        onClick={async () => {
                          await Promise.all([...selected].map((tid) => addTestToProject(p.projectId, tid)));
                          setMoveMenuOpen(false);
                          exitSelectionMode();
                          refreshProjects();
                        }}
                        className="flex items-center w-full px-4 py-2.5 font-sans text-sm transition-colors hover:bg-raised truncate"
                        style={{ color: '#E1E4EA' }}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={selected.size === 0 || isDeleting}
                onClick={requestBulkDelete}
                className="flex items-center border transition-colors hover:bg-raised disabled:opacity-40"
                style={{ gap: 6, borderRadius: 6, padding: '8px 14px', borderColor: '#E06A6A', color: '#E06A6A' }}
              >
                <span className="font-sans font-medium" style={{ fontSize: 13 }}>削除</span>
              </button>
              <button
                type="button"
                onClick={exitSelectionMode}
                className="font-sans font-medium transition-colors hover:text-text-hi"
                style={{ fontSize: 13, color: '#9BA1AC', padding: '8px 14px' }}
              >
                キャンセル
              </button>
            </>
          ) : (
            <>
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
                onClick={() => setSelectionMode(true)}
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
            </>
          )}
        </div>
      </div>

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
            return (
              <TestRow
                key={test.testId}
                test={test}
                expanded={expandedId === test.testId}
                onToggleExpand={() => handleRowClick(test)}
                highlighted={isChecked}
                hideMenuOnHover={!selectionMode}
                isRenaming={renamingId === test.testId}
                renameValue={renameValue}
                onRenameChange={setRenameValue}
                onRenameSubmit={async () => {
                  if (renameValue.trim()) {
                    await updateTest(test.testId, { title: renameValue.trim() });
                    refresh();
                    setRenamingId(null);
                  }
                }}
                onRenameCancel={() => setRenamingId(null)}
                onNavigateToDraft={() => navigateToDraft(test)}
                prefix={selectionMode ? (
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 16, height: 16, borderRadius: 3,
                      background: isChecked ? '#6E78D9' : 'transparent',
                      border: isChecked ? 'none' : '1px solid #5B616B',
                    }}
                  >
                    {isChecked && <Check size={10} color="#FFFFFF" />}
                  </div>
                ) : undefined}
                titleSuffix={parent && (
                  <span className="font-sans text-text-lo flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: 11 }}>
                    {parent.name}
                  </span>
                )}
                menu={
                  <RowMenu
                    parentProject={parent}
                    allProjects={allProjects}
                    onRename={() => { setRenameValue(test.title); setRenamingId(test.testId); }}
                    onAddToProject={async (projectId) => { await addTestToProject(projectId, test.testId); refreshProjects(); }}
                    onRemoveFromProject={async () => { if (parent) { await removeTestFromProject(parent.projectId, test.testId); refreshProjects(); } }}
                    onDelete={() => setPendingDelete({ type: 'single', id: test.testId })}
                  />
                }
              />
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
