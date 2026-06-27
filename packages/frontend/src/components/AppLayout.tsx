import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Users, FlaskConical, Plus, Settings, LogOut, ChevronsUpDown, Info, X, PanelLeft, PanelLeftClose } from 'lucide-react';
import { signOut } from 'aws-amplify/auth';
import { SettingsModal } from './SettingsModal';

const NAV_ITEMS = [
  { to: '/results', icon: FlaskConical, label: 'A/Bテスト' },
  { to: '/personas', icon: Users, label: 'ペルソナ' },
];

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
        <div className="flex items-center px-2 py-2" style={{ justifyContent: collapsed ? 'center' : 'space-between' }}>
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
          {/* NewTestCTA */}
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
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
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
            <div className="flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 bg-raised border border-hairline">
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
