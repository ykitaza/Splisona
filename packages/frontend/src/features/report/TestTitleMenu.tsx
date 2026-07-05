import { useEffect, useState, useRef } from 'react';
import { ChevronDown, Pencil, FolderPlus, FolderMinus, Trash2 } from 'lucide-react';
import { ProjectSubmenuPanel } from '@/shared/ui/ProjectSubmenuPanel';
import type { Project } from '@/features/project/types';

export function TestTitleMenu({
  title,
  parentProject,
  allProjects,
  onRename,
  onAddToProject,
  onRemoveFromProject,
  onDelete,
}: {
  title: string;
  parentProject: Project | null;
  allProjects: Project[];
  onRename: () => void;
  onAddToProject: (projectId: string) => void;
  onRemoveFromProject: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [projectSubOpen, setProjectSubOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setProjectSubOpen(false); }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setProjectSubOpen(false); }}
        className="flex items-center transition-colors hover:text-text-hi"
        style={{ gap: 4, color: '#F2F4F7' }}
      >
        <span className="font-sans font-semibold" style={{ fontSize: 15 }}>{title}</span>
        <ChevronDown size={14} style={{ color: '#5B616B' }} />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 bg-surface border border-hairline rounded-lg overflow-visible z-30"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.4)', minWidth: 220 }}
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
          ) : (
            <div className="relative" onMouseEnter={() => setProjectSubOpen(true)} onMouseLeave={() => setProjectSubOpen(false)}>
              <button
                type="button"
                className="flex items-center justify-between w-full px-4 py-2.5 font-sans text-sm transition-colors hover:bg-raised"
                style={{ color: '#E1E4EA' }}
              >
                <span className="flex items-center" style={{ gap: 10 }}>
                  <FolderPlus size={14} style={{ color: '#9BA1AC' }} />
                  プロジェクトに追加
                </span>
                <ChevronDown size={12} style={{ color: '#5B616B', transform: 'rotate(-90deg)' }} />
              </button>
              {projectSubOpen && (
                <div
                  className="absolute left-full top-0 bg-surface border border-hairline rounded-lg overflow-hidden"
                  style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.4)', minWidth: 200 }}
                >
                  <ProjectSubmenuPanel
                    projects={allProjects}
                    onSelect={(projectId) => { setOpen(false); setProjectSubOpen(false); onAddToProject(projectId); }}
                  />
                </div>
              )}
            </div>
          )}

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
