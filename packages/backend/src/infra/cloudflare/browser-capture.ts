import puppeteer from "@cloudflare/puppeteer";

// 縦長ページの分割撮影仕様
const SEGMENT_THRESHOLD = 2600;
const SEGMENT_HEIGHT = 2000;
const SEGMENT_OVERLAP = 150;
const MAX_SEGMENTS = 6;
const MAX_FULL_HEIGHT = 16000;
const VIEWPORT_WIDTH = 1280;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 高さ (実コンテンツ高) からセグメント撮影位置を算出する */
function computeSegmentPlan(height: number): { y: number; h: number }[] {
  if (height <= SEGMENT_THRESHOLD) return [];

  let segH = SEGMENT_HEIGHT;
  const stride0 = segH - SEGMENT_OVERLAP;
  let count = Math.max(1, Math.ceil((height - segH) / stride0) + 1);

  if (count > MAX_SEGMENTS) {
    count = MAX_SEGMENTS;
    segH = Math.ceil((height + SEGMENT_OVERLAP * (count - 1)) / count);
  }

  const stride = segH - SEGMENT_OVERLAP;
  const positions: { y: number; h: number }[] = [];
  for (let i = 0; i < count; i++) {
    const y = i * stride;
    if (y >= height) break;
    const h = Math.min(segH, height - y);
    positions.push({ y, h });
    if (y + h >= height) break;
  }
  return positions;
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
