import { SURFACE, BASE, TEXT_HI, TEXT_MID, TEXT_LO, ACCENT, ACCENT_DIM, RAISED, HAIRLINE } from '../lib/colors';
import { FONT_SANS, FONT_MONO } from '../lib/fonts';

const SIDEBAR_W = 236;

interface NavItem {
  label: string;
  active?: boolean;
  icon: React.ReactNode;
}

function FlaskIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
      <path d="M8.5 2h7" />
    </svg>
  );
}

function FolderIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      <path d="M2 10h20" />
    </svg>
  );
}

function UsersIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function PanelLeftCloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEXT_LO} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="m16 15-3-3 3-3" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={TEXT_LO} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="4" y1="21" y2="14" />
      <line x1="4" x2="4" y1="10" y2="3" />
      <line x1="12" x2="12" y1="21" y2="12" />
      <line x1="12" x2="12" y1="8" y2="3" />
      <line x1="20" x2="20" y1="21" y2="16" />
      <line x1="20" x2="20" y1="12" y2="3" />
      <line x1="2" x2="6" y1="14" y2="14" />
      <line x1="10" x2="14" y1="8" y2="8" />
      <line x1="18" x2="22" y1="16" y2="16" />
    </svg>
  );
}

const RECENT_TESTS = [
  'AURORA LP比較: ミニマル vs ボールド',
  'AURORA LP比較: 情報量 vs インパクト',
];

interface AppShellProps {
  activeNav: 'tests' | 'new' | 'projects' | 'personas';
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ activeNav, children }) => {
  return (
    <div style={{ width: 1920, height: 1080, background: BASE, display: 'flex' }}>
      {/* Sidebar */}
      <aside style={{
        width: SIDEBAR_W, flexShrink: 0, background: SURFACE,
        padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 32,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 8px 8px 8px' }}>
          <span style={{ fontFamily: FONT_SANS, fontSize: 18, fontWeight: 600, color: TEXT_HI, letterSpacing: 0.2 }}>
            Splisona
          </span>
          <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>
            <PanelLeftCloseIcon />
          </div>
        </div>

        {/* Main Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* New test */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 10,
          }}>
            <span style={{
              width: 20, height: 20, borderRadius: '50%', background: '#3A3D42',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </span>
            <span style={{ fontFamily: FONT_SANS, fontSize: 13, color: TEXT_MID }}>新規A/Bテスト</span>
          </div>

          {/* A/Bテスト */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10,
            background: activeNav === 'tests' ? ACCENT_DIM : 'transparent',
          }}>
            <FlaskIcon color={activeNav === 'tests' ? ACCENT : TEXT_LO} />
            <span style={{
              fontFamily: FONT_SANS, fontSize: 14,
              fontWeight: activeNav === 'tests' ? 600 : 400,
              color: activeNav === 'tests' ? TEXT_HI : TEXT_MID,
            }}>A/Bテスト</span>
          </div>

          {/* プロジェクト */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10,
            background: activeNav === 'projects' ? ACCENT_DIM : 'transparent',
          }}>
            <FolderIcon color={activeNav === 'projects' ? ACCENT : TEXT_LO} />
            <span style={{
              fontFamily: FONT_SANS, fontSize: 14,
              fontWeight: activeNav === 'projects' ? 600 : 400,
              color: activeNav === 'projects' ? TEXT_HI : TEXT_MID,
            }}>プロジェクト</span>
          </div>
        </nav>

        {/* Personas section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: TEXT_LO, padding: '0 12px 4px', letterSpacing: 0.5 }}>評価</span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10,
            background: activeNav === 'personas' ? ACCENT_DIM : 'transparent',
          }}>
            <UsersIcon color={activeNav === 'personas' ? ACCENT : TEXT_LO} />
            <span style={{
              fontFamily: FONT_SANS, fontSize: 14,
              fontWeight: activeNav === 'personas' ? 600 : 400,
              color: activeNav === 'personas' ? TEXT_HI : TEXT_MID,
            }}>ペルソナ</span>
          </div>
        </div>

        {/* Recent tests */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px 4px 12px' }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: TEXT_LO, letterSpacing: 0.5 }}>最近のテスト</span>
            <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>
              <SlidersIcon />
            </div>
          </div>
          <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: TEXT_LO, padding: '4px 12px 2px', letterSpacing: 0.5 }}>以前</span>
          {RECENT_TESTS.map((title) => (
            <div key={title} style={{
              padding: '7px 12px', borderRadius: 6,
            }}>
              <span style={{
                fontFamily: FONT_SANS, fontSize: 13, color: TEXT_MID, fontWeight: 400,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block',
              }}>
                {title}
              </span>
            </div>
          ))}
        </div>

        {/* Account */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px', marginTop: 'auto',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: RAISED,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600, color: TEXT_HI,
          }}>
            北祐
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
            <span style={{ fontFamily: FONT_SANS, fontSize: 13, color: TEXT_HI, fontWeight: 500 }}>山田 太郎</span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: TEXT_LO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>user@example.co...</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT_LO} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" />
          </svg>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {children}
      </main>
    </div>
  );
};
