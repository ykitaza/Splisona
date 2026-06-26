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

  const grid = 5;
  const dot = 0.78;
  const step = 100 / grid;
  const r = (step * dot) / 2;

  const cells: boolean[][] = [];
  for (let row = 0; row < grid; row++) {
    const rowCells: boolean[] = [];
    for (let col = 0; col < 3; col++) {
      rowCells.push((hashSeed(seed + row + col) >>> 0) % 2 === 1);
    }
    cells.push(rowCells);
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${seed} のアイコン`}
    >
      {cells.map((row, ri) =>
        row.map((fill, ci) => {
          if (!fill) return null;
          const cols = ci === 2 ? [ci] : [ci, 4 - ci];
          return cols.map((col) => (
            <circle
              key={`${col}-${ri}`}
              cx={step / 2 + col * step}
              cy={step / 2 + ri * step}
              r={r}
              fill={color}
            />
          ));
        })
      )}
    </svg>
  );
}
