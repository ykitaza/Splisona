import { useCurrentFrame, interpolate } from 'remotion';
import { TEXT_HI, TEXT_MID } from '../lib/colors';
import { FONT_SANS } from '../lib/fonts';

export const Caption: React.FC<{
  text: string;
  startFrame?: number;
  variant?: 'headline' | 'sub' | 'caption';
}> = ({ text, startFrame = 0, variant = 'caption' }) => {
  const frame = useCurrentFrame();
  const rel = frame - startFrame;
  const opacity = interpolate(rel, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const y = interpolate(rel, [0, 20], [12, 0], { extrapolateRight: 'clamp' });

  const style: React.CSSProperties = {
    fontFamily: FONT_SANS,
    color: variant === 'caption' ? TEXT_MID : TEXT_HI,
    fontSize: variant === 'headline' ? 42 : variant === 'sub' ? 24 : 18,
    fontWeight: variant === 'headline' ? 700 : 400,
    opacity,
    transform: `translateY(${y}px)`,
    textAlign: 'center' as const,
    letterSpacing: variant === 'caption' ? 0.5 : 0,
  };

  return <div style={style}>{text}</div>;
};
