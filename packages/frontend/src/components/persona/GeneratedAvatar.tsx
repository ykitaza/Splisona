// シード文字列から決定論的に生成するアバター。
// 色だけでなく作風（人物・ロボット・ネコ・クマ・エイリアン・宇宙飛行士）も
// シードで振り分け、画像アセットなしで個性のある見た目を与える。

import type { ReactNode } from 'react';

const PALETTES: [string, string][] = [
  ['#6366F1', '#8B5CF6'],
  ['#3B82F6', '#06B6D4'],
  ['#EC4899', '#F43F5E'],
  ['#F59E0B', '#EF4444'],
  ['#10B981', '#059669'],
  ['#8B5CF6', '#EC4899'],
  ['#0EA5E9', '#6366F1'],
  ['#14B8A6', '#22C55E'],
  ['#F97316', '#F59E0B'],
  ['#A855F7', '#6366F1'],
];

const STYLES = ['person', 'robot', 'cat', 'bear', 'alien', 'astro'] as const;

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

function renderStyle(style: (typeof STYLES)[number], feat: string): ReactNode {
  const W = { fill: '#FFFFFF', fillOpacity: 0.95 };
  switch (style) {
    case 'robot':
      return (
        <>
          <line x1="50" y1="11" x2="50" y2="24" stroke="#FFFFFF" strokeWidth="3" />
          <circle cx="50" cy="9" r="4" fill="#FFFFFF" />
          <rect x="20" y="42" width="6" height="14" rx="2" fill="#FFFFFF" />
          <rect x="74" y="42" width="6" height="14" rx="2" fill="#FFFFFF" />
          <rect x="26" y="24" width="48" height="46" rx="9" {...W} />
          <rect x="36" y="40" width="9" height="9" rx="2" fill={feat} />
          <rect x="55" y="40" width="9" height="9" rx="2" fill={feat} />
          <rect x="40" y="58" width="20" height="4" rx="2" fill={feat} />
        </>
      );
    case 'cat':
      return (
        <>
          <polygon points="30,22 39,46 21,46" {...W} />
          <polygon points="70,22 79,46 61,46" {...W} />
          <circle cx="50" cy="53" r="24" {...W} />
          <circle cx="42" cy="50" r="3" fill={feat} />
          <circle cx="58" cy="50" r="3" fill={feat} />
          <path d="M47 57 l3 4 l3 -4 Z" fill={feat} />
          <line x1="18" y1="53" x2="35" y2="55" stroke={feat} strokeWidth="1.5" />
          <line x1="18" y1="60" x2="35" y2="60" stroke={feat} strokeWidth="1.5" />
          <line x1="82" y1="53" x2="65" y2="55" stroke={feat} strokeWidth="1.5" />
          <line x1="82" y1="60" x2="65" y2="60" stroke={feat} strokeWidth="1.5" />
        </>
      );
    case 'bear':
      return (
        <>
          <circle cx="32" cy="30" r="11" {...W} />
          <circle cx="68" cy="30" r="11" {...W} />
          <circle cx="50" cy="54" r="25" {...W} />
          <circle cx="41" cy="50" r="3" fill={feat} />
          <circle cx="59" cy="50" r="3" fill={feat} />
          <ellipse cx="50" cy="61" rx="5" ry="4" fill={feat} />
        </>
      );
    case 'alien':
      return (
        <>
          <ellipse cx="50" cy="46" rx="21" ry="27" {...W} />
          <ellipse cx="41" cy="46" rx="5" ry="9" fill={feat} transform="rotate(20 41 46)" />
          <ellipse cx="59" cy="46" rx="5" ry="9" fill={feat} transform="rotate(-20 59 46)" />
        </>
      );
    case 'astro':
      return (
        <>
          <circle cx="50" cy="50" r="28" {...W} />
          <rect x="34" y="39" width="32" height="23" rx="11" fill={feat} />
          <rect x="40" y="44" width="8" height="6" rx="3" fill="#FFFFFF" fillOpacity="0.6" />
        </>
      );
    case 'person':
    default:
      return (
        <>
          <circle cx="50" cy="40" r="18" {...W} />
          <path d="M22 100 a28 28 0 0 1 56 0 Z" {...W} />
          <circle cx="43" cy="39" r="2.6" fill={feat} />
          <circle cx="57" cy="39" r="2.6" fill={feat} />
          <path d="M43 47 q7 6 14 0" stroke={feat} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </>
      );
  }
}

interface Props {
  seed: string;
  size?: number;
}

export function GeneratedAvatar({ seed, size = 44 }: Props) {
  const h = hashSeed(seed);
  const [c1, c2] = PALETTES[h % PALETTES.length];
  // 作風は色と独立に分散させたいので、反転シードの別ハッシュで選ぶ
  const style = STYLES[hashSeed(seed.split('').reverse().join('')) % STYLES.length];
  const gradId = `grad-${h.toString(36)}`;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${seed} のアバター`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${gradId})`} />
      {renderStyle(style, c1)}
    </svg>
  );
}
