import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Plus, MoreVertical, Pencil, Trash2, FolderMinus, X } from 'lucide-react';
import { getProjectDetail, updateProject, deleteProject, removeTestFromProject } from '../api/projects';
import { updateTest, deleteTest as apiDeleteTest } from '../api/tests';
import { API_BASE } from '../api/client';
import { testDraft } from '../lib/testDraft';
import type { ProjectDetail, ABTest, DesignInput } from '../types';

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes} 分前`;
  if (hours < 24) return `${hours} 時間前`;
  if (days < 7) return `${days} 日前`;
  if (days < 30) return `${Math.floor(days / 7)} 週間前`;
  return new Date(dateStr).toLocaleDateString('ja-JP');
}

function ProjectMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-raised"
      >
        <MoreVertical size={16} style={{ color: '#5B616B' }} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 bg-surface border border-hairline rounded-lg overflow-hidden z-20"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.4)', minWidth: 160 }}
        >
          <button
            type="button"
            onClick={() => { setOpen(false); onEdit(); }}
            className="flex items-center w-full px-4 py-2.5 font-sans text-sm transition-colors hover:bg-raised"
            style={{ gap: 10, color: '#E1E4EA' }}
          >
            <Pencil size={14} style={{ color: '#9BA1AC' }} />
            詳細を編集
          </button>
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

function EditProjectModal({ project, onClose, onSave }: {
  project: { projectId: string; name: string; description: string };
  onClose: () => void;
  onSave: (updated: { name: string; description: string }) => void;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      await updateProject(project.projectId, { name: name.trim(), description: description.trim() });
      onSave({ name: name.trim(), description: description.trim() });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: '#05060799' }}
      onClick={onClose}
    >
      <div
        className="flex flex-col bg-surface"
        style={{ width: 520, borderRadius: 14, border: '1px solid var(--color-hairline)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', padding: '32px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-text-hi font-sans font-semibold" style={{ fontSize: 20 }}>詳細を編集</h2>
          <button type="button" onClick={onClose} className="flex items-center justify-center w-7 h-7 rounded-md transition-colors hover:bg-raised">
            <X size={16} className="text-text-lo" />
          </button>
        </div>
        <div className="flex flex-col" style={{ gap: 20 }}>
          <div className="flex flex-col" style={{ gap: 8 }}>
            <label className="font-sans font-semibold text-text-hi" style={{ fontSize: 14 }}>名前</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              autoFocus
              className="bg-raised border border-hairline rounded-lg outline-none font-sans text-text-hi transition-colors focus:border-accent"
              style={{ padding: '10px 14px', fontSize: 14 }}
            />
          </div>
          <div className="flex flex-col" style={{ gap: 8 }}>
            <label className="font-sans font-semibold text-text-hi" style={{ fontSize: 14 }}>説明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="bg-raised border border-hairline rounded-lg outline-none font-sans text-text-hi resize-y transition-colors focus:border-accent"
              style={{ padding: '10px 14px', fontSize: 14 }}
            />
          </div>
        </div>
        <div className="flex items-center justify-end mt-6" style={{ gap: 12 }}>
          <button type="button" onClick={onClose} className="font-sans font-medium rounded-lg transition-colors hover:bg-raised" style={{ padding: '8px 20px', fontSize: 14, color: '#9BA1AC' }}>
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim() || submitting}
            className="font-sans font-semibold rounded-lg transition-opacity disabled:opacity-40"
            style={{ padding: '8px 20px', fontSize: 14, color: '#0A0B0D', background: '#F2F4F7' }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function DesignThumb({ imageKey, label }: { imageKey?: string; label: string }) {
  const src = imageKey ? `${API_BASE}/images/${imageKey}` : null;
  return (
    <div
      className="overflow-hidden flex-shrink-0"
      style={{ width: 200, height: 120, borderRadius: 6, background: '#1C1F23' }}
    >
      {src && <img src={src} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
    </div>
  );
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    getProjectDetail(id)
      .then((d) => {
        if (d.tests.length === 0) {
          navigate(`/tests/new?projectId=${id}`, { replace: true });
          return;
        }
        setDetail(d);
        setNameValue(d.project.name);
      })
      .catch(() => navigate('/projects', { replace: true }))
      .finally(() => setIsLoading(false));
  }, [id, navigate]);

  async function saveName() {
    if (!id || !detail || !nameValue.trim()) return;
    const updated = await updateProject(id, { name: nameValue.trim() });
    setDetail({ ...detail, project: { ...detail.project, ...updated } });
    setEditingName(false);
  }

  if (isLoading || !detail) {
    return (
      <div className="flex items-center justify-center h-full">
        <div role="status" className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  const { project, tests } = detail;
  const sorted = [...tests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const latest = sorted[0];
  const past = sorted.slice(1);

  const firstDate = sorted.length > 0
    ? new Date(sorted[sorted.length - 1].createdAt).toLocaleDateString('ja-JP')
    : null;

  return (
    <div className="flex flex-col" style={{ padding: '48px 128px', gap: 32, height: '100%' }}>
      {editModalOpen && (
        <EditProjectModal
          project={project}
          onClose={() => setEditModalOpen(false)}
          onSave={(updated) => {
            setDetail({ ...detail, project: { ...project, ...updated } });
            setNameValue(updated.name);
            setEditModalOpen(false);
          }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col" style={{ gap: 16 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center" style={{ gap: 8 }}>
            <Link to="/projects" className="text-text-lo font-sans text-sm hover:text-text-mid transition-colors">
              プロジェクト
            </Link>
            <ChevronLeft size={12} className="text-text-lo" style={{ transform: 'rotate(180deg)' }} />
            <span className="text-text-mid font-sans text-sm">{project.name}</span>
          </div>
          <ProjectMenu
            onEdit={() => setEditModalOpen(true)}
            onDelete={async () => {
              await deleteProject(project.projectId);
              navigate('/projects', { replace: true });
            }}
          />
        </div>

        <div className="flex items-start justify-between">
          <div className="flex flex-col" style={{ gap: 8 }}>
            {editingName ? (
              <input
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                autoFocus
                className="bg-transparent border-0 outline-none text-text-hi font-sans font-semibold"
                style={{ fontSize: 28 }}
              />
            ) : (
              <h1
                className="text-text-hi font-sans font-semibold cursor-pointer"
                style={{ fontSize: 28 }}
                onClick={() => setEditingName(true)}
              >
                {project.name}
              </h1>
            )}
            <span className="text-text-lo font-mono" style={{ fontSize: 13 }}>
              {tests.length} イテレーション
              {firstDate && ` · 開始 ${firstDate}`}
              {tests.length > 0 && ` · 最終更新 ${relativeDate(sorted[0].updatedAt)}`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (latest) {
                const toSide = (input: DesignInput) => {
                  if (input.inputType === 'figma_url') return { inputType: 'figma_url' as const, url: input.figmaUrl ?? '', imageKey: input.imageKey ?? '' };
                  if (input.inputType === 'site_url') return { inputType: 'site_url' as const, url: input.siteUrl ?? '', imageKey: input.imageKey ?? '' };
                  return { inputType: 'image_upload' as const, file: new File([], ''), imageKey: input.imageKey ?? '' };
                };
                testDraft.resume({
                  title: '',
                  sideA: toSide(latest.designAInput),
                  sideB: toSide(latest.designBInput),
                  personaIds: latest.personaIds,
                });
              }
              navigate(`/tests/new?projectId=${id}`);
            }}
            className="flex items-center border transition-colors hover:bg-raised"
            style={{ gap: 8, borderRadius: 6, padding: '8px 12px', borderColor: '#FFFFFF14', background: '#6E78D90F' }}
          >
            <Plus size={14} style={{ color: '#F2F4F7' }} />
            <span className="font-sans font-semibold" style={{ fontSize: 13, color: '#F2F4F7' }}>次のテストを作成</span>
          </button>
        </div>
      </div>

      {/* Latest entry (hero) */}
      {latest && <LatestEntry test={latest} index={tests.length} />}

      {/* Past iterations */}
      {past.length > 0 && (
        <>
          <span className="font-mono text-text-lo" style={{ fontSize: 10, letterSpacing: 0.5 }}>
            過去のイテレーション
          </span>
          <div className="flex flex-col">
            {past.map((test, i) => (
              <PastEntry
                key={test.testId}
                test={test}
                index={tests.length - 1 - i}
                projectId={project.projectId}
                onRemoved={() => {
                  setDetail({ ...detail, project: { ...project, testIds: project.testIds.filter((tid) => tid !== test.testId) }, tests: tests.filter((t) => t.testId !== test.testId) });
                }}
                onDeleted={() => {
                  setDetail({ ...detail, project: { ...project, testIds: project.testIds.filter((tid) => tid !== test.testId) }, tests: tests.filter((t) => t.testId !== test.testId) });
                }}
                onRenamed={(newTitle) => {
                  setDetail({ ...detail, tests: tests.map((t) => t.testId === test.testId ? { ...t, title: newTitle } : t) });
                }}
              />
            ))}
          </div>
        </>
      )}

    </div>
  );
}

function LatestEntry({ test, index }: { test: ABTest; index: number }) {
  return (
    <div
      className="flex" style={{ gap: 16, padding: '24px 8px', borderBottom: '1px solid #FFFFFF14' }}
    >
      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 32, gap: 2, paddingTop: 4 }}>
        <span className="font-mono text-text-mid font-semibold" style={{ fontSize: 12 }}>#{index}</span>
        <span className="font-mono text-text-lo" style={{ fontSize: 10 }}>
          {new Date(test.createdAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
        </span>
      </div>
      <div className="flex flex-col flex-1" style={{ gap: 16 }}>
        <span className="font-sans text-text-hi font-semibold" style={{ fontSize: 20 }}>{test.title}</span>
        <div className="flex items-center" style={{ gap: 12 }}>
          <DesignThumb imageKey={test.designAInput?.imageKey} label="A" />
          <span className="text-text-lo" style={{ fontSize: 14 }}>→</span>
          <DesignThumb imageKey={test.designBInput?.imageKey} label="B" />
        </div>
        {test.status === 'completed' && (
          <Link
            to={`/tests/${test.testId}/report`}
            className="font-sans font-medium text-accent"
            style={{ fontSize: 13 }}
          >
            詳細レポートを見る →
          </Link>
        )}
      </div>
    </div>
  );
}

function PastEntry({ test, index, projectId, onRemoved, onDeleted, onRenamed }: {
  test: ABTest; index: number; projectId: string;
  onRemoved: () => void; onDeleted: () => void; onRenamed: (title: string) => void;
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <div className="flex flex-col" style={{ borderBottom: '1px solid #FFFFFF14' }}>
      <div
        className="group flex items-center cursor-pointer transition-[background-color] duration-150 hover:bg-[#1C1F26]"
        style={{ gap: 16, padding: '0 8px', height: 48, borderRadius: 8 }}
        onClick={() => { if (!isRenaming) setExpanded((e) => !e); }}
      >
        <div className="flex flex-col items-center flex-shrink-0" style={{ width: 32, gap: 2 }}>
          <span className="font-mono text-text-mid" style={{ fontSize: 12 }}>#{index}</span>
          <span className="font-mono text-text-lo" style={{ fontSize: 10 }}>
            {new Date(test.createdAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
          </span>
        </div>
        <div className="flex flex-col flex-1 min-w-0" style={{ gap: 2 }}>
          {isRenaming ? (
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && renameValue.trim()) {
                  await updateTest(test.testId, { title: renameValue.trim() });
                  onRenamed(renameValue.trim());
                  setIsRenaming(false);
                }
                if (e.key === 'Escape') setIsRenaming(false);
              }}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="bg-raised border border-hairline rounded-md outline-none font-sans text-text-hi transition-colors focus:border-accent"
              style={{ padding: '4px 10px', fontSize: 14, width: 280 }}
            />
          ) : (
            <span className="font-sans text-text-hi font-medium truncate" style={{ fontSize: 14 }}>
              {test.title}
            </span>
          )}
        </div>
        <span className="font-mono text-text-lo flex-shrink-0 group-hover:hidden" style={{ fontSize: 12 }}>
          {relativeDate(test.createdAt)}
        </span>
        <div ref={menuRef} className="relative flex-shrink-0 hidden group-hover:block">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
            className="flex items-center justify-center w-5 h-5 rounded transition-colors hover:bg-surface"
          >
            <MoreVertical size={14} style={{ color: '#9BA1AC' }} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 bg-surface border border-hairline rounded-lg overflow-hidden z-30"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.4)', minWidth: 200 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setRenameValue(test.title); setIsRenaming(true); }}
                className="flex items-center w-full px-4 py-2.5 font-sans text-sm transition-colors hover:bg-raised"
                style={{ gap: 10, color: '#E1E4EA' }}
              >
                <Pencil size={14} style={{ color: '#9BA1AC' }} />
                名前を変更
              </button>
              <button
                type="button"
                onClick={async () => { setMenuOpen(false); await removeTestFromProject(projectId, test.testId); onRemoved(); }}
                className="flex items-center w-full px-4 py-2.5 font-sans text-sm transition-colors hover:bg-raised"
                style={{ gap: 10, color: '#E1E4EA' }}
              >
                <FolderMinus size={14} style={{ color: '#9BA1AC' }} />
                プロジェクトから削除
              </button>
              <div style={{ height: 1, background: '#FFFFFF14', margin: '0 12px' }} />
              <button
                type="button"
                onClick={async () => { setMenuOpen(false); await apiDeleteTest(test.testId); onDeleted(); }}
                className="flex items-center w-full px-4 py-2.5 font-sans text-sm transition-colors hover:bg-raised"
                style={{ gap: 10, color: '#E5484D' }}
              >
                <Trash2 size={14} style={{ color: '#E5484D' }} />
                削除
              </button>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col" style={{ padding: '8px 8px 16px 56px', gap: 12 }}>
          <div className="flex items-center" style={{ gap: 12 }}>
            <DesignThumb imageKey={test.designAInput?.imageKey} label="A" />
            <span className="text-text-lo" style={{ fontSize: 14 }}>→</span>
            <DesignThumb imageKey={test.designBInput?.imageKey} label="B" />
          </div>
          <div className="flex items-center" style={{ gap: 12 }}>
            {test.status === 'completed' && (
              <button
                type="button"
                onClick={() => navigate(`/tests/${test.testId}/report`)}
                className="font-sans font-medium text-accent"
                style={{ fontSize: 13 }}
              >
                詳細レポートを見る →
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setExpanded(false)}
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
