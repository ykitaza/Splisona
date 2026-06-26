export class FigmaCaptureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FigmaCaptureError";
  }
}

/**
 * Figma URL からノードのスクリーンショットを Buffer で返す。
 * URL 例: https://www.figma.com/design/{fileKey}/...?node-id=1-23
 */
export async function captureFigmaNode(url: string, token: string): Promise<Buffer> {
  const match = url.match(/figma\.com\/(?:design|file)\/([^/?]+)/);
  const fileKey = match?.[1];
  if (!fileKey) throw new FigmaCaptureError("Figma URL からファイルキーを取得できませんでした");

  const nodeIdRaw = new URL(url).searchParams.get("node-id") ?? "";
  if (!nodeIdRaw) throw new FigmaCaptureError("URL に node-id パラメータがありません");

  // URL は "123-456" 形式、API レスポンスのキーは "123:456" 形式
  const nodeIdCanonical = nodeIdRaw.replace(/-/g, ":");

  const apiUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(nodeIdRaw)}&format=png`;
  const apiRes = await fetch(apiUrl, { headers: { "X-Figma-Token": token } });

  if (!apiRes.ok) {
    throw new FigmaCaptureError(`Figma API エラー: ${apiRes.status} ${apiRes.statusText}`);
  }

  const data = await apiRes.json() as { images?: Record<string, string>; err?: string };

  if (data.err) throw new FigmaCaptureError(`Figma API エラー: ${data.err}`);

  const imgUrl = data.images?.[nodeIdCanonical] ?? data.images?.[nodeIdRaw];
  if (!imgUrl) throw new FigmaCaptureError("指定したノードの画像 URL が取得できませんでした");

  const imgRes = await fetch(imgUrl);
  if (!imgRes.ok) throw new FigmaCaptureError("Figma 画像のダウンロードに失敗しました");

  return Buffer.from(await imgRes.arrayBuffer());
}
