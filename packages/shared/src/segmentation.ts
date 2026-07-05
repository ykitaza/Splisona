// 縦長ページ/画像の分割撮影・分割評価の共通仕様
export const SEGMENT_THRESHOLD = 2600;
export const SEGMENT_HEIGHT = 2000;
export const SEGMENT_OVERLAP = 150;
export const MAX_SEGMENTS = 6;
export const MAX_FULL_HEIGHT = 16000;

export interface SegmentPlanEntry {
  y: number;
  h: number;
}

/** 高さ (実コンテンツ高) からセグメント撮影位置を算出する */
export function computeSegmentPlan(height: number): SegmentPlanEntry[] {
  if (height <= SEGMENT_THRESHOLD) return [];

  let segH = SEGMENT_HEIGHT;
  const stride0 = segH - SEGMENT_OVERLAP;
  let count = Math.max(1, Math.ceil((height - segH) / stride0) + 1);

  if (count > MAX_SEGMENTS) {
    count = MAX_SEGMENTS;
    segH = Math.ceil((height + SEGMENT_OVERLAP * (count - 1)) / count);
  }

  const stride = segH - SEGMENT_OVERLAP;
  const positions: SegmentPlanEntry[] = [];
  for (let i = 0; i < count; i++) {
    const y = i * stride;
    if (y >= height) break;
    const h = Math.min(segH, height - y);
    positions.push({ y, h });
    if (y + h >= height) break;
  }
  return positions;
}
