import { SURFACE, BASE, HAIRLINE, TEXT_LO, TEXT_MID, RAISED } from '../lib/colors';
import { FONT_SANS, FONT_MONO } from '../lib/fonts';

const PAD = 24;
const WINDOW_W = 1920 - PAD * 2;
const WINDOW_H = 1080 - PAD * 2;
const TAB_H = 38;
const ADDR_H = 34;
const CONTENT_W = WINDOW_W;
const CONTENT_H = WINDOW_H - TAB_H - ADDR_H;
const SCALE = CONTENT_W / 1920;

export const BrowserFrame: React.FC<{
  url?: string;
  children: React.ReactNode;
}> = ({ url = 'splisona.pages.dev', children }) => {
  return (
    <div style={{
      width: 1920, height: 1080, background: '#050607',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: WINDOW_W, height: WINDOW_H,
        background: SURFACE,
        borderRadius: 12,
        border: `1px solid ${HAIRLINE}`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
      }}>
        {/* Tab bar */}
        <div style={{
          height: TAB_H, flexShrink: 0,
          background: RAISED,
          display: 'flex', alignItems: 'flex-end',
          padding: '0 12px',
          gap: 0,
        }}>
          {/* Traffic lights */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '0 8px', height: '100%', flexShrink: 0,
          }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FEBC2E' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }} />
          </div>

          {/* Active tab */}
          <div style={{
            marginLeft: 12,
            padding: '8px 20px 0',
            background: SURFACE,
            borderRadius: '8px 8px 0 0',
            display: 'flex', alignItems: 'center', gap: 8,
            height: 30,
            borderTop: `1px solid ${HAIRLINE}`,
            borderLeft: `1px solid ${HAIRLINE}`,
            borderRight: `1px solid ${HAIRLINE}`,
          }}>
            {/* Favicon — Splisona face motif */}
            <svg width="14" height="14" viewBox="0 0 72 72" fill="none">
              <rect width="72" height="72" rx="18" fill={RAISED} />
              <circle cx="24" cy="28" r="4" fill={TEXT_MID} />
              <circle cx="48" cy="28" r="4" fill={TEXT_MID} />
              <circle cx="24.5" cy="42.5" r="2.5" fill={TEXT_MID} />
              <circle cx="36.5" cy="46.5" r="2.5" fill={TEXT_MID} />
              <circle cx="47.5" cy="42.5" r="2.5" fill={TEXT_MID} />
            </svg>
            <span style={{
              fontFamily: FONT_SANS, fontSize: 12, color: TEXT_MID,
              whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              Splisona
            </span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={TEXT_LO} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginLeft: 4 }}>
              <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </div>

          {/* New tab button */}
          <div style={{
            width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 3, marginLeft: 4, opacity: 0.4,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT_LO} strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
        </div>

        {/* Address bar */}
        <div style={{
          height: ADDR_H, flexShrink: 0,
          background: SURFACE,
          display: 'flex', alignItems: 'center',
          padding: '0 16px',
          gap: 12,
          borderBottom: `1px solid ${HAIRLINE}`,
        }}>
          {/* Navigation arrows */}
          <div style={{ display: 'flex', gap: 8, opacity: 0.35 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT_LO} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT_LO} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>

          {/* URL bar */}
          <div style={{
            flex: 1,
            padding: '4px 14px',
            background: BASE,
            borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={TEXT_LO} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: TEXT_LO }}>
              {url}
            </span>
          </div>

          {/* Share/extensions */}
          <div style={{ display: 'flex', gap: 10, opacity: 0.35 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT_LO} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16,6 12,2 8,6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT_LO} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div style={{ width: CONTENT_W, height: CONTENT_H, overflow: 'hidden' }}>
          <div style={{
            transform: `scale(${SCALE})`,
            transformOrigin: 'top left',
            width: 1920, height: 1080,
          }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
