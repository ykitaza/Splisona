import { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ChevronDown, Plus, X, FolderKanban, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { HelpDot } from '../components/report/HelpDot';
import { useProjects } from '../hooks/useProjects';
import { createProject, updateProject } from '../api/projects';
import type { Project } from '../types';

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

type SortKey = 'updatedAt' | 'createdAt' | 'name';
const SORT_LABELS: Record<SortKey, string> = {
  updatedAt: '最終更新日',
  createdAt: '作成日',
  name: '名前',
};

function EditProjectModal({ project, onClose, onSave }: { project: Project; onClose: () => void; onSave: (p: Project) => void }) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const updated = await updateProject(project.projectId, { name: name.trim(), description: description.trim() });
      onSave(updated);
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
              className="bg-raised border border-hairline rounded-lg outline-none font-sans text-text-hi placeholder:text-text-lo transition-colors focus:border-accent"
              style={{ padding: '10px 14px', fontSize: 14 }}
            />
          </div>
          <div className="flex flex-col" style={{ gap: 8 }}>
            <label className="font-sans font-semibold text-text-hi" style={{ fontSize: 14 }}>説明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="bg-raised border border-hairline rounded-lg outline-none font-sans text-text-hi placeholder:text-text-lo resize-y transition-colors focus:border-accent"
              style={{ padding: '10px 14px', fontSize: 14 }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end mt-6" style={{ gap: 12 }}>
          <button
            type="button"
            onClick={onClose}
            className="font-sans font-medium rounded-lg transition-colors hover:bg-raised"
            style={{ padding: '8px 20px', fontSize: 14, color: '#9BA1AC' }}
          >
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

function CardMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
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
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
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
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); onEdit(); }}
            className="flex items-center w-full px-4 py-2.5 font-sans text-sm transition-colors hover:bg-raised"
            style={{ gap: 10, color: '#E1E4EA' }}
          >
            <Pencil size={14} style={{ color: '#9BA1AC' }} />
            詳細を編集
          </button>
          <div style={{ height: 1, background: '#FFFFFF14', margin: '0 12px' }} />
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); onDelete(); }}
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

