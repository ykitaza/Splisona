import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Users, FlaskConical, FolderKanban, Plus, Settings, LogOut, ChevronsUpDown, Info, X, PanelLeft, PanelLeftClose, SlidersHorizontal, Check, MoreVertical, Pencil, FolderPlus, Trash2 } from 'lucide-react';
import { signOut } from 'aws-amplify/auth';
import { SettingsModal } from './SettingsModal';
import { useUserProfile } from '../hooks/useUserProfile';
import { useABTests } from '../hooks/useABTests';
import { useProjects } from '../hooks/useProjects';
import { updateTest, deleteTest as apiDeleteTest } from '../api/tests';
import { addTestToProject } from '../api/projects';
import type { ABTest } from '../types';

const NAV_MAIN = [
  { to: '/results', icon: FlaskConical, label: 'A/Bテスト' },
  { to: '/projects', icon: FolderKanban, label: 'プロジェクト' },
];

const NAV_PERSONAS = [
  { to: '/personas', icon: Users, label: 'ペルソナ' },
];

function dateGroup(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (today.getTime() - target.getTime()) / 86400000;
  if (diff < 1) return '本日';
  if (diff < 2) return '昨日';
  if (diff < 7) return '今週';
  return '以前';
}

function SidebarTestItem({
  test,
  projects: allProjects,
  onRename,
  onDelete,
  onAddToProject,
}: {
  test: ABTest;
  projects: { projectId: string; name: string }[];
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onAddToProject: (testId: string, projectId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(test.title);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [overflowing, setOverflowing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (textRef.current) {
      setOverflowing(textRef.current.scrollWidth > textRef.current.clientWidth);
    }
  }, [test.title]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setMenuOpen(false); setSubOpen(false); }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  if (renaming) {
    return (
      <div className="px-2" style={{ padding: '4px 8px' }}>
        <input
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { onRename(test.testId, renameValue); setRenaming(false); }
            if (e.key === 'Escape') setRenaming(false);
          }}
          onBlur={() => { onRename(test.testId, renameValue); setRenaming(false); }}
          autoFocus
          className="w-full bg-raised border border-hairline rounded-md outline-none font-sans text-text-hi text-sm transition-colors focus:border-accent"
          style={{ padding: '4px 8px' }}
        />
      </div>
    );
  }

  return (
    <div ref={ref} className="group relative">
      <NavLink
        to={`/tests/${test.testId}/report`}
        className={({ isActive }) =>
          `flex items-center rounded-md transition-colors ${
            isActive ? 'text-text-hi bg-accent-dim' : 'text-text-mid hover:bg-raised'
          }`
        }
        style={() => ({ padding: '7px 12px', justifyContent: 'flex-start' })}
      >
        {({ isActive }) => (
          <span
            ref={textRef}
            className="font-sans text-sm whitespace-nowrap overflow-hidden"
            style={{
              fontWeight: isActive ? 500 : 400,
              maxWidth: 'calc(100% - 24px)',
              ...(overflowing ? {
                maskImage: 'linear-gradient(to right, black calc(100% - 16px), transparent)',
                WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 16px), transparent)',
              } : {}),
            }}
          >
            {test.title || '無題'}
          </span>
        )}
      </NavLink>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.preventDefault(); e.stopPropagation();
          if (!menuOpen && btnRef.current) {
            const r = btnRef.current.getBoundingClientRect();
            setMenuPos({ top: r.top, left: r.right + 4 });
          }
          setMenuOpen((o) => !o); setSubOpen(false);
        }}
        className="absolute right-1 top-1/2 -translate-y-1/2 items-center justify-center w-5 h-5 rounded transition-colors hover:bg-surface hidden group-hover:flex"
      >
        <MoreVertical size={13} style={{ color: '#9BA1AC' }} />
      </button>
      {menuOpen && (
        <div
          className="fixed bg-surface border border-hairline rounded-lg overflow-visible z-50"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.4)', minWidth: 180, top: menuPos.top, left: menuPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => { setMenuOpen(false); setRenaming(true); setRenameValue(test.title); }}
            className="flex items-center w-full px-4 py-2.5 font-sans text-sm transition-colors hover:bg-raised"
            style={{ gap: 10, color: '#E1E4EA' }}
          >
            <Pencil size={14} style={{ color: '#9BA1AC' }} />
            名前を変更
          </button>
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
              <span className="text-text-lo" style={{ fontSize: 12 }}>›</span>
            </button>
            {subOpen && (
              <div
                className="absolute left-full top-0 bg-surface border border-hairline rounded-lg overflow-hidden"
                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.4)', minWidth: 180, marginLeft: 4 }}
              >
                {allProjects.length > 0 ? allProjects.map((p) => (
                  <button
                    key={p.projectId}
                    type="button"
                    onClick={() => { setMenuOpen(false); setSubOpen(false); onAddToProject(test.testId, p.projectId); }}
                    className="flex items-center w-full px-4 py-2.5 font-sans text-sm transition-colors hover:bg-raised truncate"
                    style={{ color: '#E1E4EA' }}
                  >
                    {p.name}
                  </button>
                )) : (
                  <span className="block px-4 py-2.5 font-sans text-sm text-text-lo">利用可能なプロジェクトがありません</span>
                )}
              </div>
            )}
          </div>
          <div style={{ height: 1, background: '#FFFFFF14', margin: '0 12px' }} />
          <button
            type="button"
            onClick={() => { setMenuOpen(false); onDelete(test.testId); }}
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

