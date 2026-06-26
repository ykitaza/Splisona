import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { listPersonas, createPersona, getPersona, updatePersona, deletePersona } from "./persona/handler.js";
import { createTest, listTests, getTest, updateTest, deleteTest, getProgress } from "./abtest/handler.js";
import { getReport, exportReport } from "./report/handler.js";
import { getItem, putItem, queryByPK, abtestKey, evaluationKey } from "./shared/dynamo.js";
import type { ABTestRecord, PersonaRecord, EvaluationRecord } from "./shared/types.js";

const LOCAL_UPLOAD_DIR = "/tmp/chorus-uploads";
mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });

function imageKeyToPath(key: string): string {
  return join(LOCAL_UPLOAD_DIR, key.replace(/\//g, "_"));
}

const port = Number(process.env.PORT ?? 3001);

const app = new Hono();

app.use("*", cors({ origin: "*" }));

// API Gateway Lambda Proxy イベントへの変換アダプター
function toEvent(req: { header: (k: string) => string | undefined }, pathParams: Record<string, string> = {}, body?: string) {
  return {
    headers: Object.fromEntries(
      ["x-local-user-id", "content-type", "authorization"].map((k) => [k, req.header(k) ?? ""])
    ),
    pathParameters: pathParams,
    body: body ?? null,
    requestContext: {},
  };
}

// CORS preflight を明示的に処理（auth ミドルウェアより前に返す）
app.options("*", (c) => {
  c.res.headers.set("Access-Control-Allow-Origin", "*");
  c.res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  c.res.headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization,x-local-user-id");
  return c.text("", 204);
});

// ローカル用モック認証ミドルウェア（x-local-user-id を信頼）
app.use("*", async (c, next) => {
  if (c.req.path.startsWith("/stub-upload/")) return next(); // Presigned URL 相当：認証不要
  const userId = c.req.header("x-local-user-id");
  if (!userId) {
    return c.json({ error: "UNAUTHORIZED", message: "x-local-user-id header required in local mode" }, 401);
  }
  await next();
});

// Persona routes（DynamoDB CRUD: 実ハンドラーを使用）
app.get("/personas", async (c) => {
  const res = await listPersonas(toEvent(c.req));
  return c.body(res.body, res.statusCode as 200, res.headers as Record<string, string>);
});

app.post("/personas", async (c) => {
  const body = await c.req.text();
  const res = await createPersona({ ...toEvent(c.req, {}, body), body });
  return c.body(res.body, res.statusCode as 200, res.headers as Record<string, string>);
});

app.get("/personas/:id", async (c) => {
  const res = await getPersona(toEvent(c.req, { id: c.req.param("id") }));
  return c.body(res.body, res.statusCode as 200, res.headers as Record<string, string>);
});

app.put("/personas/:id", async (c) => {
  const body = await c.req.text();
  const res = await updatePersona({ ...toEvent(c.req, { id: c.req.param("id") }, body), body });
  return c.body(res.body, res.statusCode as 200, res.headers as Record<string, string>);
});

app.delete("/personas/:id", async (c) => {
  const res = await deletePersona(toEvent(c.req, { id: c.req.param("id") }));
  return c.body(res.body, res.statusCode as 200, res.headers as Record<string, string>);
});

// AIアシスト下書き: Bedrockなしスタブ
app.post("/personas/:id/draft", async (c) => {
  const userId = c.req.header("x-local-user-id")!;
  const personaId = c.req.param("id");
  const persona = await getItem<PersonaRecord>({ PK: `USER#${userId}`, SK: `PERSONA#${personaId}` });
  const name = persona?.displayName ?? "このペルソナ";
  return c.json({
    freeText: `[ローカルスタブ] ${name}は${persona?.occupation ?? "職業不明"}の${persona?.age ?? "年齢不明"}歳。日常的にデジタルサービスを利用しており、使いやすさと視覚的な明確さを重視する傾向があります。`,
    suggestedDescription: `[ローカルスタブ] ${name}の行動特性と価値観に関する説明文がここに生成されます。`,
  });
});

// インタビューチャット: Bedrockなしスタブ（テキストストリーム）
app.post("/personas/:id/interview", async (c) => {
  const userId = c.req.header("x-local-user-id")!;
  const personaId = c.req.param("id");
  const persona = await getItem<PersonaRecord>({ PK: `USER#${userId}`, SK: `PERSONA#${personaId}` });
  const name = persona?.displayName ?? "ペルソナ";
  return c.text(`[ローカルスタブ] こんにちは。私は${name}です。ローカル開発モードのため、実際のAI応答は生成されません。本番環境ではBedrockを使用してペルソナとしての回答が生成されます。`);
});

// ABTest routes（DynamoDB CRUD: 実ハンドラーを使用）
app.post("/tests", async (c) => {
  const body = await c.req.text();
  const res = await createTest({ ...toEvent(c.req, {}, body), body });
  return c.body(res.body, res.statusCode as 200, res.headers as Record<string, string>);
});

app.get("/tests", async (c) => {
  const res = await listTests(toEvent(c.req));
  return c.body(res.body, res.statusCode as 200, res.headers as Record<string, string>);
});

app.get("/tests/:id", async (c) => {
  const res = await getTest(toEvent(c.req, { id: c.req.param("id") }));
  return c.body(res.body, res.statusCode as 200, res.headers as Record<string, string>);
});

app.put("/tests/:id", async (c) => {
  const body = await c.req.text();
  const res = await updateTest({ ...toEvent(c.req, { id: c.req.param("id") }, body), body });
  return c.body(res.body, res.statusCode as 200, res.headers as Record<string, string>);
});

app.delete("/tests/:id", async (c) => {
  const res = await deleteTest(toEvent(c.req, { id: c.req.param("id") }));
  return c.body(res.body, res.statusCode as 200, res.headers as Record<string, string>);
});

// Figma トークン検証
app.post("/figma/verify", async (c) => {
  const { token } = await c.req.json<{ token: string }>();
  if (!token) return c.json({ valid: false, error: "token required" }, 400);
  try {
    const res = await fetch("https://api.figma.com/v1/me", {
      headers: { "X-Figma-Token": token },
    });
    if (!res.ok) return c.json({ valid: false, error: `Figma API returned ${res.status}` });
    const data = await res.json() as { id?: string; email?: string; handle?: string };
    return c.json({ valid: true, email: data.email, handle: data.handle });
  } catch (e) {
    return c.json({ valid: false, error: String(e) });
  }
});

// URL キャプチャ: Figma/サイトURLから画像を取得してローカル保存
app.post("/tests/:id/capture", async (c) => {
  const testId = c.req.param("id");
  const { side, inputType, url, figmaToken: reqToken } = await c.req.json<{ side: string; inputType: string; url: string; figmaToken?: string }>();
  const figmaToken = reqToken || process.env.FIGMA_TOKEN;
  const imageKey = `local/${testId}-${side}-capture-${Date.now()}.png`;
  const filePath = imageKeyToPath(imageKey);

  if (inputType === "figma_url" && figmaToken) {
    try {
      const match = url.match(/figma\.com\/(?:design|file)\/([^/?]+)/) ;
      const nodeId = new URL(url).searchParams.get("node-id") ?? "";
      const fileKey = match?.[1];
      if (fileKey) {
        const apiUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=png`;
        const apiRes = await fetch(apiUrl, { headers: { "X-Figma-Token": figmaToken } });
        const data = await apiRes.json() as { images?: Record<string, string> };
        const imgUrl = data.images?.[nodeId];
        if (imgUrl) {
          const imgRes = await fetch(imgUrl);
          const buf = Buffer.from(await imgRes.arrayBuffer());
          writeFileSync(filePath, buf);
          return c.json({ imageKey, previewUrl: `http://localhost:${port}/stub-upload/${imageKey}` });
        }
      }
    } catch {
      /* fall through to stub */
    }
  }

  const stubPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );
  writeFileSync(filePath, stubPng);
  return c.json({ imageKey, previewUrl: `http://localhost:${port}/stub-upload/${imageKey}` });
});

