import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Columns2, BarChart2, Settings, LogOut } from 'lucide-react';
import { signOut } from 'aws-amplify/auth';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'ダッシュボード' },
  { to: '/personas', icon: Users, label: 'ペルソナ' },
  { to: '/tests/new', icon: Columns2, label: 'A/Bテスト' },
  { to: '/results', icon: BarChart2, label: '結果レポート' },
];

export function AppLayout() {
  const navigate = useNavigate();
  const localUserId = import.meta.env?.VITE_LOCAL_USER_ID as string | undefined;

  async function handleSignOut() {
    if (!localUserId) await signOut();
    navigate('/signin', { replace: true });
  }

  return (
    <div className="flex h-screen" style={{ background: '#F7F7F8' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col flex-shrink-0"
        style={{
          width: 240,
          background: '#FFFFFF',
          borderRight: '1px solid #E6E6E8',
          padding: '24px 16px',
          gap: 8,
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div
            className="flex items-center justify-center rounded-md flex-shrink-0"
            style={{ width: 28, height: 28, background: '#0A0A0A', borderRadius: 6 }}
          >
            <span style={{ color: '#FFFFFF', fontFamily: 'Geist, sans-serif', fontSize: 15, fontWeight: 600 }}>
              C
            </span>
          </div>
          <div className="flex flex-col" style={{ gap: 1 }}>
            <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 15, fontWeight: 600 }}>
              Chorus
            </span>
            <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 9, fontWeight: 400, letterSpacing: '0.5px' }}>
              AI PERSONA REVIEW
            </span>
          </div>
        </div>

        {/* Spacer */}
        <div style={{ height: 16 }} />

        {/* Nav */}
        <nav className="flex flex-col" style={{ gap: 2 }}>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-[#3B7DD8] font-semibold'
                    : 'text-[#666666] hover:bg-[#F7F7F8]'
                }`
              }
              style={({ isActive }) => isActive ? { background: '#E8F0FB' } : {}}
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} color={isActive ? '#3B7DD8' : '#666666'} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Grow */}
        <div className="flex-1" />

        {/* Settings */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive ? 'text-[#3B7DD8] font-semibold' : 'text-[#666666] hover:bg-[#F7F7F8]'
            }`
          }
          style={({ isActive }) => isActive ? { background: '#E8F0FB' } : {}}
        >
          {({ isActive }) => (
            <>
              <Settings size={18} color={isActive ? '#3B7DD8' : '#666666'} />
              設定
            </>
          )}
        </NavLink>

        {/* Profile + Sign Out */}
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{ width: 32, height: 32, background: '#F0F1F3' }}
          >
            <span style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 12, fontWeight: 600 }}>
              YK
            </span>
          </div>
          <div className="flex flex-col flex-1" style={{ gap: 1 }}>
            <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 13, fontWeight: 500 }}>
              山田 太郎
            </span>
            <span style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 11 }}>
              デザイナー
            </span>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex-shrink-0 text-[#9A9A9F] hover:text-[#1A1A1A] transition-colors"
            title="サインアウト"
          >
            <LogOut size={16} />
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
