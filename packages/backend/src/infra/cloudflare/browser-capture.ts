import puppeteer from "@cloudflare/puppeteer";

export async function captureWebsiteWithBrowser(
  browserBinding: unknown,
  url: string,
): Promise<Buffer> {
  const browser = await puppeteer.launch(browserBinding as never);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
    const screenshot = await page.screenshot({ type: "png", fullPage: false });
    return Buffer.from(screenshot as unknown as ArrayBuffer);
  } finally {
    await browser.close();
  }
}
