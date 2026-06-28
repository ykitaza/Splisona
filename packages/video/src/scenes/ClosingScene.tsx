import { useCurrentFrame, interpolate, spring } from 'remotion';
import { BASE, TEXT_HI, TEXT_MID, ACCENT, RAISED } from '../lib/colors';
import { FONT_SANS, FONT_MONO, loadFonts } from '../lib/fonts';
import { FPS } from '../lib/timing';

export const ClosingScene: React.FC = () => {
  loadFonts();
  const frame = useCurrentFrame();

  const logoOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const logoScale = spring({ frame: Math.max(0, frame - 20), fps: FPS, config: { damping: 14, stiffness: 120, mass: 0.8 } });
  const taglineOpacity = interpolate(frame, [50, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const taglineY = interpolate(frame, [50, 70], [12, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      width: 1920, height: 1080, background: BASE,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        opacity: logoOpacity,
        transform: `scale(${0.05 + (logoScale > 0 ? logoScale : 0) * 0.95})`,
      }}>
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <rect width="72" height="72" rx="18" fill={RAISED} />
          <circle cx="24" cy="28" r="4" fill="#F2F4F7" />
          <circle cx="48" cy="28" r="4" fill="#F2F4F7" />
          <circle cx="24.5" cy="42.5" r="2.5" fill="#F2F4F7" />
          <circle cx="36.5" cy="46.5" r="2.5" fill="#F2F4F7" />
          <circle cx="47.5" cy="42.5" r="2.5" fill="#F2F4F7" />
        </svg>
      </div>

      <p style={{
        fontFamily: FONT_SANS, fontSize: 42, fontWeight: 700,
        color: TEXT_HI, margin: 0, opacity: logoOpacity,
      }}>
        Splisona
      </p>

      <p style={{
        fontFamily: FONT_MONO, fontSize: 13, color: TEXT_MID,
        letterSpacing: 3, margin: 0,
        opacity: taglineOpacity, transform: `translateY(${taglineY}px)`,
      }}>
        AI PERSONA REVIEW
      </p>

      {/* no closing message */}
    </div>
  );
};
