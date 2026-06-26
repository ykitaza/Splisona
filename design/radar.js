/**
 * @schema 2.11
 * @input axes: number = 5
 * @input labels: string = "使いやすさ,魅力,分かりやすさ,行動喚起,信頼感"
 * @input valuesA: string = "4.2,3.6,4.5,3.2,4.0"
 * @input valuesB: string = "3.4,4.4,3.6,4.6,3.8"
 * @input maxValue: number = 5
 * @input rings: number = 4
 * @input colorA: color = #6E78D9
 * @input colorB: color = #C9974F
 * @input gridColor: color = #FFFFFF1F
 * @input labelColor: color = #9BA1AC
 */

const W = pencil.width;
const H = pencil.height;
const n = Math.max(3, Math.floor(pencil.input.axes));
const cx = W / 2;
const cy = H / 2;
const r = (Math.min(W, H) / 2) * 0.72;
const maxV = pencil.input.maxValue || 5;
const rings = Math.max(1, Math.floor(pencil.input.rings));

function parseVals(s) {
  return String(s || "").split(",").map((x) => parseFloat(x.trim()) || 0);
}
const valsA = parseVals(pencil.input.valuesA);
const valsB = parseVals(pencil.input.valuesB);
const labels = String(pencil.input.labels || "").split(",").map((x) => x.trim());

function angle(i) {
  return -Math.PI / 2 + (i * 2 * Math.PI) / n;
}
function pt(i, radius) {
  const a = angle(i);
  return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
}
function polyPath(radiusFn) {
  let d = "";
  for (let i = 0; i < n; i++) {
    const [x, y] = pt(i, radiusFn(i));
    d += (i === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2) + " ";
  }
  return d + "Z";
}

const nodes = [];

for (let k = 1; k <= rings; k++) {
  const rr = (r * k) / rings;
  nodes.push({
    type: "path",
    name: "ring-" + k,
    x: 0,
    y: 0,
    width: W,
    height: H,
    viewBox: [0, 0, W, H],
    geometry: polyPath(() => rr),
    stroke: pencil.input.gridColor,
    strokeWidth: 1,
    fill: "#00000000",
  });
}

for (let i = 0; i < n; i++) {
  const [x, y] = pt(i, r);
  nodes.push({
    type: "path",
    name: "spoke-" + i,
    x: 0,
    y: 0,
    width: W,
    height: H,
    viewBox: [0, 0, W, H],
    geometry: "M" + cx.toFixed(2) + " " + cy.toFixed(2) + "L" + x.toFixed(2) + " " + y.toFixed(2),
    stroke: pencil.input.gridColor,
    strokeWidth: 1,
    fill: "#00000000",
  });
}

nodes.push({
  type: "path",
  name: "dataB",
  x: 0,
  y: 0,
  width: W,
  height: H,
  viewBox: [0, 0, W, H],
  geometry: polyPath((i) => (r * Math.min(valsB[i] || 0, maxV)) / maxV),
  stroke: pencil.input.colorB,
  strokeWidth: 2,
  fill: pencil.input.colorB + "33",
});

nodes.push({
  type: "path",
  name: "dataA",
  x: 0,
  y: 0,
  width: W,
  height: H,
  viewBox: [0, 0, W, H],
  geometry: polyPath((i) => (r * Math.min(valsA[i] || 0, maxV)) / maxV),
  stroke: pencil.input.colorA,
  strokeWidth: 2,
  fill: pencil.input.colorA + "33",
});

for (let i = 0; i < n; i++) {
  const [x, y] = pt(i, r + 20);
  nodes.push({
    type: "text",
    name: "label-" + i,
    x: x - 55,
    y: y - 8,
    width: 110,
    textGrowth: "fixed-width",
    textAlign: "center",
    content: labels[i] || ("軸" + (i + 1)),
    fill: pencil.input.labelColor,
    fontFamily: "Geist",
    fontSize: 11,
  });
}

return nodes;
