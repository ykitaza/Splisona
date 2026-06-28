/**
 * @schema 2.11
 * @input scores: string = "62,71,68,78,82"
 * @input winners: string = "B,A,B,A,B"
 * @input colorA: color = #6E78D9
 * @input colorB: color = #C9974F
 */
const vals = pencil.input.scores.split(",").map(Number);
const wins = pencil.input.winners.split(",");
const n = vals.length;
const maxV = Math.max(...vals);
const minV = Math.min(...vals);
const range = maxV - minV || 1;
const barW = 64;
const gap = 20;
const totalW = barW * n + gap * (n - 1);
const offX = (pencil.width - totalW) / 2;
const labelH = 24;
const padTop = 20;
const chartH = pencil.height - labelH - padTop;

const nodes = [];

nodes.push({
  type: "rectangle",
  name: "Baseline",
  x: offX - 8,
  y: chartH + padTop,
  width: totalW + 16,
  height: 1,
  fill: "#FFFFFF1F",
});

for (let i = 0; i < n; i++) {
  const norm = (vals[i] - minV) / range;
  const h = Math.max(20, norm * chartH * 0.75 + 20);
  const x = offX + i * (barW + gap);
  const clr = wins[i] === "A" ? pencil.input.colorA : pencil.input.colorB;
  const isLast = i === n - 1;

  nodes.push({
    type: "rectangle",
    name: "Bar" + (i + 1),
    x: x, y: chartH + padTop - h,
    width: barW, height: h,
    fill: clr,
    cornerRadius: [4, 4, 0, 0],
    opacity: isLast ? 1.0 : 0.6,
  });

  nodes.push({
    type: "text",
    name: "Sc" + (i + 1),
    x: x, y: chartH + padTop - h - 18,
    width: barW,
    content: String(vals[i]),
    fontFamily: "Geist Mono", fontSize: 13,
    fill: isLast ? "#F2F4F7" : "#9BA1AC",
    fontWeight: isLast ? "600" : "normal",
    textAlign: "center", textGrowth: "fixed-width",
  });

  nodes.push({
    type: "text",
    name: "Lb" + (i + 1),
    x: x, y: chartH + padTop + 6,
    width: barW,
    content: "#" + (i + 1),
    fontFamily: "Geist Mono", fontSize: 11,
    fill: "#5B616B",
    textAlign: "center", textGrowth: "fixed-width",
  });
}

return nodes;
