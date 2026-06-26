import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Columns2, BarChart2, Settings, LogOut, ChevronsUpDown, Info, X, PanelLeft, PanelLeftClose } from 'lucide-react';
import { signOut } from 'aws-amplify/auth';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'ダッシュボード' },
  { to: '/personas', icon: Users, label: 'ペルソナ' },
  { to: '/tests/new', icon: Columns2, label: 'A/Bテスト' },
  { to: '/results', icon: BarChart2, label: '結果レポート' },
];

const APP_VERSION = '0.0.1';
const GIT_HASH = '0f8b632';
const COLLAPSE_BREAKPOINT = 1024;

function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={onClose}
    >
      <div
        className="flex flex-col items-center relative"
        style={{ background: '#F7F7F8', borderRadius: 16, width: 320, padding: '40px 32px 32px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 flex items-center justify-center rounded-full transition-colors hover:bg-[#E6E6E8]"
          style={{ width: 24, height: 24, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <X size={14} color="#9A9A9F" />
        </button>
        <div className="flex items-center justify-center rounded-2xl mb-5" style={{ width: 72, height: 72, background: '#0A0A0A', borderRadius: 18 }}>
          <span style={{ color: '#FFFFFF', fontFamily: 'Geist, sans-serif', fontSize: 36, fontWeight: 700, lineHeight: 1 }}>C</span>
        </div>
        <p style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Chorus</p>
        <p style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: '0.5px', marginBottom: 4 }}>AI PERSONA REVIEW</p>
        <p style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 12, marginBottom: 0 }}>バージョン {APP_VERSION} ({GIT_HASH})</p>
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
  const menuRef = useRef<HTMLDivElement>(null);

  // Auto-collapse on resize
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
    <div className="flex h-screen" style={{ background: '#F7F7F8' }}>
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}

      {/* Sidebar */}
      <aside
        className="flex flex-col flex-shrink-0"
        style={{
          width: sidebarWidth,
          background: '#FFFFFF',
          borderRight: '1px solid #E6E6E8',
          padding: collapsed ? '16px 8px' : '24px 16px',
          gap: 8,
          transition: 'width 0.2s ease, padding 0.2s ease',
          overflow: 'hidden',
        }}
      >
        {/* Brand row (with toggle button) */}
        <div className="flex items-center px-2 py-2" style={{ gap: 10, justifyContent: collapsed ? 'center' : 'flex-start' }}>
          {!collapsed && (
            <>
              <div
                className="flex items-center justify-center rounded-md flex-shrink-0"
                style={{ width: 28, height: 28, background: '#0A0A0A', borderRadius: 6 }}
              >
                <span style={{ color: '#FFFFFF', fontFamily: 'Geist, sans-serif', fontSize: 15, fontWeight: 600 }}>C</span>
              </div>
              <div className="flex flex-col flex-1" style={{ gap: 1, overflow: 'hidden' }}>
                <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap' }}>Chorus</span>
                <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 9, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>AI PERSONA REVIEW</span>
              </div>
            </>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex items-center justify-center rounded-md transition-colors hover:bg-[#F0F1F3] flex-shrink-0"
            style={{ width: 28, height: 28, background: 'none', border: 'none', cursor: 'pointer' }}
            aria-label={collapsed ? 'サイドバーを開く' : 'サイドバーを閉じる'}
          >
            {collapsed
              ? <PanelLeft size={16} color="#9A9A9F" />
              : <PanelLeftClose size={16} color="#9A9A9F" />
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
                  isActive ? 'text-[#3B7DD8] font-semibold' : 'text-[#666666] hover:bg-[#F7F7F8]'
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? '#E8F0FB' : undefined,
                gap: collapsed ? 0 : 10,
                padding: collapsed ? '9px 0' : '9px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} color={isActive ? '#3B7DD8' : '#666666'} />
                  {!collapsed && <span style={{ fontFamily: 'Geist, sans-serif', fontSize: 14, fontWeight: isActive ? 600 : 500, whiteSpace: 'nowrap' }}>{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          {menuOpen && (
            <div
              className="absolute overflow-hidden"
              style={{
                bottom: '100%',
                left: collapsed ? '100%' : 0,
                right: collapsed ? 'auto' : 0,
                marginBottom: collapsed ? 0 : 8,
                marginLeft: collapsed ? 8 : 0,
                background: '#FFFFFF',
                border: '1px solid #E6E6E8',
                boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
                borderRadius: 10,
                minWidth: 220,
              }}
            >
              <div className="px-4 py-3" style={{ borderBottom: '1px solid #E6E6E8' }}>
                <p style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11, marginBottom: 3 }}>private-user-mail@example.co.jp</p>
                <p style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 13, fontWeight: 600 }}>山田 太郎</p>
                <p style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 11 }}>デザイナー</p>
              </div>
              <NavLink
                to="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 transition-colors hover:bg-[#F7F7F8]"
                style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 13 }}
              >
                <Settings size={15} color="#666666" />
                設定
              </NavLink>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setAboutOpen(true); }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 transition-colors hover:bg-[#F7F7F8]"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 13 }}
              >
                <Info size={15} color="#666666" />
                Chorus について
              </button>
              <div style={{ height: 1, background: '#E6E6E8' }} />
              <button
                type="button"
                onClick={() => { setMenuOpen(false); handleSignOut(); }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 transition-colors hover:bg-[#FFF5F5]"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D64545', fontFamily: 'Geist, sans-serif', fontSize: 13 }}
              >
                <LogOut size={15} color="#D64545" />
                サインアウト
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center w-full rounded-md px-2 py-2 transition-colors hover:bg-[#F7F7F8]"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              gap: collapsed ? 0 : 10,
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}
          >
            <div
              className="flex items-center justify-center rounded-full flex-shrink-0"
              style={{ width: 32, height: 32, background: '#F0F1F3' }}
            >
              <span style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 12, fontWeight: 600 }}>YK</span>
            </div>
            {!collapsed && (
              <>
                <div className="flex flex-col flex-1 text-left" style={{ gap: 1, overflow: 'hidden' }}>
                  <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>山田 太郎</span>
                  <span style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 11, whiteSpace: 'nowrap' }}>デザイナー</span>
                </div>
                <ChevronsUpDown size={14} color="#9A9A9F" style={{ flexShrink: 0 }} />
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
