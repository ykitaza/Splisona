import { SURFACE, HAIRLINE, TEXT_LO, RAISED } from '../lib/colors';
import { FONT_MONO } from '../lib/fonts';

export const BrowserFrame: React.FC<{
  url?: string;
  children: React.ReactNode;
  width?: number;
  height?: number;
}> = ({ url = 'app.splisona.com', children, width = 1720, height = 920 }) => {
  return (
    <div style={{
      width, height,
      background: SURFACE,
      borderRadius: 12,
      border: `1px solid ${HAIRLINE}`,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
    }}>
      {/* Title bar */}
      <div style={{
        height: 40,
        background: RAISED,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 8,
        borderBottom: `1px solid ${HAIRLINE}`,
        flexShrink: 0,
      }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FEBC2E' }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }} />
        <div style={{
          marginLeft: 32,
          padding: '4px 16px',
          background: SURFACE,
          borderRadius: 6,
          fontFamily: FONT_MONO,
          fontSize: 12,
          color: TEXT_LO,
        }}>
          {url}
        </div>
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {children}
      </div>
    </div>
  );
};