const APP_VERSION = '0.0.1';
const GIT_HASH = '0f8b632';
const COLLAPSE_BREAKPOINT = 1024;

function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: '#05060799' }}
      onClick={onClose}
    >
      <div
        data-testid="about-modal-content"
        className="flex flex-col items-center relative bg-surface"
        style={{ width: 320, borderRadius: 14, border: '1px solid var(--color-hairline)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', padding: '48px 32px 32px 32px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 flex items-center justify-center w-6 h-6 rounded-md transition-colors hover:bg-raised"
        >
          <X size={14} className="text-text-lo" />
        </button>
        <div className="mb-5" style={{ borderRadius: 18, boxShadow: '0 0 16px rgba(255,255,255,0.1), 0 0 4px rgba(255,255,255,0.06)' }}>
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none" style={{ display: 'block' }}>
            <rect width="72" height="72" rx="18" fill="var(--color-raised)" />
            <circle cx="24" cy="28" r="4" fill="#F2F4F7" />
            <circle cx="48" cy="28" r="4" fill="#F2F4F7" />
            <circle cx="24.5" cy="42.5" r="2.5" fill="#F2F4F7" />
            <circle cx="36.5" cy="46.5" r="2.5" fill="#F2F4F7" />
            <circle cx="47.5" cy="42.5" r="2.5" fill="#F2F4F7" />
          </svg>
        </div>
        <p className="text-text-hi font-sans mb-1.5" style={{ fontSize: 22, fontWeight: 700 }}>Splisona</p>
        <p className="text-text-lo font-mono text-xs tracking-widest mb-1">AI PERSONA REVIEW</p>
        <p className="text-text-lo font-mono text-xs">バージョン {APP_VERSION} ({GIT_HASH})</p>
      </div>
    </div>
  );
}

