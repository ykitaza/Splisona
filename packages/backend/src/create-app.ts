import { Hono, type Context, type MiddlewareHandler } from "hono";
import type { AppContainer } from "./container.js";
import { createRoutes, type RouteEnv } from "./routes.js";
import { buildSharePayload, buildShareHtml } from "./application/share-page.js";

const DEFAULT_PUBLIC_PATHS = ["/config", "/images/", "/upload/", "/share/"];

export interface AppAdapters {
  /** リクエストから userId を解決（セッション系）。失敗時は null */
  verifySession(c: Context<RouteEnv>): Promise<string | null>;
  /** セッション認証失敗時の 401 レスポンス本文（環境ごとに error/message が違う。省略時は { error: "Unauthorized" }） */
  sessionErrorBody?: { error: string; message?: string };
  /** container の取得（worker/lambda はリクエスト毎 or シングルトン、dev はモジュールスコープ） */
  getContainer(c: Context<RouteEnv>): AppContainer;
  /** 共有ページ: テンプレート取得（null なら 503） */
  loadShareTemplate(container: AppContainer, c: Context<RouteEnv>): Promise<string | null>;
  /** 共有ページ: 画像を dataURL 化（無ければ null） */
  loadImageDataUrl(container: AppContainer, key: string | undefined, c: Context<RouteEnv>): Promise<string | null>;
  /** 追加の公開パス prefix（デフォルト: /config, /images/, /upload/, /share/） */
  publicPaths?: string[];
  /** 認証ミドルウェアより前に適用する追加ミドルウェア（例: dev の CORS） */
  preMiddleware?: MiddlewareHandler<RouteEnv>[];
}

export function createApp(adapters: AppAdapters): Hono<RouteEnv> {
  const app = new Hono<RouteEnv>();
  const publicPaths = adapters.publicPaths ?? DEFAULT_PUBLIC_PATHS;

  for (const mw of adapters.preMiddleware ?? []) {
    app.use("*", mw);
  }

  // Auth middleware: 公開パス判定 → APIキー(Bearer sk_) → セッション → どちらも失敗なら401
  app.use("*", async (c, next) => {
    if (publicPaths.some((p) => c.req.path.startsWith(p))) {
      c.set("container", adapters.getContainer(c));
      return next();
    }

    const container = adapters.getContainer(c);
    const authHeader = c.req.header("Authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;

    if (bearer?.startsWith("sk_")) {
      const result = await container.apiKeyUseCases.verify(bearer);
      if (!result) return c.json({ error: "UNAUTHORIZED", message: "invalid api key" }, 401);
      c.set("container", container);
      c.set("userId", result.userId);
      c.set("authVia", "apikey");
      return next();
    }

    const userId = await adapters.verifySession(c);
    if (!userId) {
      return c.json(adapters.sessionErrorBody ?? { error: "Unauthorized" }, 401);
    }
    c.set("container", container);
    c.set("userId", userId);
    c.set("authVia", "session");
    return next();
  });

  app.route("/", createRoutes());

  // 共有レポートページ（公開・認証不要）
  app.get("/share/:token", async (c) => {
    const container = c.var.container;
    const token = c.req.param("token");

    const resolved = await container.shareUseCases.resolve(token);
    if (!resolved) {
      return c.html("<!doctype html><html><body><p>リンクが無効です</p></body></html>", 404);
    }

    const template = await adapters.loadShareTemplate(container, c);
    if (!template) {
      return c.html("<!doctype html><html><body><p>共有ページの準備ができていません</p></body></html>", 503);
    }

    const test = await container.testRepo.findById(resolved.userId, resolved.testId);

    const [imageA, imageB] = await Promise.all([
      adapters.loadImageDataUrl(container, test?.designAImageKey, c),
      adapters.loadImageDataUrl(container, test?.designBImageKey, c),
    ]);

    const payload = await buildSharePayload(container, resolved.userId, resolved.testId, { imageA, imageB });
    const html = buildShareHtml(template, payload);

    return c.body(html, 200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    });
  });

  return app;
}
