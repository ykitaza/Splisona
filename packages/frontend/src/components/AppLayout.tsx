import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Users, Columns2, BarChart3, Settings, LogOut, ChevronsUpDown, Info, X, PanelLeft, PanelLeftClose } from 'lucide-react';
import { signOut } from 'aws-amplify/auth';
import { SettingsModal } from './SettingsModal';

const NAV_ITEMS = [
  { to: '/personas', icon: Users, label: 'ペルソナ' },
  { to: '/tests/new', icon: Columns2, label: 'A/Bテスト' },
  { to: '/results', icon: BarChart3, label: '結果' },
];

const APP_VERSION = '0.0.1';
const GIT_HASH = '0f8b632';
const COLLAPSE_BREAKPOINT = 1024;

function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        data-testid="about-modal-content"
        className="flex flex-col items-center relative bg-surface px-8 py-10"
        style={{ width: 320, borderRadius: 14, border: '1px solid var(--color-hairline)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 flex items-center justify-center w-6 h-6 rounded-full transition-colors hover:bg-raised"
        >
          <X size={14} className="text-text-lo" />
        </button>
        <div className="flex items-center justify-center mb-5 rounded-lg bg-base" style={{ width: 72, height: 72, borderRadius: 18 }}>
          <span className="text-text-hi font-sans text-4xl font-bold leading-none">C</span>
        </div>
        <p className="text-text-hi font-sans text-xl font-bold mb-1.5">Chorus</p>
        <p className="text-text-lo font-mono text-xs tracking-widest mb-1">AI PERSONA REVIEW</p>
        <p className="text-text-lo font-mono text-xs">バージョン {APP_VERSION} ({GIT_HASH})</p>
      </div>
    </div>
  );
}

export function AppLayout() {
  const navigate = useNavigate();
  const localUserId = import.meta.env?.VITE_LOCAL_USER_ID as string | undefined;
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < COLLAPSE_BREAKPOINT);
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < COLLAPSE_BREAKPOINT) setCollapsed(true);
      else setCollapsed(false);
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

  async function handleSignOut() {
    if (!localUserId) await signOut();
    navigate('/signin', { replace: true });
  }

  const sidebarWidth = collapsed ? 56 : 240;

  return (
    <div className="flex h-screen bg-base">
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <aside
        className="flex flex-col flex-shrink-0 bg-surface border-r border-hairline transition-[width,padding] duration-200 ease-out overflow-hidden"
        style={{
          width: sidebarWidth,
          padding: collapsed ? '16px 8px' : '24px 16px',
          gap: 8,
        }}
      >
        {/* Brand */}
        <div className="flex items-center px-2 py-2" style={{ gap: 10, justifyContent: collapsed ? 'center' : 'flex-start' }}>
          {!collapsed && (
            <>
              <div
                className="flex items-center justify-center flex-shrink-0 rounded-md"
                style={{ width: 28, height: 28, background: '#0A0A0A', borderRadius: 6 }}
              >
                <span className="text-text-hi font-sans text-sm font-semibold">C</span>
              </div>
              <div className="flex flex-col flex-1 overflow-hidden" style={{ gap: 1 }}>
                <span className="text-text-hi font-sans text-sm font-semibold whitespace-nowrap">Chorus</span>
                <span className="text-text-lo font-mono whitespace-nowrap" style={{ fontSize: 9, letterSpacing: '0.5px' }}>AI PERSONA REVIEW</span>
              </div>
            </>
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
        <nav className="flex flex-col" style={{ gap: 2 }}>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center rounded-md transition-colors ${
                  isActive ? 'text-accent font-semibold bg-accent-dim' : 'text-text-mid hover:bg-raised'
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
                  <Icon size={18} className={isActive ? 'text-accent' : 'text-text-mid'} />
                  {!collapsed && <span className="font-sans text-sm whitespace-nowrap" style={{ fontWeight: isActive ? 600 : 500 }}>{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Account menu */}
        <div className="relative" ref={menuRef}>
          {menuOpen && (
            <div
              className="absolute overflow-hidden bg-surface border border-hairline rounded-md"
              style={{
                bottom: '100%',
                left: collapsed ? '100%' : 0,
                right: collapsed ? 'auto' : 0,
                marginBottom: collapsed ? 0 : 8,
                marginLeft: collapsed ? 8 : 0,
                boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                minWidth: 220,
              }}
            >
              <div className="px-4 py-3 border-b border-hairline">
                <p className="text-text-lo font-mono text-xs mb-0.5">private-user-mail@example.co.jp</p>
                <p className="text-text-hi font-sans text-sm font-semibold">山田 太郎</p>
                <p className="text-text-lo font-sans text-xs">デザイナー</p>
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
                Chorus について
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
          )}

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
            <div className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 bg-raised">
              <span className="text-text-mid font-sans text-xs font-semibold">YK</span>
            </div>
            {!collapsed && (
              <>
                <div className="flex flex-col flex-1 text-left overflow-hidden" style={{ gap: 1 }}>
                  <span className="text-text-hi font-sans text-sm font-medium whitespace-nowrap">山田 太郎</span>
                  <span className="text-text-lo font-sans text-xs whitespace-nowrap">デザイナー</span>
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
