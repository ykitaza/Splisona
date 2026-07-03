import * as path from "node:path";
import type { Command } from "commander";

const MAX_SCROLL_HEIGHT = 4000;
const MAX_VIEWPORT_HEIGHT = 7800;
const SCROLL_STEP = 800;
const SCROLL_WAIT_MS = 150;
const MAX_SCROLL_STEPS = 20;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadPlaywright(): Promise<any> {
  try {
    return await import(/* webpackIgnore: true */ "playwright" as string);
  } catch {
    console.error(
      "playwright が見つかりません。以下を実行してください:\n" +
        "  pnpm add -D playwright && npx playwright install chromium",
    );
    process.exit(1);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function registerCaptureCommand(program: Command): void {
  program
    .command("capture")
    .description("URLをスクリーンショットとして保存する")
    .argument("<url>", "撮影対象のURL")
    .requiredOption("-o, --output <path>", "保存先のPNGファイルパス")
    .option("--width <px>", "ビューポート幅", (v) => parseInt(v, 10), 1280)
    .option("--keep-overlays", "Cookieバナー等のオーバーレイ除去をスキップする")
    .option("--json", "JSON形式で出力する")
    .action(
      async (
        url: string,
        opts: {
          output: string;
          width: number;
          keepOverlays?: boolean;
          json?: boolean;
        },
      ) => {
        const { chromium } = await loadPlaywright();

        const browser = await chromium.launch();
        try {
          const page = await browser.newPage({
            viewport: { width: opts.width, height: MAX_SCROLL_HEIGHT },
          });
          await page.emulateMedia({ reducedMotion: "reduce" });

          await page.goto(url, { waitUntil: "load", timeout: 30000 });

          // 遅延読み込み対策: ページ末尾までスクロールしてコンテンツを読み込ませる
          for (let i = 0; i < MAX_SCROLL_STEPS; i++) {
            const reachedBottom = await page.evaluate(
              (step: number) => {
                const before = window.scrollY;
                window.scrollBy(0, step);
                return window.scrollY === before;
              },
              SCROLL_STEP,
            );
            await sleep(SCROLL_WAIT_MS);
            if (reachedBottom) break;
          }
          await page.evaluate(() => window.scrollTo(0, 0));

          try {
            await page.waitForLoadState("networkidle", { timeout: 5000 });
          } catch {
            // networkidleにならなくても続行
          }
          await sleep(500);

          if (!opts.keepOverlays) {
            await page.evaluate(() => {
              document
                .querySelectorAll(
                  '#onetrust-consent-sdk, [id*="cookie" i], [class*="cookie-banner" i], [class*="consent" i], [id*="gdpr" i]',
                )
                .forEach((el) => {
                  (el as HTMLElement).style.display = "none";
                });

              const viewportArea = window.innerWidth * window.innerHeight;
              document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
                const style = window.getComputedStyle(el);
                if (style.position !== "fixed" && style.position !== "sticky") {
                  return;
                }
                const zIndex = parseInt(style.zIndex || "0", 10);
                if (isNaN(zIndex) || zIndex < 1000) {
                  return;
                }
                const rect = el.getBoundingClientRect();
                const area = rect.width * rect.height;
                if (area >= viewportArea * 0.3) {
                  el.style.display = "none";
                }
              });

              document.documentElement.style.overflow = "visible";
              document.body.style.overflow = "visible";
            });
          }

          // scrollHeight はビューポート高が下限になるため、一旦縮めてから実コンテンツ高を測る
          await page.setViewportSize({ width: opts.width, height: 600 });
          await page.waitForTimeout(150);
          const contentHeight = await page.evaluate(() =>
            Math.ceil(Math.max(document.body?.scrollHeight ?? 0, document.documentElement.scrollHeight)),
          );
          const height = Math.min(Math.max(contentHeight, 600), MAX_VIEWPORT_HEIGHT);
          await page.setViewportSize({ width: opts.width, height });
          await page.waitForTimeout(200);

          const outputPath = path.resolve(opts.output);
          await page.screenshot({
            path: outputPath,
            fullPage: false,
            type: "png",
          });

          const size = page.viewportSize();
          if (opts.json) {
            console.log(
              JSON.stringify({ path: outputPath, width: size?.width, height: size?.height }, null, 2),
            );
          } else {
            console.log(`保存しました: ${outputPath} (${size?.width}x${size?.height})`);
          }
        } finally {
          await browser.close();
        }
      },
    );
}
