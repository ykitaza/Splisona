import { createCloudflareContainer, type CloudflareEnv } from "./infra/cloudflare/container-cloudflare.js";
import { verifyAccessJWT } from "./infra/cloudflare/cf-access-auth.js";
import { createApp, type AppAdapters } from "./create-app.js";
import type { RouteEnv } from "./routes.js";
import type { ImageSource } from "./domain/ports/ai-service.js";
import type { Context } from "hono";

type Bindings = CloudflareEnv & {
  CF_ACCESS_TEAM_DOMAIN: string;
  CF_ACCESS_AUD: string;
};

type Ctx = Context<RouteEnv>;

type ImagesBucket = {
  get(key: string): Promise<{ text(): Promise<string>; arrayBuffer(): Promise<ArrayBuffer>; httpMetadata?: { contentType?: string } } | null>;
};

function envOf(c: Ctx): Bindings {
  return c.env as unknown as Bindings;
}

function imagesBucketOf(c: Ctx): ImagesBucket {
  return envOf(c).IMAGES as unknown as ImagesBucket;
}

const adapters: AppAdapters = {
  getContainer: (c) => createCloudflareContainer(envOf(c)),

  async verifySession(c) {
    const jwt = c.req.header("X-Access-Jwt");
    if (!jwt) return null;
    try {
      return await verifyAccessJWT(jwt, envOf(c).CF_ACCESS_TEAM_DOMAIN, envOf(c).CF_ACCESS_AUD);
    } catch {
      return null;
    }
  },

  async loadShareTemplate(_container, c) {
    const templateObj = await imagesBucketOf(c).get("templates/export-template.html");
    if (!templateObj) return null;
    return templateObj.text();
  },

  async loadImageDataUrl(_container, key, c) {
    if (!key) return null;
    const obj = await imagesBucketOf(c).get(key);
    if (!obj) return null;
    const buf = Buffer.from(await obj.arrayBuffer());
    const contentType = obj.httpMetadata?.contentType ?? "image/png";
    return `data:${contentType};base64,${buf.toString("base64")}`;
  },
};

const app = createApp(adapters);

// --- CF固有: R2画像配信 ---
app.get("/images/*", async (c) => {
  try {
    const key = c.req.path.slice("/images/".length);
    const obj = await imagesBucketOf(c).get(key) as { body: ReadableStream; httpMetadata?: { contentType?: string } } | null;
    if (!obj) return c.text("Not Found", 404);
    const contentType = obj.httpMetadata?.contentType ?? "image/png";
    return new Response(obj.body, { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000" } });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// --- CF固有: R2アップロード ---
app.put("/upload/*", async (c) => {
  try {
    const key = c.req.path.slice("/upload/".length);
    const contentType = c.req.query("contentType") ?? "image/png";
    const body = await c.req.arrayBuffer();
    await c.var.container.storageService.putObject(key, Buffer.from(body), contentType);
    return c.text("", 200);
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// --- CF固有: evaluate でR2から画像読み込み (override) ---
app.post("/tests/:id/execute", async (c) => {
  try {
    const container = c.var.container;
    const userId = c.var.userId;
    const testId = c.req.param("id");

    const buildImageSource = async (key: string): Promise<ImageSource> => {
      const obj = await imagesBucketOf(c).get(key) as { arrayBuffer(): Promise<ArrayBuffer> } | null;
      if (!obj) throw new Error(`Image not found: ${key}`);
      const buf = Buffer.from(await obj.arrayBuffer());
      const ext = key.split(".").pop()?.toLowerCase() ?? "png";
      const format = ext === "jpg" || ext === "jpeg" ? "jpeg" : ext === "webp" ? "webp" : "png";
      return { kind: "bytes", data: buf, format: format as "png" | "jpeg" | "webp" };
    };

    c.executionCtx.waitUntil(
      container.evaluationUseCases.executeTest(userId, testId, {
        buildImageSource,
      }).catch(async (e) => {
        // 未捕捉例外で status が running のまま残ると UI が永遠に「レポート生成中」になる
        console.error("[executeTest] fatal:", e);
        try { await container.evaluationUseCases.abortTest(userId, testId); } catch {}
      })
    );

    return c.json({ started: true });
  } catch (e) {
    return c.json({ error: "INTERNAL_ERROR", message: String(e) }, 500);
  }
});

app.post("/tests/:id/abort", async (c) => {
  try {
    const container = c.var.container;
    const userId = c.var.userId;
    await container.evaluationUseCases.abortTest(userId, c.req.param("id"));
    return c.json({ aborted: true });
  } catch (e) {
    return c.json({ error: "INTERNAL_ERROR", message: String(e) }, 500);
  }
});

export default app;
