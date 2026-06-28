interface BrowserBinding {
  fetch(url: string | Request, init?: RequestInit): Promise<Response>;
}

export async function captureWebsiteWithBrowser(
  browser: BrowserBinding,
  url: string,
): Promise<Buffer> {
  const sessionRes = await browser.fetch("http://chrome.cloudflareaccess.com/v1/newSession", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ width: 1280, height: 900 }),
  });

  if (!sessionRes.ok) {
    throw new Error(`Browser session creation failed: ${sessionRes.status}`);
  }

  const { sessionId } = await sessionRes.json() as { sessionId: string };
  const cdp = (method: string, params?: Record<string, unknown>) =>
    browser.fetch(`http://chrome.cloudflareaccess.com/v1/session/${sessionId}/cdp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, params }),
    }).then((r) => r.json() as Promise<Record<string, unknown>>);

  await cdp("Page.navigate", { url });
  await cdp("Page.waitForLoadEvent", { event: "load", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 2000));

  const screenshot = await cdp("Page.captureScreenshot", { format: "png" });
  const data = (screenshot as { result?: { data?: string } }).result?.data;
  if (!data) throw new Error("Screenshot capture returned no data");

  await browser.fetch(`http://chrome.cloudflareaccess.com/v1/session/${sessionId}`, {
    method: "DELETE",
  });

  return Buffer.from(data, "base64");
}