function CreateProjectModal({ onClose, onCreate }: { onClose: () => void; onCreate: (p: { name: string; description: string }) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      onCreate({ name: name.trim(), description: description.trim() });
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
          <h2 className="text-text-hi font-sans font-semibold" style={{ fontSize: 20 }}>プロジェクトを作成</h2>
          <button type="button" onClick={onClose} className="flex items-center justify-center w-7 h-7 rounded-md transition-colors hover:bg-raised">
            <X size={16} className="text-text-lo" />
          </button>
        </div>

        <div className="flex flex-col rounded-lg mb-6" style={{ padding: 16, background: '#1C1F23', gap: 8 }}>
          <span className="font-sans font-semibold text-text-hi" style={{ fontSize: 13 }}>プロジェクトの使い方</span>
          <span className="font-sans text-text-lo" style={{ fontSize: 13, lineHeight: 1.6 }}>
            A/Bテストをプロジェクトでまとめ、イテレーションを管理できます。同じページの改善を繰り返し検証する際に便利です。
          </span>
        </div>

        <div className="flex flex-col" style={{ gap: 20 }}>
          <div className="flex flex-col" style={{ gap: 8 }}>
            <label className="font-sans font-semibold text-text-hi" style={{ fontSize: 14 }}>何に取り組んでいますか？</label>
            <input
              type="text"
              placeholder="プロジェクト名を入力してください"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              autoFocus
              className="bg-raised border border-hairline rounded-lg outline-none font-sans text-text-hi placeholder:text-text-lo transition-colors focus:border-accent"
              style={{ padding: '10px 14px', fontSize: 14 }}
            />
          </div>
          <div className="flex flex-col" style={{ gap: 8 }}>
            <label className="font-sans font-semibold text-text-hi" style={{ fontSize: 14 }}>何を達成しようとしていますか？</label>
            <textarea
              placeholder="プロジェクトの目標やテーマを説明してください..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bg-raised border border-hairline rounded-lg outline-none font-sans text-text-hi placeholder:text-text-lo resize-y transition-colors focus:border-accent"
              style={{ padding: '10px 14px', fontSize: 14 }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end mt-6" style={{ gap: 12 }}>
          <button
            type="button"
            onClick={onClose}
            className="font-sans font-medium rounded-lg transition-colors hover:bg-raised"
            style={{ padding: '8px 20px', fontSize: 14, color: '#9BA1AC' }}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim() || submitting}
            className="font-sans font-semibold rounded-lg transition-opacity disabled:opacity-40"
            style={{ padding: '8px 20px', fontSize: 14, color: '#0A0B0D', background: '#F2F4F7' }}
          >
            プロジェクトを作成
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProjectListPage() {
  const navigate = useNavigate();
  const { projects, isLoading, deleteProject, refresh } = useProjects();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [sortOpen, setSortOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Project | null>(null);

  const filtered = useMemo(() => {
    let list = [...projects];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'ja');
      return new Date(b[sortKey]).getTime() - new Date(a[sortKey]).getTime();
    });
    return list;
  }, [projects, searchQuery, sortKey]);

  async function handleCreate(input: { name: string; description: string }) {
    const project = await createProject(input);
    navigate(`/projects/${project.projectId}`);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div role="status" className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ padding: '48px 128px', gap: 24, height: '100%' }}>
      {modalOpen && <CreateProjectModal onClose={() => setModalOpen(false)} onCreate={handleCreate} />}
      {editTarget && (
        <EditProjectModal
          project={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={() => { setEditTarget(null); refresh(); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="group flex items-center" style={{ gap: 8 }}>
          <h1 className="text-text-hi font-sans font-semibold" style={{ fontSize: 24 }}>プロジェクト</h1>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <HelpDot content="A/Bテストをプロジェクトでまとめ、イテレーションを管理できます。同じページの改善を繰り返し検証する際に便利です。" />
          </div>
        </div>
        <div className="flex items-center" style={{ gap: 8 }}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setSortOpen((o) => !o)}
              className="flex items-center border transition-colors hover:bg-raised"
              style={{ gap: 6, borderRadius: 6, padding: '8px 14px', borderColor: '#FFFFFF14' }}
            >
              <span className="font-sans" style={{ fontSize: 13, color: '#9BA1AC' }}>並び替え</span>
              <span className="font-sans font-semibold" style={{ fontSize: 13, color: '#F2F4F7' }}>{SORT_LABELS[sortKey]}</span>
              <ChevronDown size={14} style={{ color: '#5B616B' }} />
            </button>
            {sortOpen && (
              <div
                className="absolute right-0 top-full mt-1 bg-surface border border-hairline rounded-lg overflow-hidden z-10"
                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.3)', minWidth: 160 }}
              >
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setSortKey(key); setSortOpen(false); }}
                    className="w-full text-left px-4 py-2.5 font-sans text-sm transition-colors hover:bg-raised"
                    style={{ color: key === sortKey ? '#F2F4F7' : '#9BA1AC', fontWeight: key === sortKey ? 600 : 400 }}
                  >
                    {SORT_LABELS[key]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center border transition-colors hover:bg-raised"
            style={{ gap: 8, borderRadius: 6, padding: '8px 14px', borderColor: '#FFFFFF14', background: '#6E78D90F' }}
          >
            <Plus size={14} style={{ color: '#F2F4F7' }} />
            <span className="font-sans font-semibold" style={{ fontSize: 13, color: '#F2F4F7' }}>新規プロジェクト</span>
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div
        className="flex items-center"
        style={{ gap: 8, borderRadius: 10, padding: '12px 16px', border: '1px solid #FFFFFF14' }}
      >
        <Search size={16} style={{ color: '#5B616B', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="プロジェクトを検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent border-0 outline-none font-sans"
          style={{ fontSize: 14, color: '#F2F4F7' }}
        />
      </div>

      {/* Content */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1" style={{ gap: 16, paddingBottom: 80 }}>
          <FolderKanban size={48} className="text-text-lo" style={{ opacity: 0.4 }} />
          <p className="text-text-hi font-sans font-medium" style={{ fontSize: 16 }}>プロジェクトを始めませんか？</p>
          <p className="text-text-lo font-sans text-center" style={{ fontSize: 14, maxWidth: 360, lineHeight: 1.6 }}>
            A/Bテストをプロジェクトでまとめ、イテレーションを管理できます。
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="font-sans font-medium border transition-colors hover:bg-raised"
            style={{ padding: '10px 24px', fontSize: 14, color: '#F2F4F7', borderRadius: 8, borderColor: '#FFFFFF14' }}
          >
            新規プロジェクト
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-text-lo font-sans text-sm">一致するプロジェクトがありません</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {filtered.map((project) => (
            <Link
              key={project.projectId}
              to={`/projects/${project.projectId}`}
              className="flex flex-col transition-colors hover:bg-raised"
              style={{
                padding: '20px 24px',
                borderRadius: 12,
                border: '1px solid #FFFFFF14',
              }}
            >
              <div className="flex items-start justify-between" style={{ gap: 8 }}>
                <span className="font-sans font-medium flex-1 min-w-0 truncate" style={{ fontSize: 15, color: '#F2F4F7' }}>
                  {project.name}
                </span>
                <CardMenu
                  onEdit={() => setEditTarget(project)}
                  onDelete={() => deleteProject(project.projectId)}
                />
              </div>
              {project.description && (
                <span
                  className="font-sans mt-2"
                  style={{ fontSize: 13, color: '#9BA1AC', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                  {project.description}
                </span>
              )}
              <div className="flex items-center mt-3" style={{ gap: 12 }}>
                <span className="font-mono" style={{ fontSize: 12, color: '#5B616B' }}>
                  {project.testIds.length} テスト
                </span>
                <span className="font-sans" style={{ fontSize: 12, color: '#5B616B' }}>
                  {relativeDate(project.updatedAt)}に更新
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
