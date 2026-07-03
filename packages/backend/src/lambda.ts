import { Hono } from "hono";
import { handle } from "hono/aws-lambda";
import type { LambdaEvent, LambdaContext } from "hono/aws-lambda";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { createContainer, type AppContainer } from "./container.js";
import { createRoutes, type RouteEnv } from "./routes.js";
import { createCognitoVerifier, verifyCognitoToken, type CognitoVerifier } from "./infra/aws/cognito-auth.js";
import { buildSharePayload, buildShareHtml } from "./application/share-page.js";
import type { ImageSource } from "./domain/ports/ai-service.js";

type S3ObjectStorage = {
  getObject(key: string): Promise<{ body: Uint8Array; contentType?: string } | null>;
};

function asS3Storage(storageService: AppContainer["storageService"]): S3ObjectStorage {
  return storageService as unknown as S3ObjectStorage;
}

export interface LambdaAppOptions {
  cognitoVerifier?: CognitoVerifier;
  shareTemplateKey: string;
  lambdaClient?: LambdaClient;
  functionName?: string;
}

const PUBLIC_PATH_PREFIXES = ["/images/", "/upload/", "/share/"];

export function createLambdaApp(container: AppContainer, opts: LambdaAppOptions) {
  const app = new Hono<RouteEnv>();

  // Auth middleware: JWT(Cognito)/APIキー検証 → container + userId をコンテキストにセット
  app.use("*", async (c, next) => {
    if (c.req.path === "/config" || PUBLIC_PATH_PREFIXES.some((p) => c.req.path.startsWith(p))) {
      c.set("container", container);
      return next();
    }

    const authHeader = c.req.header("Authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;
    if (!bearer) return c.json({ error: "Unauthorized" }, 401);

    if (bearer.startsWith("sk_")) {
      const result = await container.apiKeyUseCases.verify(bearer);
      if (!result) return c.json({ error: "UNAUTHORIZED", message: "invalid api key" }, 401);
      c.set("container", container);
      c.set("userId", result.userId);
      c.set("authVia", "apikey");
      return next();
    }

    if (!opts.cognitoVerifier) return c.json({ error: "Unauthorized" }, 401);
    try {
      const userId = await verifyCognitoToken(opts.cognitoVerifier, bearer);
      c.set("container", container);
      c.set("userId", userId);
      c.set("authVia", "session");
      return next();
    } catch (e) {
      return c.json({ error: "Unauthorized", message: String(e) }, 401);
    }
  });

  // 共有ルーター（dev-server / Cloudflare 版と同じルート定義）
  app.route("/", createRoutes());

  // --- AWS固有: 共有レポートページ（公開・認証不要） ---
  app.get("/share/:token", async (c) => {
    const token = c.req.param("token");

    const resolved = await container.shareUseCases.resolve(token);
    if (!resolved) {
      return c.html("<!doctype html><html><body><p>リンクが無効です</p></body></html>", 404);
    }

    const storage = asS3Storage(container.storageService);
    const templateObj = await storage.getObject(opts.shareTemplateKey);
    if (!templateObj) {
      return c.html("<!doctype html><html><body><p>共有ページの準備ができていません</p></body></html>", 503);
    }
    const template = Buffer.from(templateObj.body).toString("utf-8");

    const test = await container.testRepo.findById(resolved.userId, resolved.testId);

    const loadImage = async (key: string | undefined): Promise<string | null> => {
      if (!key) return null;
      const obj = await storage.getObject(key);
      if (!obj) return null;
      const contentType = obj.contentType ?? "image/png";
      return `data:${contentType};base64,${Buffer.from(obj.body).toString("base64")}`;
    };

    const [imageA, imageB] = await Promise.all([
      loadImage(test?.designAImageKey),
      loadImage(test?.designBImageKey),
    ]);

    const payload = await buildSharePayload(container, resolved.userId, resolved.testId, { imageA, imageB });
    const html = buildShareHtml(template, payload);

    return c.body(html, 200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    });
  });

  // --- AWS固有: S3画像配信 ---
  app.get("/images/*", async (c) => {
    try {
      const key = c.req.path.slice("/images/".length);
      const obj = await asS3Storage(container.storageService).getObject(key);
      if (!obj) return c.text("Not Found", 404);
      const contentType = obj.contentType ?? "image/png";
      return c.body(Buffer.from(obj.body), 200, {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000",
      });
    } catch (e) {
      return c.json({ error: String(e) }, 500);
    }
  });

  // --- AWS固有: S3アップロード（CLI互換） ---
  app.put("/upload/*", async (c) => {
    try {
      const key = c.req.path.slice("/upload/".length);
      const contentType = c.req.query("contentType") ?? "image/png";
      const body = await c.req.arrayBuffer();
      await container.storageService.putObject(key, Buffer.from(body), contentType);
      return c.text("", 200);
    } catch (e) {
      return c.json({ error: String(e) }, 500);
    }
  });

  // --- AWS固有: evaluate 実行 (override) ---
  app.post("/tests/:id/execute", async (c) => {
    try {
      const userId = c.var.userId;
      const testId = c.req.param("id");

      const buildImageSource = (key: string): ImageSource => ({
        kind: "s3",
        bucket: container.imageBucket,
        key,
      });

      if (opts.functionName && opts.lambdaClient) {
        await opts.lambdaClient.send(
          new InvokeCommand({
            FunctionName: opts.functionName,
            InvocationType: "Event",
            Payload: Buffer.from(JSON.stringify({ splisonaTask: { type: "executeTest", userId, testId } })),
          })
        );
        return c.json({ started: true });
      }

      // ローカル/自己invoke不可の場合は同期実行にフォールバック
      await container.evaluationUseCases.executeTest(userId, testId, { buildImageSource }).catch(async (e) => {
        console.error("[executeTest] fatal:", e);
        try { await container.evaluationUseCases.abortTest(userId, testId); } catch {}
      });

      return c.json({ started: true });
    } catch (e) {
      return c.json({ error: "INTERNAL_ERROR", message: String(e) }, 500);
    }
  });

  app.post("/tests/:id/abort", async (c) => {
    try {
      const userId = c.var.userId;
      await container.evaluationUseCases.abortTest(userId, c.req.param("id"));
      return c.json({ aborted: true });
    } catch (e) {
      return c.json({ error: "INTERNAL_ERROR", message: String(e) }, 500);
    }
  });

  return app;
}

