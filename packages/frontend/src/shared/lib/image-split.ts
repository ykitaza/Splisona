/**
 * 縦長デザイン画像を評価用に分割する。
 * 高さ 2600px を超える画像を、高さ 2000px・のりしろ 150px の
 * セグメントに分割する（最大6分割。6を超える場合はセグメント高を広げて6枚に収める）。
 */
import { computeSegmentPlan } from '@chorus/shared';

export interface SplitResult {
  blobs: Blob[]; // 上から順
}

export async function splitImageIfNeeded(file: File): Promise<Blob[] | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }

  const { width, height } = bitmap;
  const plan = computeSegmentPlan(height);
  if (plan.length === 0) {
    bitmap.close();
    return null;
  }

  const type = file.type === 'image/jpeg' || file.type === 'image/webp' ? file.type : 'image/png';
  const quality = type === 'image/jpeg' || type === 'image/webp' ? 0.92 : undefined;

  const blobs: Blob[] = [];
  for (const { y, h } of plan) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, y, width, h, 0, 0, width, h);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    if (!blob) {
      bitmap.close();
      return null;
    }
    blobs.push(blob);
  }

  bitmap.close();
  return blobs;
}