export function AppLayout() {
  const navigate = useNavigate();
  const localUserId = import.meta.env?.VITE_LOCAL_USER_ID as string | undefined;
  const userProfile = useUserProfile();
  const { tests, deleteTest, refresh } = useABTests();
  const { projects, refresh: refreshProjects } = useProjects();
  const recentTests = tests
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
    .slice(0, 8);
  const recentGroups = recentTests.reduce<{ label: string; items: typeof recentTests }[]>((acc, t) => {
    const label = dateGroup(t.updatedAt ?? t.createdAt);
    const last = acc[acc.length - 1];
    if (last && last.label === label) last.items.push(t);
    else acc.push({ label, items: [t] });
    return acc;
  }, []);
  const projectGroups = (() => {
    const testToProject = new Map<string, string>();
    for (const p of projects) {
      for (const tid of p.testIds) testToProject.set(tid, p.name);
    }
    const grouped = new Map<string, typeof recentTests>();
    for (const t of recentTests) {
      const pName = testToProject.get(t.testId) ?? '未分類';
      const arr = grouped.get(pName) ?? [];
      arr.push(t);
      grouped.set(pName, arr);
    }
    return Array.from(grouped.entries()).map(([label, items]) => ({ label, items }));
  })();
  type RecentGroupBy = 'none' | 'date' | 'project';
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < COLLAPSE_BREAKPOINT);
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [recentGroupBy, setRecentGroupBy] = useState<RecentGroupBy>('date');
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const groupMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let prev = window.innerWidth;
    function handleResize() {
      const w = window.innerWidth;
      if (prev >= COLLAPSE_BREAKPOINT && w < COLLAPSE_BREAKPOINT) setCollapsed(true);
      prev = w;
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!groupMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (groupMenuRef.current && !groupMenuRef.current.contains(e.target as Node)) setGroupMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [groupMenuOpen]);

  async function handleSignOut() {
    if (!localUserId) await signOut();
    navigate('/signin', { replace: true });
  }

  async function handleRenameTest(id: string, title: string) {
    await updateTest(id, { title });
    refresh();
  }

  async function handleDeleteTest(id: string) {
    await deleteTest(id);
  }

  async function handleAddToProject(testId: string, projectId: string) {
    await addTestToProject(projectId, testId);
    refreshProjects();
  }

  const sidebarWidth = collapsed ? 56 : 236;

  return (
    <div className="flex h-screen bg-base">
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <aside
        className="flex flex-col flex-shrink-0 bg-surface transition-[width,padding] duration-200 ease-out overflow-hidden"
        style={{
          width: sidebarWidth,
          padding: collapsed ? '16px 8px' : '24px 16px',
          gap: 32,
        }}
      >
        {/* Brand */}
        <div className="flex items-center pl-2 pr-1 py-2" style={{ justifyContent: collapsed ? 'center' : 'space-between' }}>
          {!collapsed && (
            <span className="text-text-hi font-sans font-semibold whitespace-nowrap" style={{ fontSize: 18, letterSpacing: '0.2px' }}>Splisona</span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0 transition-colors hover:bg-raised"
            aria-label={collapsed ? 'サイドバーを開く' : 'サイドバーを閉じる'}
          >
            {collapsed
              ? <PanelLeft size={16} className="text-text-lo" />
              : <PanelLeftClose size={16} className="text-text-lo" />
            }
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-col" style={{ gap: 3 }}>
          <NavLink
            to="/tests/new"
            title={collapsed ? '新規A/Bテスト' : undefined}
            className="flex items-center transition-colors text-text-mid hover:bg-raised"
            style={{
              gap: collapsed ? 0 : 12,
              padding: collapsed ? '8px 0' : '8px 12px',
              borderRadius: 10,
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}
          >
            <span
              className="flex items-center justify-center flex-shrink-0 rounded-full"
              style={{ width: 20, height: 20, background: '#3A3D42' }}
            >
              <Plus size={12} color="#FFFFFF" />
            </span>
            {!collapsed && <span className="font-sans text-sm whitespace-nowrap" style={{ color: '#9BA1AC' }}>新規A/Bテスト</span>}
          </NavLink>
          {NAV_MAIN.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center rounded-md transition-colors ${
                  isActive ? 'text-text-hi font-semibold bg-accent-dim' : 'text-text-mid hover:bg-raised'
                }`
              }
              style={() => ({
                gap: collapsed ? 0 : 10,
                padding: collapsed ? '9px 0' : '9px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-accent' : 'text-text-lo'} />
                  {!collapsed && <span className="font-sans whitespace-nowrap" style={{ fontSize: 14, fontWeight: isActive ? 600 : 400 }}>{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Personas */}
        <div className="flex flex-col" style={{ gap: 3 }}>
          {!collapsed && (
            <span className="text-text-lo font-mono text-xs px-3 pb-1" style={{ letterSpacing: 0.5 }}>評価</span>
          )}
          {NAV_PERSONAS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center rounded-md transition-colors ${
                  isActive ? 'text-text-hi font-semibold bg-accent-dim' : 'text-text-mid hover:bg-raised'
                }`
              }
              style={() => ({
                gap: collapsed ? 0 : 10,
                padding: collapsed ? '9px 0' : '9px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-accent' : 'text-text-lo'} />
                  {!collapsed && <span className="font-sans whitespace-nowrap" style={{ fontSize: 14, fontWeight: isActive ? 600 : 400 }}>{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Recent tests */}
        {recentTests.length > 0 && !collapsed && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ gap: 4 }}>
            {/* Section header + group toggle */}
            {!collapsed && (
              <div className="flex items-center justify-between pl-3 pr-1 pb-1">
                <span className="text-text-lo font-mono text-xs" style={{ letterSpacing: 0.5 }}>最近のテスト</span>
                <div className="relative" ref={groupMenuRef}>
                  <button
                    type="button"
                    onClick={() => setGroupMenuOpen((o) => !o)}
                    className="flex items-center justify-center w-6 h-6 rounded-md transition-colors hover:bg-raised"
                    aria-label="グループ化"
                  >
                    <SlidersHorizontal size={13} className="text-text-lo" />
                  </button>
                  {groupMenuOpen && (
                    <div
                      className="absolute right-0 bg-surface border border-hairline rounded-md overflow-hidden"
                      style={{ top: '100%', marginTop: 4, minWidth: 150, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 50 }}
                    >
                      <div className="px-3 py-2 border-b border-hairline">
                        <span className="text-text-lo font-sans text-xs">グループ化</span>
                      </div>
                      {([['none', 'なし'], ['date', '日付'], ['project', 'プロジェクト']] as const).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => { setRecentGroupBy(key); setGroupMenuOpen(false); }}
                          className="flex items-center justify-between w-full px-3 py-2 transition-colors hover:bg-raised text-text-hi font-sans text-sm"
                        >
                          {label}
                          {recentGroupBy === key && <Check size={14} className="text-accent" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Items */}
            {recentGroupBy === 'date' || recentGroupBy === 'project' ? (
              <div className="flex flex-col flex-1 overflow-y-auto min-h-0" style={{ gap: 10 }}>
                {(recentGroupBy === 'date' ? recentGroups : projectGroups).map((group) => (
                  <div key={group.label} className="flex flex-col" style={{ gap: 3 }}>
                    {!collapsed && (
                      <span className="text-text-lo font-mono px-3 pb-0.5" style={{ fontSize: 11, letterSpacing: 0.3 }}>{group.label}</span>
                    )}
                    {group.items.map((t) => (
                      <SidebarTestItem
                        key={t.testId}
                        test={t}
                        projects={projects}
                        onRename={handleRenameTest}
                        onDelete={handleDeleteTest}
                        onAddToProject={handleAddToProject}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col flex-1 overflow-y-auto min-h-0" style={{ gap: 3 }}>
                {recentTests.map((t) => (
                  <SidebarTestItem
                    key={t.testId}
                    test={t}
                    projects={projects}
                    onRename={handleRenameTest}
                    onDelete={handleDeleteTest}
                    onAddToProject={handleAddToProject}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Account menu */}
        <div className="relative mt-auto" ref={menuRef}>
          {menuOpen && (() => {
            const rect = menuRef.current?.getBoundingClientRect();
            return (
            <div
              className="overflow-hidden bg-surface border border-hairline rounded-md"
              style={collapsed ? {
                position: 'fixed',
                bottom: rect ? window.innerHeight - rect.top + 8 : 80,
                left: rect ? rect.right + 8 : 64,
                boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                minWidth: 220,
                zIndex: 50,
              } : {
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                marginBottom: 8,
                boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                minWidth: 220,
              }}
            >

              <div className="px-4 py-3 border-b border-hairline">
                {userProfile.email && <p className="text-text-lo font-mono text-xs mb-0.5">{userProfile.email}</p>}
                <p className="text-text-hi font-sans text-sm font-semibold">{userProfile.name}</p>
              </div>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setSettingsOpen(true); }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 transition-colors hover:bg-raised text-text-hi font-sans text-sm"
              >
                <Settings size={15} className="text-text-mid" />
                設定
              </button>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setAboutOpen(true); }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 transition-colors hover:bg-raised text-text-hi font-sans text-sm"
              >
                <Info size={15} className="text-text-mid" />
                Splisona について
              </button>
              <div className="h-px bg-hairline" />
              <button
                type="button"
                onClick={() => { setMenuOpen(false); handleSignOut(); }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 transition-colors hover:bg-raised text-danger font-sans text-sm"
              >
                <LogOut size={15} className="text-danger" />
                サインアウト
              </button>
            </div>
          );})()}

          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="アカウントメニュー"
            className="flex items-center w-full rounded-md px-2 py-2 transition-colors hover:bg-raised"
            style={{
              gap: collapsed ? 0 : 10,
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 bg-raised border border-hairline">
              <span className="text-text-mid font-sans text-xs font-semibold">{userProfile.initials}</span>
            </div>
            {!collapsed && (
              <>
                <div className="flex flex-col flex-1 text-left overflow-hidden" style={{ gap: 1 }}>
                  <span className="text-text-hi font-sans text-sm font-medium whitespace-nowrap">{userProfile.name}</span>
                  {userProfile.email && <span className="text-text-lo font-sans text-xs whitespace-nowrap truncate">{userProfile.email}</span>}
                </div>
                <ChevronsUpDown size={14} className="text-text-lo flex-shrink-0" />
              </>
            )}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-base">
        <Outlet />
      </main>
    </div>
  );
}
