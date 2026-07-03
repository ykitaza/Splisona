import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronDown, Download, RefreshCw, Lightbulb, Image, PenTool, Globe, Check, Plus, Pencil, FolderPlus, FolderMinus, Trash2, FileJson, FileText } from 'lucide-react';
import { ImageLightbox } from '@/shared/ui/ImageLightbox';
import { SegmentViewer } from './SegmentViewer';
import { RadarChart } from './RadarChart';
import { ImprovementDrawer } from './ImprovementDrawer';
import { buildPromptContext } from './prompt-context';
import { AttributeHeatmap } from './AttributeHeatmap';
import { SharePopover } from './SharePopover';
import { MethodPopover } from './Popovers';
import { HelpDot } from '@/shared/ui/HelpDot';
import { getReport, cloneTest, updateTest, deleteTest } from '@/features/test/api';
import { listProjects, addTestToProject, removeTestFromProject } from '@/features/project/api';
import { getConfig } from '@/features/settings/api';
import { usePersonas } from '@/features/persona/usePersonas';
import { PersonaNode } from '@/features/persona/PersonaNode';
import { getAvatarUrl } from '@/features/persona/api';
import { API_BASE } from '@/shared/api/client';
import { testDraft } from '@/features/test/testDraft';
import { PERSONA_TYPE_LABELS } from '@/features/persona/types';
import type { ReportResponse, EvaluationScores } from './types';
import type { DesignInput } from '@/features/test/types';
import type { Persona } from '@/features/persona/types';
import { ProjectSubmenuPanel } from '@/shared/ui/ProjectSubmenuPanel';
import type { Project } from '@/features/project/types';
import { buildExportJson, buildExportHtml, downloadBlob } from './export-report';

const SCORE_LABELS: Record<keyof EvaluationScores, string> = {
  usability: '使いやすさ',
  aesthetics: '見た目',
  clarity: '明確さ',
  engagement: '訴求力',
  trust: '信頼感',
};