const region = process.env.AWS_REGION ?? "us-east-1";
const shareTemplateKey = process.env.SHARE_TEMPLATE_KEY ?? "templates/export-template.html";
const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME;

// コールドスタートで1回だけ生成
const container = createContainer({
  tableName: process.env.TABLE_NAME,
  imageBucket: process.env.IMAGE_BUCKET,
  modelId: process.env.BEDROCK_MODEL_ID,
  region: process.env.AWS_REGION,
});

const cognitoVerifier =
  process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID
    ? createCognitoVerifier(process.env.COGNITO_USER_POOL_ID, process.env.COGNITO_CLIENT_ID)
    : undefined;

const lambdaClient = functionName ? new LambdaClient({ region }) : undefined;

export const app = createLambdaApp(container, {
  cognitoVerifier,
  shareTemplateKey,
  lambdaClient,
  functionName,
});

const honoHandler = handle(app);

interface SplisonaTaskEvent {
  splisonaTask: { type: "executeTest"; userId: string; testId: string };
}

export const handler = async (event: LambdaEvent | SplisonaTaskEvent, context: LambdaContext) => {
  if ("splisonaTask" in event && event.splisonaTask?.type === "executeTest") {
    const { userId, testId } = event.splisonaTask;
    try {
      await container.evaluationUseCases.executeTest(userId, testId, {
        buildImageSource: (key: string): ImageSource => ({ kind: "s3", bucket: container.imageBucket, key }),
      });
    } catch (e) {
      console.error("[executeTest] fatal:", e);
      try { await container.evaluationUseCases.abortTest(userId, testId); } catch {}
    }
    return { ok: true };
  }

  return honoHandler(event as LambdaEvent, context);
};
