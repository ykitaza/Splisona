/**
 * @schema 2.11
 * @input color: color = #6E8BFF
 * @input seed: string = "chorus"
 * @input grid: number = 5
 * @input dot: number = 0.78
 */

// シード文字列を決定論的な整数ハッシュへ
function hashSeed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const grid = Math.max(3, Math.floor(pencil.input.grid));
const seed = String(pencil.input.seed || "chorus");
const color = pencil.input.color;
const dotRatio = pencil.input.dot;

const W = pencil.width;
const H = pencil.height;
const cellW = W / grid;
const cellH = H / grid;
const half = Math.ceil(grid / 2);

// ハッシュからビット列を作り、左半分を決めて左右対称にミラー
let h = hashSeed(seed);
function nextBit() {
  h ^= h << 13; h >>>= 0;
  h ^= h >> 17;
  h ^= h << 5; h >>>= 0;
  return h & 1;
}

const filled = [];
for (let y = 0; y < grid; y++) {
  filled[y] = [];
  for (let x = 0; x < half; x++) {
    filled[y][x] = nextBit() === 1;
  }
  for (let x = half; x < grid; x++) {
    filled[y][x] = filled[y][grid - 1 - x];
  }
}

const nodes = [];
const dw = cellW * dotRatio;
const dh = cellH * dotRatio;
const ox = (cellW - dw) / 2;
const oy = (cellH - dh) / 2;

for (let y = 0; y < grid; y++) {
  for (let x = 0; x < grid; x++) {
    if (!filled[y][x]) continue;
    nodes.push({
      type: "rectangle",
      name: "dot-" + x + "-" + y,
      x: x * cellW + ox,
      y: y * cellH + oy,
      width: dw,
      height: dh,
      cornerRadius: Math.min(dw, dh) * 0.28,
      fill: color,
    });
  }
}

return nodes;