function ExportMenu({ onJson, onHtml }: { onJson: () => void; onHtml: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const items = [
    { label: 'HTML', icon: <FileText size={14} />, action: onHtml },
    { label: 'JSON', icon: <FileJson size={14} />, action: onJson },
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center bg-surface border border-hairline text-text-mid font-sans font-medium transition-colors hover:text-text-hi"
        style={{ gap: 8, borderRadius: 10, padding: '10px 15px', fontSize: 13 }}
      >
        <Download size={15} />
        書き出し
        <ChevronDown size={13} style={{ marginLeft: 2, opacity: 0.5 }} />
      </button>
      {open && (
        <div
          className="bg-raised border border-hairline"
          style={{
            position: 'absolute', right: 0, top: '100%', marginTop: 6,
            borderRadius: 10, padding: 4, minWidth: 220, zIndex: 50,
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => { setOpen(false); item.action(); }}
              className="flex items-center w-full text-left text-text-mid font-sans transition-colors hover:text-text-hi hover:bg-surface"
              style={{ gap: 10, padding: '9px 12px', borderRadius: 8, fontSize: 13, border: 'none', background: 'none', cursor: 'pointer' }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SegmentBar({ countA, countB, countNone }: { countA: number; countB: number; countNone: number }) {
  const total = countA + countB + countNone;
  if (total === 0) return null;
  return (
    <div data-testid="segment-bar" className="flex flex-col" style={{ gap: 12 }}>
      <div className="flex overflow-hidden" style={{ height: 16, borderRadius: 999, gap: 2 }}>
        {countA > 0 && <div style={{ flex: countA, background: '#6E78D9A0' }} />}
        {countB > 0 && <div style={{ flex: countB, background: '#C9974FA0' }} />}
        {countNone > 0 && <div style={{ flex: countNone, background: '#3A3D4280' }} />}
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#6E78D9A0' }} />
          <span className="text-text-mid font-mono text-xs" style={{ letterSpacing: 0.3 }}>A 勝利 · {countA}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-text-mid font-mono text-xs" style={{ letterSpacing: 0.3 }}>{countB} · B 勝利</span>
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#C9974FA0' }} />
        </span>
        {countNone > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#3A3D4280' }} />
            <span className="text-text-mid font-mono text-xs" style={{ letterSpacing: 0.3 }}>引分 · {countNone}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function TestTitleMenu({
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

function ReasonGroup({ caption, color, reasons }: { caption: string; color: string; reasons: string[] }) {
  if (reasons.length === 0) return null;
  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      <span className="font-sans font-semibold" style={{ color, fontSize: 13 }}>
        {caption}
      </span>
      {reasons.map((reason, i) => (
        <div key={i} className="flex items-start" style={{ gap: 9 }}>
          <Check size={14} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
          <span className="text-text-mid font-sans text-sm" style={{ lineHeight: 1.5 }}>{reason}</span>
        </div>
      ))}
    </div>
  );
}

function ScoreBars({ label, scoreA, scoreB }: { label: string; scoreA: number; scoreB: number }) {
  const total = scoreA + scoreB;
  const aRatio = total > 0 ? (scoreA / total) * 100 : 50;
  const bRatio = total > 0 ? (scoreB / total) * 100 : 50;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-text-mid font-sans text-sm">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-win-a font-mono text-xs font-semibold" style={{ minWidth: 44, textAlign: 'right' }}>
            A {scoreA.toFixed(1)}
          </span>
          <span className="text-win-b font-mono text-xs font-semibold" style={{ minWidth: 44, textAlign: 'right' }}>
            B {scoreB.toFixed(1)}
          </span>
        </div>
      </div>
      <div className="flex overflow-hidden rounded-full" style={{ height: 6, background: 'var(--color-raised, #1C1F23)' }}>
        <div style={{ width: `${aRatio}%`, height: '100%', background: 'var(--color-win-a, #6E78D9)' }} />
        <div style={{ width: `${bRatio}%`, height: '100%', background: 'var(--color-win-b, #C9974F)' }} />
      </div>
    </div>
  );
}

function DesignSourceInfo({ input }: { input: DesignInput }) {
  if (input.inputType === 'figma_url') {
    return (
      <a href={input.figmaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 min-w-0 text-text-lo hover:opacity-70 transition-opacity">
        <PenTool size={13} className="text-text-lo flex-shrink-0" />
        <span className="truncate font-mono text-xs">{input.figmaUrl ?? 'Figma URL'}</span>
      </a>
    );
  }
  if (input.inputType === 'site_url') {
    return (
      <a href={input.siteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 min-w-0 text-text-lo hover:opacity-70 transition-opacity">
        <Globe size={13} className="text-text-lo flex-shrink-0" />
        <span className="truncate font-mono text-xs">{input.siteUrl ?? 'サイトURL'}</span>
      </a>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-text-lo">
      <Image size={13} className="flex-shrink-0" />
      <span className="font-mono text-xs">画像アップロード</span>
    </div>
  );
}

function DesignCard({ side, input, isWinner, supportCount, totalCount }: {
  side: 'A' | 'B';
  input: DesignInput;
  isWinner: boolean;
  supportCount: number;
  totalCount: number;
}) {
  const [lightbox, setLightbox] = useState(false);
  const [segmentViewerOpen, setSegmentViewerOpen] = useState(false);
  const imageUrl = input.imageKey ? `${API_BASE}/images/${input.imageKey}` : null;
  const borderColor = isWinner
    ? (side === 'A' ? 'var(--color-win-a)' : 'var(--color-win-b)')
    : 'var(--color-hairline)';

  return (
    <>
      {lightbox && imageUrl && <ImageLightbox src={imageUrl} alt={`${side}案`} onClose={() => setLightbox(false)} />}
      {segmentViewerOpen && input.segmentKeys && input.segmentKeys.length > 0 && (
        <SegmentViewer side={side} segmentKeys={input.segmentKeys} onClose={() => setSegmentViewerOpen(false)} />
      )}
      <div
        className="flex flex-col flex-1 min-w-0"
        style={{ gap: 16, paddingLeft: 16, borderLeft: `2px solid ${borderColor}` }}
      >
        <div className="flex items-center justify-between">
          <span className="text-text-hi font-mono text-xs font-semibold" style={{ letterSpacing: 0.5 }}>{side}案</span>
        </div>
        <div
          className="flex items-center justify-center overflow-hidden flex-shrink-0"
          style={{ height: 180, borderRadius: 10, border: '1px solid var(--color-hairline)', cursor: imageUrl ? 'zoom-in' : 'default' }}
          onClick={() => { if (imageUrl) setLightbox(true); }}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={`${side}案`} className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Image size={32} className="text-text-lo" />
              <span className="text-text-lo font-sans text-xs">画像なし</span>
            </div>
          )}
        </div>
        <DesignSourceInfo input={input} />
        {input.segmentKeys && input.segmentKeys.length > 0 && (
          <div className="flex items-center" style={{ gap: 8 }}>
            <span className="text-text-lo font-mono text-xs">評価入力: {input.segmentKeys.length}分割</span>
            <button
              type="button"
              onClick={() => setSegmentViewerOpen(true)}
              className="text-accent font-sans text-xs font-medium hover:opacity-80 transition-opacity"
            >
              入力画像を確認
            </button>
          </div>
        )}
        <div className="h-px bg-hairline" />
        <div className="flex items-center justify-between">
          <span className="text-text-mid font-sans text-sm">{totalCount}人中{supportCount}人が支持</span>
        </div>
      </div>
    </>
  );
}

function AttributePopoverInline({ persona, onClose }: { persona: Persona; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      data-testid="attribute-popover"
      className="absolute z-50 rounded-md bg-raised border border-hairline"
      style={{ top: '100%', left: 0, marginTop: 4, padding: '10px 14px', minWidth: 180, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
    >
      <p className="text-text-hi font-sans text-xs font-semibold mb-2">ペルソナ属性</p>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-text-lo font-mono text-xs">タイプ</span>
          <span className="text-text-mid font-sans text-xs">{PERSONA_TYPE_LABELS[persona.type]}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-text-lo font-mono text-xs">年齢</span>
          <span className="text-text-mid font-sans text-xs">{persona.age ? `${persona.age}歳` : '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-text-lo font-mono text-xs">性別</span>
          <span className="text-text-mid font-sans text-xs">{persona.gender ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-text-lo font-mono text-xs">職業</span>
          <span className="text-text-mid font-sans text-xs">{persona.occupation ?? '—'}</span>
        </div>
      </div>
    </div>
  );
}

function RevealSection({ children, delay = 0, enabled }: { children: React.ReactNode; delay?: number; enabled: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!enabled);

  useEffect(() => {
    if (!enabled || !ref.current) return;
    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled]);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(24px)',
        transition: enabled ? `opacity 0.7s cubic-bezier(0.4,0,0.2,1) ${delay}s, transform 0.7s cubic-bezier(0.4,0,0.2,1) ${delay}s` : 'none',
      }}
    >
      {children}
    </div>
  );
}

export function TestReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [isRerunning, setIsRerunning] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [attrPopoverId, setAttrPopoverId] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string>('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [parentProject, setParentProject] = useState<Project | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const { personas } = usePersonas();
  const [reveal] = useState(() => {
    const key = `splisona:report-revealed:${id}`;
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, '1');
    return true;
  });

  useEffect(() => {
    if (!id) return;
    getReport(id).then(setReport);
    getConfig().then((c) => setModelId(c.modelId));
    listProjects().then((projects) => {
      setAllProjects(projects);
      setParentProject(projects.find((p) => p.testIds.includes(id)) ?? null);
    });
  }, [id]);

  function designInputToSideData(input: DesignInput) {
    if (input.inputType === 'figma_url') return { inputType: 'figma_url' as const, url: input.figmaUrl ?? '', imageKey: input.imageKey ?? '' };
    if (input.inputType === 'site_url') return { inputType: 'site_url' as const, url: input.siteUrl ?? '', imageKey: input.imageKey ?? '' };
    return { inputType: 'image_upload' as const, file: new File([], ''), imageKey: input.imageKey ?? '' };
  }

  async function handleRerun() {
    if (!id) return;
    setIsRerunning(true);
    try {
      const cloned = await cloneTest(id);
      if (parentProject) {
        await addTestToProject(parentProject.projectId, cloned.testId);
      }
      testDraft.resume({
        title: '',
        sideA: designInputToSideData(cloned.designAInput),
        sideB: designInputToSideData(cloned.designBInput),
        personaIds: cloned.personaIds,
        focusPoints: cloned.focusPoints,
        resumeId: cloned.testId,
      });
      navigate(parentProject ? `/tests/new?projectId=${parentProject.projectId}` : '/tests/new');
    } finally {
      setIsRerunning(false);
    }
  }

  function exportBaseName() {
    // ファイル名に使えない文字を除去し、テスト名をそのまま名前にする
    const title = (report?.abTest.title ?? '').trim().replace(/[\\/:*?"<>|]/g, '_');
    return title || `splisona-report-${report?.abTest.testId ?? 'unknown'}`;
  }

  function handleExportJson() {
    if (!report) return;
    const json = buildExportJson(report, personas, modelId);
    downloadBlob(new Blob([json], { type: 'application/json;charset=utf-8;' }), `${exportBaseName()}.json`);
  }

  async function handleExportHtml() {
    if (!report) return;
    const html = await buildExportHtml(report, personas, modelId);
    downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8;' }), `${exportBaseName()}.html`);
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center h-full">
        <div role="status" className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  const { abTest, summary, evaluations } = report;
  const winnerSide = summary.winner;
  const winnerDesignLabel = winnerSide === 'A' || winnerSide === 'B' ? `デザイン ${winnerSide}` : null;
  const supportCountA = Math.round(summary.supportRateA * summary.totalPersonas);
  const supportCountB = Math.round(summary.supportRateB * summary.totalPersonas);
  const countNone = summary.totalPersonas - supportCountA - supportCountB;

  return (
    <div className="flex flex-col" style={{ width: '100%', maxWidth: 864, margin: '0 auto', padding: '48px 24px', gap: 32 }}>
      {/* Breadcrumb */}
      <div className="flex items-center" style={{ gap: 10 }}>
        {parentProject ? (
          <>
            <Link
              to={`/projects/${parentProject.projectId}`}
              className="text-text-mid font-sans font-medium text-sm hover:text-text-hi transition-colors"
            >
              {parentProject.name}
            </Link>
            <span className="text-text-lo font-sans" style={{ fontSize: 14 }}>/</span>
          </>
        ) : null}
        <TestTitleMenu
          title={abTest.title || '無題のテスト'}
          parentProject={parentProject}
          allProjects={allProjects.filter((p) => !p.testIds.includes(id!))}
          onRename={() => { setRenameValue(abTest.title); setIsRenaming(true); }}
          onAddToProject={async (projectId) => {
            await addTestToProject(projectId, id!);
            const projects = await listProjects();
            setAllProjects(projects);
            setParentProject(projects.find((p) => p.testIds.includes(id!)) ?? null);
          }}
          onRemoveFromProject={async () => {
            if (parentProject) {
              await removeTestFromProject(parentProject.projectId, id!);
              const projects = await listProjects();
              setAllProjects(projects);
              setParentProject(null);
            }
          }}
          onDelete={async () => {
            await deleteTest(id!);
            navigate(parentProject ? `/projects/${parentProject.projectId}` : '/results', { replace: true });
          }}
        />
      </div>

      {/* Rename inline */}
      {isRenaming && (
        <div className="flex items-center" style={{ gap: 8, marginTop: -16 }}>
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && renameValue.trim()) {
                await updateTest(id!, { title: renameValue.trim() });
                setReport((r) => r ? { ...r, abTest: { ...r.abTest, title: renameValue.trim() } } : r);
                setIsRenaming(false);
              }
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            autoFocus
            className="bg-raised border border-hairline rounded-md outline-none font-sans text-text-hi transition-colors focus:border-accent"
            style={{ padding: '6px 12px', fontSize: 14, width: 300 }}
          />
          <button
            type="button"
            onClick={async () => {
              if (renameValue.trim()) {
                await updateTest(id!, { title: renameValue.trim() });
                setReport((r) => r ? { ...r, abTest: { ...r.abTest, title: renameValue.trim() } } : r);
              }
              setIsRenaming(false);
            }}
            className="font-sans text-sm text-accent font-medium"
          >
            保存
          </button>
          <button type="button" onClick={() => setIsRenaming(false)} className="font-sans text-sm text-text-lo">
            キャンセル
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginTop: -16 }}>
        <div className="flex flex-col" style={{ gap: 7 }}>
          <h1 className="text-text-hi font-sans font-semibold" style={{ fontSize: 24 }}>
            結果レポート
          </h1>
          <div className="flex items-center" style={{ gap: 9 }}>
            <span className="text-text-lo font-mono text-xs">·</span>
            <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 0.3 }}>{summary.totalPersonas} ペルソナ</span>
            <span className="text-text-lo font-mono text-xs">·</span>
            <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 0.3 }}>
              {new Date(abTest.createdAt).toLocaleDateString('ja-JP')} 実行
            </span>
          </div>
        </div>
        <div className="flex items-center" style={{ gap: 10 }}>
          {abTest.status === 'completed' && <SharePopover testId={abTest.testId} />}
          <ExportMenu onJson={handleExportJson} onHtml={handleExportHtml} />
          <button
            type="button"
            disabled={isRerunning}
            onClick={handleRerun}
            className="flex items-center bg-surface border border-hairline text-text-mid font-sans font-medium transition-colors hover:text-text-hi disabled:opacity-40"
            style={{ gap: 8, borderRadius: 10, padding: '10px 15px', fontSize: 13 }}
          >
            <RefreshCw size={15} />
            条件を変えて再テスト
          </button>
        </div>
      </div>

      {/* 総合結果 card */}
      <RevealSection enabled={reveal} delay={0.1}>
        <div
          className="flex flex-col bg-base border border-hairline"
          style={{ gap: 16, borderRadius: 14, padding: 20 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col" style={{ gap: 10 }}>
              <span className="font-mono text-xs text-text-lo" style={{ letterSpacing: 1.2 }}>総合結果</span>
              <div className="flex items-baseline gap-3">
                {winnerDesignLabel ? (
                  <span className="font-sans" style={{ fontSize: 24 }}>
                    <span style={{ fontWeight: 700, color: winnerSide === 'A' ? 'var(--color-win-a)' : 'var(--color-win-b)' }}>{winnerDesignLabel}</span>
                    <span className="text-text-hi" style={{ fontWeight: 600 }}> の勝ち</span>
                  </span>
                ) : (
                  <span className="text-text-hi font-sans" style={{ fontSize: 24, fontWeight: 600 }}>引き分け</span>
                )}
                <MethodPopover />
              </div>
              <p className="text-text-mid font-sans text-sm">
                {summary.totalPersonas}人中{winnerSide === 'A' ? supportCountA : winnerSide === 'B' ? supportCountB : supportCountA}人が {winnerDesignLabel ?? 'A/B同数'} を支持
              </p>
            </div>
          </div>
          <SegmentBar countA={supportCountA} countB={supportCountB} countNone={countNone} />

          {summary.winnersReasonSummary && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-md bg-accent-dim">
              <Lightbulb size={18} className="text-accent flex-shrink-0 mt-0.5" />
              <p className="text-text-hi font-sans text-sm">主な理由: {summary.winnersReasonSummary}</p>
            </div>
          )}
          {(summary.improvementReport?.suggestions.length ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex items-center justify-between px-4 py-2.5 rounded-md bg-accent-dim transition-opacity hover:opacity-85"
              style={{ border: 'none', cursor: 'pointer', width: '100%' }}
            >
              <span className="flex items-center gap-2.5">
                <Lightbulb size={15} className="text-accent flex-shrink-0" />
                <span className="text-text-hi font-sans text-sm">
                  改善提案が {summary.improvementReport!.suggestions.length} 件あります
                  （A案 {summary.improvementReport!.suggestions.filter((s) => s.target === 'A').length} · B案 {summary.improvementReport!.suggestions.filter((s) => s.target === 'B').length}）
                </span>
              </span>
              <span className="flex items-center gap-1 text-accent font-sans text-sm font-semibold">
                見る
                <ChevronDown size={14} className="text-accent" style={{ transform: 'rotate(-90deg)' }} />
              </span>
            </button>
          )}
        </div>
      </RevealSection>

      {drawerOpen && summary.improvementReport && (
        <ImprovementDrawer
          report={summary.improvementReport}
          contextHeader={buildPromptContext(report, personas)}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      <div className="h-px bg-hairline" />

      {/* 比較したデザイン */}
      <RevealSection enabled={reveal} delay={0.2}>
        <div className="flex flex-col" style={{ gap: 14 }}>
          <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 1.2 }}>比較したデザイン</span>
          <div className="flex min-w-0" style={{ gap: 32 }}>
            <DesignCard side="A" input={abTest.designAInput} isWinner={summary.winner === 'A'} supportCount={supportCountA} totalCount={summary.totalPersonas} />
            <DesignCard side="B" input={abTest.designBInput} isWinner={summary.winner === 'B'} supportCount={supportCountB} totalCount={summary.totalPersonas} />
          </div>
        </div>
      </RevealSection>

      {/* 分析: 2カラム (理由 | レーダー) */}
      <RevealSection enabled={reveal}>
      <div className="flex" style={{ gap: 24 }}>
        {/* 評価のまとめ */}
        <div
          className="flex flex-col flex-1"
          style={{ gap: 12, paddingRight: 24 }}
        >
          <div className="flex items-center" style={{ gap: 8 }}>
            <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 1.2 }}>評価のまとめ</span>
            <HelpDot content={`生成元: ${modelId || '—'}。各ペルソナの評価理由をAIが要約した結果です。`} />
          </div>
          {summary.reasonSummaryA.length === 0 && summary.reasonSummaryB.length === 0 ? (
            <div className="flex flex-col" style={{ gap: 12, paddingTop: 36 }}>
              <p className="text-text-mid font-sans text-sm" style={{ lineHeight: 1.6 }}>
                {winnerSide === 'tie' || !winnerSide
                  ? '両デザインの評価が拮抗しています。各ペルソナのコメントと評価軸別スコアを確認してください。'
                  : '評価理由のまとめはまだ生成されていません。'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: 12, paddingTop: 36 }}>
              <ReasonGroup caption="A が支持された理由" color="var(--color-win-a, #6E78D9)" reasons={summary.reasonSummaryA} />
              <ReasonGroup caption="B が評価された点" color="var(--color-win-b, #C9974F)" reasons={summary.reasonSummaryB} />
            </div>
          )}
        </div>

        {/* 評価軸別の比較 */}
        <div
          className="flex flex-col flex-1"
          style={{ gap: 12, paddingLeft: 24 }}
        >
          <div className="flex items-center" style={{ gap: 8 }}>
            <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 1.2 }}>評価軸別の比較</span>
            <HelpDot content={`生成元: ${modelId || '—'}。5軸の平均スコアをレーダーチャートで比較。各ペルソナが1〜5で採点した全ペルソナ平均。最大5固定・正規化なし。支持率は多数決で別算出。`} />
          </div>
          <div className="flex items-center" style={{ gap: 20 }}>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-win-a" />
              <span className="text-text-mid font-mono text-xs">A案</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-win-b" />
              <span className="text-text-mid font-mono text-xs">B案</span>
            </span>
          </div>
          <div className="flex flex-col items-center" style={{ gap: 16 }}>
            <RadarChart scoresA={summary.avgScores.A} scoresB={summary.avgScores.B} animate={reveal} />
          </div>
        </div>
      </div>
      </RevealSection>

      {/* Attribute Heatmap */}
      {personas.length > 0 && evaluations.length > 0 && (
        <RevealSection enabled={reveal}>
          <AttributeHeatmap evaluations={evaluations} personas={personas} />
        </RevealSection>
      )}

      {/* ペルソナ別の評価 */}
      <RevealSection enabled={reveal}>
      <div className="flex flex-col" style={{ gap: 32 }}>
      <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 1.2 }}>ペルソナ別の評価</span>
      <div className="bg-base border border-hairline" style={{ borderRadius: 14 }}>
        <div className="flex items-center px-4 border-b border-hairline bg-base" style={{ gap: 16, padding: '12px 16px' }}>
          <div style={{ width: 250 }}>
            <span className="text-text-lo font-mono" style={{ fontSize: 10, letterSpacing: 0.8 }}>PERSONA</span>
          </div>
          <div style={{ width: 96 }}>
            <span className="text-text-lo font-mono" style={{ fontSize: 10, letterSpacing: 0.8 }}>勝者</span>
          </div>
          <div style={{ width: 64 }}>
            <span className="text-text-lo font-mono" style={{ fontSize: 10, letterSpacing: 0.8 }}>確信度</span>
          </div>
          <div className="flex-1">
            <span className="text-text-lo font-mono" style={{ fontSize: 10, letterSpacing: 0.8 }}>コメント</span>
          </div>
        </div>
        {evaluations.map((ev, i) => {
          const isExpanded = expandedId === ev.personaId;
          const matchedPersona = personas.find((p) => p.personaId === ev.personaId);
          return (
            <div key={ev.personaId}>
              {i > 0 && <div className="h-px bg-hairline" />}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : ev.personaId)}
                className="group flex items-center w-full text-left transition-colors hover:bg-raised"
                style={{ gap: 16, padding: '16px 16px' }}
                aria-expanded={isExpanded}
              >
                <div className="relative flex items-center" style={{ width: 250, gap: 11 }}>
                  <PersonaNode seed={ev.personaId} size={20} avatarUrl={personas.find((p) => p.personaId === ev.personaId)?.avatarImageKey ? getAvatarUrl(personas.find((p) => p.personaId === ev.personaId)!.avatarImageKey!) : undefined} />
                  <div className="flex flex-col" style={{ gap: 2 }}>
                    <span
                      role="button"
                      tabIndex={0}
                      data-testid={`persona-name-${ev.personaId}`}
                      className="text-text-hi font-sans text-sm font-medium hover:text-accent transition-colors cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); setAttrPopoverId(attrPopoverId === ev.personaId ? null : ev.personaId); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setAttrPopoverId(attrPopoverId === ev.personaId ? null : ev.personaId); } }}
                    >
                      {ev.personaDisplayName}
                    </span>
                    {ev.status === 'failed' && <span className="text-xs text-danger">失敗</span>}
                  </div>
                  {attrPopoverId === ev.personaId && matchedPersona && (
                    <AttributePopoverInline persona={matchedPersona} onClose={() => setAttrPopoverId(null)} />
                  )}
                </div>
                <div style={{ width: 96 }}>
                  {ev.status !== 'failed' && (
                    <span
                      className="inline-flex items-center justify-center text-xs font-bold"
                      style={{
                        borderRadius: 999,
                        padding: '4px 11px',
                        background: ev.winner === 'A' ? '#6E78D922' : ev.winner === 'B' ? '#C9974F22' : 'var(--color-raised)',
                        color: ev.winner === 'A' ? 'var(--color-win-a)' : ev.winner === 'B' ? 'var(--color-win-b)' : 'var(--color-text-lo)',
                      }}
                    >
                      {ev.winner === 'none' ? '—' : `${ev.winner}案`}
                    </span>
                  )}
                </div>
                <div style={{ width: 64 }}>
                  {ev.status !== 'failed' && (
                    <span className="text-text-mid font-mono text-xs">{ev.confidence}%</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-text-mid font-sans text-sm"
                    style={{
                      lineHeight: 1.5,
                      ...(isExpanded ? {} : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }),
                    }}
                  >
                    {ev.reason || '—'}
                  </p>
                </div>
                <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ width: 32, ...(isExpanded ? { opacity: 1 } : {}) }}>
                  <ChevronDown size={16} className="text-text-lo" style={{ transition: 'transform 0.15s', transform: isExpanded ? 'rotate(180deg)' : 'none' }} />
                </div>
              </button>
              {isExpanded && (
                <div className="flex flex-col gap-4 bg-raised" style={{ padding: '4px 16px 20px 307px' }}>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 0.5 }}>使用モデル</span>
                    <p className="text-text-mid font-mono text-xs">{ev.modelId ?? modelId ?? '—'}</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 0.5 }}>解決済みプロンプト</span>
                    <p className="text-text-mid font-sans text-xs whitespace-pre-wrap" style={{ lineHeight: 1.5 }}>
                      {ev.resolvedPrompt ?? [
                        `ペルソナ「${ev.personaDisplayName}」として、デザイン A と B を比較し、5軸で評価してください。`,
                        abTest.focusPoints ? `\n注目ポイント:\n${abTest.focusPoints}` : null,
                      ].filter(Boolean).join('')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 0.5 }}>コメント全文</span>
                    <p className="text-text-hi font-sans text-sm whitespace-pre-wrap" style={{ lineHeight: 1.5 }}>{ev.reason || '—'}</p>
                  </div>
                  {ev.status !== 'failed' && ev.scoresA && ev.scoresB && (
                    <div className="flex flex-col gap-3.5">
                      <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 0.5 }}>評価軸別スコア</span>
                      {(Object.keys(SCORE_LABELS) as (keyof EvaluationScores)[]).map((key) => (
                        <ScoreBars key={key} label={SCORE_LABELS[key]} scoreA={ev.scoresA[key]} scoreB={ev.scoresB[key]} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-text-lo font-sans text-xs">
        ペルソナ名クリックで属性、行クリックで使用モデル・プロンプト・各軸スコアを表示。見出しの ? で生成元を確認できます。
      </p>
      </div>
      </RevealSection>

      {/* Footer navigation */}
      <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid var(--color-hairline)' }}>
        <Link
          to={parentProject ? `/projects/${parentProject.projectId}` : '/results'}
          className="text-text-lo font-sans text-sm hover:text-text-mid transition-colors"
        >
          ← {parentProject ? parentProject.name : 'テスト一覧'}に戻る
        </Link>
        <Link
          to="/tests/new"
          className="flex items-center border border-hairline text-text-hi font-sans text-sm font-medium transition-colors hover:bg-raised"
          style={{ gap: 8, borderRadius: 8, padding: '8px 16px' }}
        >
          <Plus size={14} />
          新しいテストを作成
        </Link>
      </div>
    </div>
  );
}
