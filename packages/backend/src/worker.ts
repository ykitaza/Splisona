import { Hono } from "hono";
import { createCloudflareContainer, type CloudflareEnv } from "./infra/cloudflare/container-cloudflare.js";
import { verifyAccessJWT } from "./infra/cloudflare/cf-access-auth.js";
import { createRoutes, type RouteEnv } from "./routes.js";
import type { ImageSource } from "./domain/ports/ai-service.js";

type Bindings = CloudflareEnv & {
  CF_ACCESS_TEAM_DOMAIN: string;
  CF_ACCESS_AUD: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Auth middleware: JWT検証 → container + userId をコンテキストにセット
app.use("*", async (c, next) => {
  // 認証不要のルート（containerは必要）
  if (c.req.path === "/config" || c.req.path.startsWith("/images/") || c.req.path.startsWith("/upload/")) {
    const container = createCloudflareContainer(c.env);
    c.set("container" as never, container as never);
    return next();
  }

  const jwt = c.req.header("X-Access-Jwt");
  if (!jwt) return c.json({ error: "Unauthorized" }, 401);

  try {
    const email = await verifyAccessJWT(jwt, c.env.CF_ACCESS_TEAM_DOMAIN, c.env.CF_ACCESS_AUD);
    const container = createCloudflareContainer(c.env);
    c.set("container" as never, container as never);
    c.set("userId" as never, email as never);
    return next();
  } catch (e) {
    return c.json({ error: "Unauthorized", message: String(e) }, 401);
  }
});

// 共有ルーター（dev-server と同じルート定義）
app.route("/", createRoutes());

// --- CF固有: R2画像配信 ---
app.get("/images/*", async (c) => {
  try {
    const key = c.req.path.slice("/images/".length);
    const obj = await (c.env.IMAGES as unknown as { get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null> }).get(key);
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
    const container = createCloudflareContainer(c.env);
    const key = c.req.path.slice("/upload/".length);
    const contentType = c.req.query("contentType") ?? "image/png";
    const body = await c.req.arrayBuffer();
    await container.storageService.putObject(key, Buffer.from(body), contentType);
    return c.text("", 200);
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// --- CF固有: evaluate でR2から画像読み込み (override) ---
app.post("/tests/:id/execute", async (c) => {
  try {
    const container = (c as unknown as { var: { container: ReturnType<typeof createCloudflareContainer>; userId: string } }).var.container;
    const userId = (c as unknown as { var: { userId: string } }).var.userId;
    const testId = c.req.param("id");

    const buildImageSource = async (key: string): Promise<ImageSource> => {
      const obj = await (c.env.IMAGES as unknown as { get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null> }).get(key);
      if (!obj) throw new Error(`Image not found: ${key}`);
      const buf = Buffer.from(await obj.arrayBuffer());
      const ext = key.split(".").pop()?.toLowerCase() ?? "png";
      const format = ext === "jpg" || ext === "jpeg" ? "jpeg" : ext === "webp" ? "webp" : "png";
      return { kind: "bytes", data: buf, format: format as "png" | "jpeg" | "webp" };
    };

    c.executionCtx.waitUntil(
      container.evaluationUseCases.executeTest(userId, testId, {
        buildImageSource,
      })
    );

    return c.json({ started: true });
  } catch (e) {
    return c.json({ error: "INTERNAL_ERROR", message: String(e) }, 500);
  }
});

app.post("/tests/:id/abort", async (c) => {
  try {
    const container = (c as unknown as { var: { container: ReturnType<typeof createCloudflareContainer>; userId: string } }).var.container;
    const userId = (c as unknown as { var: { userId: string } }).var.userId;
    await container.evaluationUseCases.abortTest(userId, c.req.param("id"));
    return c.json({ aborted: true });
  } catch (e) {
    return c.json({ error: "INTERNAL_ERROR", message: String(e) }, 500);
  }
});

export default app;