// 画像アップロードURL: ローカルディスク保存スタブ
app.post("/tests/:id/upload-url", async (c) => {
  const testId = c.req.param("id");
  const { side, contentType = "image/png" } = await c.req.json<{ side: string; contentType?: string }>();
  const ext = contentType === "image/jpeg" ? "jpg" : contentType === "image/webp" ? "webp" : "png";
  const imageKey = `local/${testId}-${side}-${Date.now()}.${ext}`;
  return c.json({
    uploadUrl: `http://localhost:${port}/stub-upload/${imageKey}`,
    imageKey,
  });
});

// スタブ画像受け取りエンドポイント（ローカルディスクに保存）
app.put("/stub-upload/*", async (c) => {
  const key = c.req.path.slice("/stub-upload/".length);
  const arrayBuffer = await c.req.arrayBuffer();
  writeFileSync(imageKeyToPath(key), Buffer.from(arrayBuffer));
  return c.text("", 200);
});

// 保存した画像を配信
app.get("/stub-upload/*", (c) => {
  const key = c.req.path.slice("/stub-upload/".length);
  const filePath = imageKeyToPath(key);
  if (!existsSync(filePath)) return c.text("Not Found", 404);
  const data = readFileSync(filePath);
  const ext = extname(key).slice(1).toLowerCase();
  const contentType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";
  return c.body(data, 200, { "Content-Type": contentType });
});

