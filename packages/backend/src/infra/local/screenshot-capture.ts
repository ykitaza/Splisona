import { MAX_FULL_HEIGHT, computeSegmentPlan } from "@chorus/shared";

export class ScreenshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScreenshotError";
  }
}

const VIEWPORT_WIDTH = 1280;

/**
 * 指定 URL のスクリーンショットを撮影する（Playwright / dev 専用）。
 * 本番環境では外部スクリーンショットサービスへの差し替えを想定。
 * 実コンテンツ高が閾値を超える場合は原本に加えて分割セグメントも返す。
 */
export async function captureWebsite(url: string): Promise<{ full: Buffer; segments: Buffer[] }> {
  // Playwright は devDependency のため動的インポート
  const { chromium } = await import("playwright");

  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: VIEWPORT_WIDTH, height: 900 });
    await page.goto(url, { waitUntil: "load", timeout: 30_000 });
    await page.waitForTimeout(2000);

    // 遅延読み込み対策: 段階スクロールしてコンテンツを読み込ませてから先頭に戻す
    for (let i = 0; i < 20; i++) {
      const reachedBottom = await page.evaluate((step: number) => {
        const before = window.scrollY;
        window.scrollBy(0, step);
        return window.scrollY === before;
      }, 800);
      await page.waitForTimeout(150);
      if (reachedBottom) break;
    }
    await page.evaluate(() => window.scrollTo(0, 0));

    // scrollHeight はビューポート高が下限になるため、一旦縮めてから実コンテンツ高を測る
    await page.setViewportSize({ width: VIEWPORT_WIDTH, height: 600 });
    await page.waitForTimeout(150);
    const contentHeight = await page.evaluate(() =>
      Math.ceil(Math.max(document.body?.scrollHeight ?? 0, document.documentElement.scrollHeight)),
    );

    const fullHeight = Math.min(Math.max(contentHeight, 900), MAX_FULL_HEIGHT);
    await page.setViewportSize({ width: VIEWPORT_WIDTH, height: fullHeight });
    await page.waitForTimeout(200);

    const fullBuf = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: VIEWPORT_WIDTH, height: fullHeight },
    });
    const full = Buffer.from(fullBuf);

    const plan = computeSegmentPlan(contentHeight);
    const segments: Buffer[] = [];
    for (const { y, h } of plan) {
      const buf = await page.screenshot({
        type: "png",
        clip: { x: 0, y, width: VIEWPORT_WIDTH, height: h },
      });
      segments.push(Buffer.from(buf));
    }

    return { full, segments };
  } catch (e) {
    throw new ScreenshotError(`サイトのスクリーンショット取得に失敗しました: ${String(e)}`);
  } finally {
    await browser.close();
  }
}
