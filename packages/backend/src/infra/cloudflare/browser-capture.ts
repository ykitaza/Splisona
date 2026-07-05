import puppeteer from "@cloudflare/puppeteer";
import { MAX_FULL_HEIGHT, computeSegmentPlan } from "@chorus/shared";

const VIEWPORT_WIDTH = 1280;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function captureWebsiteWithBrowser(
  browserBinding: unknown,
  url: string,
): Promise<{ full: Buffer; segments: Buffer[] }> {
  const browser = await puppeteer.launch(browserBinding as never);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: VIEWPORT_WIDTH, height: 900 });
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

    // 遅延読み込み対策: 段階スクロールしてコンテンツを読み込ませてから先頭に戻す
    for (let i = 0; i < 20; i++) {
      const reachedBottom = await page.evaluate((step: number) => {
        const before = window.scrollY;
        window.scrollBy(0, step);
        return window.scrollY === before;
      }, 800);
      await sleep(150);
      if (reachedBottom) break;
    }
    await page.evaluate(() => window.scrollTo(0, 0));

    // scrollHeight はビューポート高が下限になるため、一旦縮めてから実コンテンツ高を測る
    await page.setViewport({ width: VIEWPORT_WIDTH, height: 600 });
    await sleep(150);
    const contentHeight = await page.evaluate(() =>
      Math.ceil(Math.max(document.body?.scrollHeight ?? 0, document.documentElement.scrollHeight)),
    );

    const fullHeight = Math.min(Math.max(contentHeight, 900), MAX_FULL_HEIGHT);
    await page.setViewport({ width: VIEWPORT_WIDTH, height: fullHeight });
    await sleep(200);

    const fullShot = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: VIEWPORT_WIDTH, height: fullHeight },
      captureBeyondViewport: true,
    });
    const full = Buffer.from(fullShot as unknown as ArrayBuffer);

    const plan = computeSegmentPlan(contentHeight);
    const segments: Buffer[] = [];
    for (const { y, h } of plan) {
      const shot = await page.screenshot({
        type: "png",
        clip: { x: 0, y, width: VIEWPORT_WIDTH, height: h },
        captureBeyondViewport: true,
      });
      segments.push(Buffer.from(shot as unknown as ArrayBuffer));
    }

    return { full, segments };
  } finally {
    await browser.close();
  }
}
