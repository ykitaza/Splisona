export function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

export const PALETTE = [
  '#6E78D9', '#C9974F', '#54B587', '#E06A6A',
  '#8B7EC8', '#5BA3D9', '#D97B6E', '#7EC8A4',
];

export function getNodeColor(seed: string): string {
  return PALETTE[hashSeed(seed) % PALETTE.length];
}

interface PersonaNodeProps {
  seed: string;
  size?: number;
}

export function PersonaNode({ seed, size = 44 }: PersonaNodeProps) {
  const color = PALETTE[hashSeed(seed) % PALETTE.length];

  const grid = 5;
  const dot = 0.78;
  const pad = 2;
  const cellSize = (100 - pad * 2) / grid;
  const dotSize = cellSize * dot;
  const offset = (cellSize - dotSize) / 2;
  const rx = dotSize * 0.2;

  const h1 = hashSeed(seed);
  const h2 = hashSeed(seed + '\x01');

  const filled: boolean[] = [];
  for (let i = 0; i < 15; i++) {
    const hash = i < 16 ? h1 : h2;
    filled.push(((hash >>> i) & 1) === 1);
  }
  const count = filled.filter(Boolean).length;
  if (count < 5) {
    for (let i = 0; i < 15 && filled.filter(Boolean).length < 7; i++) {
      if (!filled[i]) filled[i] = true;
    }
  }

  const rects: { x: number; y: number }[] = [];
  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < 3; col++) {
      if (!filled[row * 3 + col]) continue;
      rects.push({ x: pad + col * cellSize + offset, y: pad + row * cellSize + offset });
      if (col < 2) {
        rects.push({ x: pad + (4 - col) * cellSize + offset, y: pad + row * cellSize + offset });
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${seed} のアイコン`}
    >
      {rects.map((d, i) => (
        <rect key={i} x={d.x} y={d.y} width={dotSize} height={dotSize} rx={rx} fill={color} />
      ))}
    </svg>
  );
}
