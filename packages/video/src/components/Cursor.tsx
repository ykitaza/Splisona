import { useCurrentFrame, interpolate, spring } from 'remotion';
import { FPS } from '../lib/timing';

type Waypoint = { x: number; y: number; frame: number; click?: boolean };

export const Cursor: React.FC<{ waypoints: Waypoint[] }> = ({ waypoints }) => {
  const frame = useCurrentFrame();
  if (waypoints.length === 0) return null;

  let x = waypoints[0].x;
  let y = waypoints[0].y;
  let clicking = false;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const cur = waypoints[i];
    const next = waypoints[i + 1];
    if (frame >= cur.frame && frame <= next.frame) {
      x = interpolate(frame, [cur.frame, next.frame], [cur.x, next.x], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      });
      y = interpolate(frame, [cur.frame, next.frame], [cur.y, next.y], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      });
      break;
    }
    if (frame > next.frame) {
      x = next.x;
      y = next.y;
    }
  }

  for (const wp of waypoints) {
    if (wp.click && frame >= wp.frame && frame < wp.frame + 12) {
      clicking = true;
    }
  }

  const clickScale = clicking
    ? spring({ frame: frame - (waypoints.find(w => w.click && frame >= w.frame && frame < w.frame + 12)?.frame ?? 0), fps: FPS, config: { damping: 15, stiffness: 300 } })
    : 0;

  if (frame < waypoints[0].frame) return null;

  return (
    <div style={{ position: 'absolute', left: x - 4, top: y - 2, pointerEvents: 'none', zIndex: 100 }}>
      <svg width="24" height="28" viewBox="0 0 24 28" fill="none">
        <path d="M2 2L2 22L7.5 17L12.5 24L16 22L11 15L18 14L2 2Z" fill="white" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />
      </svg>
      {clicking && (
        <div style={{
          position: 'absolute', left: 0, top: 4,
          width: 24 * (1 + clickScale), height: 24 * (1 + clickScale),
          borderRadius: '50%',
          border: '2px solid rgba(110,120,217,0.5)',
          opacity: 1 - clickScale,
          transform: `translate(-${12 * clickScale}px, -${12 * clickScale}px)`,
        }} />
      )}
    </div>
  );
};