app.get("/tests/:id/progress", async (c) => {
  const res = await getProgress(toEvent(c.req, { id: c.req.param("id") }));
  return c.body(res.body, res.statusCode as 200, res.headers as Record<string, string>);
});

// 評価実行: Bedrockなしスタブ（DynamoDBに即時フェイク評価結果を保存）
app.post("/tests/:id/execute", async (c) => {
  const userId = c.req.header("x-local-user-id")!;
  const testId = c.req.param("id");

  const test = await getItem<ABTestRecord>(abtestKey(userId, testId));
  if (!test) return c.json({ error: "NOT_FOUND" }, 404);
  if (test.status === "running") return c.json({ error: "CONFLICT" }, 409);

  const now = new Date().toISOString();
  await putItem({ ...test, status: "running", updatedAt: now } as unknown as Record<string, unknown>);

  const personaIds: string[] = test.personaIds ?? [];
  for (const personaId of personaIds) {
    const persona = await getItem<PersonaRecord>({ PK: `USER#${userId}`, SK: `PERSONA#${personaId}` });
    const winner = Math.random() > 0.5 ? "A" : "B";
    const evalRecord: EvaluationRecord = {
      ...evaluationKey(testId, personaId),
      winner: winner as "A" | "B",
      confidence: Math.floor(Math.random() * 35) + 60,
      reason: `[ローカルスタブ] ${persona?.displayName ?? personaId}視点での評価。デザイン${winner}の方が視認性・操作性に優れていると判断しました。`,
      scores: {
        usability: Math.floor(Math.random() * 3) + 7,
        aesthetics: Math.floor(Math.random() * 3) + 6,
        clarity: Math.floor(Math.random() * 3) + 7,
        engagement: Math.floor(Math.random() * 3) + 6,
      },
      status: "completed",
      personaDisplayName: persona?.displayName ?? personaId,
      evaluatedAt: now,
    };
    await putItem(evalRecord as unknown as Record<string, unknown>);
  }

  await putItem({ ...test, status: "completed", updatedAt: now } as unknown as Record<string, unknown>);

  return c.json({ started: true });
});

// Report routes（DynamoDB集計: 実ハンドラーを使用）
app.get("/tests/:id/report", async (c) => {
  const res = await getReport(toEvent(c.req, { id: c.req.param("id") }));
  return c.body(res.body, res.statusCode as 200, res.headers as Record<string, string>);
});

app.get("/tests/:id/export", async (c) => {
  const res = await exportReport(toEvent(c.req, { id: c.req.param("id") }));
  return c.body(res.body, res.statusCode as 200, res.headers as Record<string, string>);
});

console.log(`Chorus local dev server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
