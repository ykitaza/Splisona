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
  const h = hashSeed(seed);
  const color = PALETTE[h % PALETTE.length];

  const cells: { x: number; y: number; fill: boolean }[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      const bit = (hashSeed(seed + row + col) >>> 0) % 2 === 1;
      cells.push({ x: col, y: row, fill: bit });
    }
  }

  const cellSize = 16;
  const gap = 2;
  const padding = 6;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${padding * 2 + 5 * (cellSize + gap) - gap} ${padding * 2 + 5 * (cellSize + gap) - gap}`}
      role="img"
      aria-label={`${seed} のアイコン`}
    >
      <rect width="100%" height="100%" rx="8" fill={color} fillOpacity={0.15} />
      {cells.map(({ x, y, fill }) => {
        if (!fill) return null;
        const mirrorX = 4 - x;
        return (
          <g key={`${x}-${y}`}>
            <rect
              x={padding + x * (cellSize + gap)}
              y={padding + y * (cellSize + gap)}
              width={cellSize}
              height={cellSize}
              rx={3}
              fill={color}
            />
            {x !== 2 && (
              <rect
                x={padding + mirrorX * (cellSize + gap)}
                y={padding + y * (cellSize + gap)}
                width={cellSize}
                height={cellSize}
                rx={3}
                fill={color}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
