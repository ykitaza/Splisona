export class ScreenshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScreenshotError";
  }
}

/**
 * 指定 URL のスクリーンショットを Buffer で返す（Playwright / dev 専用）。
 * 本番環境では外部スクリーンショットサービスへの差し替えを想定。
 */
export async function captureWebsite(url: string): Promise<Buffer> {
  // Playwright は devDependency のため動的インポート
  const { chromium } = await import("playwright");

  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: "networkidle", timeout: 15_000 });
    const buf = await page.screenshot({ type: "png", fullPage: true });
    return Buffer.from(buf);
  } catch (e) {
    throw new ScreenshotError(`サイトのスクリーンショット取得に失敗しました: ${String(e)}`);
  } finally {
    await browser.close();
  }
}
