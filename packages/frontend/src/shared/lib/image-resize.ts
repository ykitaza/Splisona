/**
 * AI モデルの入力上限（Bedrock: 1辺 8000px）を超える画像を
 * アップロード前にブラウザ内で自動縮小する。
 */
const MAX_DIMENSION = 7800;

export async function resizeImageIfNeeded(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // デコード不能ならそのまま（サーバー側エラーに任せる）
  }

  const { width, height } = bitmap;
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    bitmap.close();
    return file;
  }

  const scale = MAX_DIMENSION / Math.max(width, height);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const type = file.type === 'image/jpeg' || file.type === 'image/webp' ? file.type : 'image/png';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
  if (!blob) return file;

  return new File([blob], file.name, { type });
}
