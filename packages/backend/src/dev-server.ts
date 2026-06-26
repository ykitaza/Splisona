import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { listPersonas, createPersona, getPersona, updatePersona, deletePersona, generateDraft, getPersonaUploadUrl } from "./persona/handler.js";
import { interviewPersona } from "./interview/handler.js";
import { createTest, listTests, getTest, updateTest, deleteTest, getProgress } from "./abtest/handler.js";
import { getReport, exportReport, generateReasonSummaryFields } from "./report/handler.js";
import { getSettings, putSettings } from "./settings/handler.js";
import { getItem, putItem, deleteItem, queryByPK, abtestKey, evaluationKey } from "./shared/dynamo.js";
import { bedrockClient, MODEL_ID } from "./shared/bedrock.js";
import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { chunkArray } from "./evaluation/orchestrator.js";
import { getAdditionalInstruction } from "./settings/prompts.js";
import type { ABTestRecord, PersonaRecord, EvaluationRecord } from "./shared/types.js";

const LOCAL_UPLOAD_DIR = "/tmp/chorus-uploads";
mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });

const USE_LOCAL_BEDROCK = process.env.LOCAL_BEDROCK === "true";

const runningAbortControllers = new Map<string, AbortController>();

function getImageFormat(key: string): "png" | "jpeg" | "gif" | "webp" {
  const ext = extname(key).slice(1).toLowerCase();
  if (ext === "jpg") return "jpeg";
  if (ext === "jpeg" || ext === "gif" || ext === "webp") return ext;
  return "png";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const localEvaluateTool: any = {
  toolSpec: {
    name: "evaluate_designs",
    description: "デザインA/Bのどちらがペルソナ視点で優れているかを評価し、各案を軸ごとに採点する",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          winner: { type: "string", enum: ["A", "B", "none"] },
          confidence: { type: "number", minimum: 0, maximum: 100 },
          reason: { type: "string" },
          scoresA: {
            type: "object",
            description: "デザインA案の各軸スコア（0〜100）",
            properties: {
              usability: { type: "number", minimum: 0, maximum: 100 },
              aesthetics: { type: "number", minimum: 0, maximum: 100 },
              clarity: { type: "number", minimum: 0, maximum: 100 },
              engagement: { type: "number", minimum: 0, maximum: 100 },
              trust: { type: "number", minimum: 0, maximum: 100 },
            },
            required: ["usability", "aesthetics", "clarity", "engagement", "trust"],
          },
          scoresB: {
            type: "object",
            description: "デザインB案の各軸スコア（0〜100）",
            properties: {
              usability: { type: "number", minimum: 0, maximum: 100 },
              aesthetics: { type: "number", minimum: 0, maximum: 100 },
              clarity: { type: "number", minimum: 0, maximum: 100 },
              engagement: { type: "number", minimum: 0, maximum: 100 },
              trust: { type: "number", minimum: 0, maximum: 100 },
            },
            required: ["usability", "aesthetics", "clarity", "engagement", "trust"],
          },
        },
        required: ["winner", "reason", "scoresA", "scoresB"],
      },
    },
  },
};

async function evaluateLocalBedrock(
  testId: string,
  personaId: string,
  userId: string,
  imageKeyA: string,
  imageKeyB: string
): Promise<void> {
  const persona = await getItem<PersonaRecord>({ PK: `USER#${userId}`, SK: `PERSONA#${personaId}` });
  const personaDisplayName = persona?.displayName ?? personaId;

  const imageABuf = readFileSync(imageKeyToPath(imageKeyA));
  const imageBBuf = readFileSync(imageKeyToPath(imageKeyB));

  const additional = await getAdditionalInstruction(userId, "evaluation");
  const prompt = [
    `あなたは「${personaDisplayName}」というペルソナです。`,
    `タイプ: ${persona?.type ?? "consumer"}`,
    persona?.occupation ? `職業: ${persona.occupation}` : null,
    persona?.freeText ? `詳細: ${persona.freeText}` : null,
    "",
    "最初の画像がデザインA、次の画像がデザインBです。",
    "あなたのペルソナ視点から evaluate_designs ツールを使って評価してください。",
    "scoresA と scoresB に、A案・B案それぞれの各軸スコア（0〜100）を採点してください。reason は必ず日本語で記述してください。",
    additional ? `\n追加指示:\n${additional}` : null,
  ].filter((l) => l !== null).join("\n");

  const command = new ConverseCommand({
    modelId: MODEL_ID,
    inferenceConfig: { temperature: 0.2 },
    messages: [{
      role: "user",
      content: [
        { text: prompt },
        { image: { format: getImageFormat(imageKeyA), source: { bytes: imageABuf } } },
        { image: { format: getImageFormat(imageKeyB), source: { bytes: imageBBuf } } },
      ],
    }],
    toolConfig: {
      tools: [localEvaluateTool],
      toolChoice: { tool: { name: "evaluate_designs" } },
    },
  });

  try {
    const response = await bedrockClient.send(command) as {
      stopReason: string;
      output?: { message?: { content?: Array<{ toolUse?: { name: string; input: unknown } }> } };
    };
    const toolUseBlock = response.output?.message?.content?.find(
      (c) => c.toolUse?.name === "evaluate_designs"
    );
    if (!toolUseBlock?.toolUse) throw new Error("evaluate_designs not found in response");

    const input = toolUseBlock.toolUse.input as {
      winner: "A" | "B";
      confidence?: number;
      reason: string;
      scoresA: { usability: number; aesthetics: number; clarity: number; engagement: number; trust: number };
      scoresB: { usability: number; aesthetics: number; clarity: number; engagement: number; trust: number };
    };
    await putItem({
      ...evaluationKey(testId, personaId),
      winner: input.winner,
      confidence: input.confidence ?? 0,
      reason: input.reason,
      scoresA: input.scoresA,
      scoresB: input.scoresB,
      status: "completed",
      personaDisplayName,
      evaluatedAt: new Date().toISOString(),
    } as unknown as Record<string, unknown>);
  } catch (err) {
    console.error(`[evaluate] ${personaId} failed:`, err);
    await putItem({
      ...evaluationKey(testId, personaId),
      winner: "none",
      confidence: 0,
      reason: "",
      scoresA: { usability: 0, aesthetics: 0, clarity: 0, engagement: 0, trust: 0 },
      scoresB: { usability: 0, aesthetics: 0, clarity: 0, engagement: 0, trust: 0 },
      status: "failed",
      personaDisplayName,
      evaluatedAt: new Date().toISOString(),
    } as unknown as Record<string, unknown>);
  }
}

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
  return c.body(null, 204);
});

app.get("/config", (c) => {
  return c.json({ modelId: MODEL_ID });
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

// AIアシスト下書き: LOCAL_BEDROCK=true のとき実Bedrockを呼ぶ
app.post("/personas/:id/draft", async (c) => {
  if (USE_LOCAL_BEDROCK) {
    const res = await generateDraft(toEvent(c.req, { id: c.req.param("id") }));
    return c.body(res.body, res.statusCode as 200, res.headers as Record<string, string>);
  }
  const userId = c.req.header("x-local-user-id")!;
  const personaId = c.req.param("id");
  const persona = await getItem<PersonaRecord>({ PK: `USER#${userId}`, SK: `PERSONA#${personaId}` });
  const name = persona?.displayName ?? "このペルソナ";
  return c.json({
    freeText: `[ローカルスタブ] ${name}は${persona?.occupation ?? "職業不明"}の${persona?.age ?? "年齢不明"}歳。日常的にデジタルサービスを利用しており、使いやすさと視覚的な明確さを重視する傾向があります。`,
    suggestedDescription: `[ローカルスタブ] ${name}の行動特性と価値観に関する説明文がここに生成されます。`,
  });
});

// ペルソナアバター画像アップロードURL（ローカルはスタブ）
app.post("/personas/:id/upload-url", async (c) => {
  const personaId = c.req.param("id");
  const { contentType = "image/png" } = await c.req.json<{ contentType?: string }>();
  const ext = contentType === "image/jpeg" ? "jpg" : contentType === "image/webp" ? "webp" : "png";
  const imageKey = `local/personas/${personaId}-${Date.now()}.${ext}`;
  return c.json({
    uploadUrl: `http://localhost:${port}/stub-upload/${imageKey}`,
    imageKey,
  });
});

// インタビューチャット: LOCAL_BEDROCK=true のとき実Bedrockを呼ぶ
app.post("/personas/:id/interview", async (c) => {
  if (USE_LOCAL_BEDROCK) {
    const body = await c.req.text();
    const res = await interviewPersona({ ...toEvent(c.req, { id: c.req.param("id") }, body), body });
    return c.body(res.body, res.statusCode as 200, res.headers as Record<string, string>);
  }
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

// URL キャプチャ: S3 の代わりにローカルディスクに保存（dev のみ）
// 本番 Lambda では capture/handler.ts を直接マウントする
app.post("/tests/:id/capture", async (c) => {
  const { side, inputType, url, figmaToken: reqToken } = await c.req.json<{
    side: string; inputType: string; url: string; figmaToken?: string;
  }>();

  const imageKey = `local/${c.req.param("id")}-${side}-capture-${Date.now()}.png`;
  const filePath = imageKeyToPath(imageKey);

  try {
    if (inputType === "figma_url") {
      const { captureFigmaNode } = await import("./capture/figma.js");
      const token = reqToken ?? process.env.FIGMA_TOKEN ?? "";
      const buf = await captureFigmaNode(url, token);
      writeFileSync(filePath, buf);
    } else if (inputType === "site_url") {
      const { captureWebsite } = await import("./capture/screenshot.js");
      const buf = await captureWebsite(url);
      writeFileSync(filePath, buf);
    } else {
      return c.json({ error: `unsupported inputType: ${inputType}` }, 400);
    }
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 422);
  }

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

// 評価実行: LOCAL_BEDROCK=true のとき実Bedrock（画像base64渡し）、それ以外はスタブ
app.post("/tests/:id/execute", async (c) => {
  const userId = c.req.header("x-local-user-id")!;
  const testId = c.req.param("id");

  const test = await getItem<ABTestRecord>(abtestKey(userId, testId));
  if (!test) return c.json({ error: "NOT_FOUND" }, 404);
  if (test.status === "running") return c.json({ error: "CONFLICT" }, 409);

  // 再実行時に古い評価レコードを削除してクリーンな状態でスタート
  const oldEvals = await queryByPK(`ABTEST#${testId}`, "EVAL#");
  await Promise.all(
    oldEvals.map((e: unknown) =>
      deleteItem({ PK: `ABTEST#${testId}`, SK: (e as { SK: string }).SK })
    )
  );

  // 再実行時は古い理由要約キャッシュを破棄する
  const { reasonSummaryStatus: _s, reasonSummaryA: _a, reasonSummaryB: _b, winnersReasonSummary: _w, ...testBase } = test;
  void _s; void _a; void _b; void _w;

  if (USE_LOCAL_BEDROCK) {
    if (!test.designAImageKey || !test.designBImageKey) {
      return c.json({ error: "VALIDATION_ERROR", message: "Both design images must be set" }, 400);
    }
    if (!test.personaIds?.length) {
      return c.json({ error: "VALIDATION_ERROR", message: "At least one persona must be selected" }, 400);
    }
    const now = new Date().toISOString();
    await putItem({ ...testBase, status: "running", updatedAt: now } as unknown as Record<string, unknown>);
    const ac = new AbortController();
    runningAbortControllers.set(testId, ac);
    // 非同期で実行（レスポンスを待たずに返す）
    (async () => {
      try {
        const batches = chunkArray(test.personaIds!, 5);
        for (const batch of batches) {
          if (ac.signal.aborted) break;
          await Promise.allSettled(
            batch.map((personaId) =>
              evaluateLocalBedrock(testId, personaId, userId, test.designAImageKey!, test.designBImageKey!)
            )
          );
        }
        if (ac.signal.aborted) return;
        const evals = await queryByPK<EvaluationRecord>(`ABTEST#${testId}`, "EVAL#");
        const summaryFields = await generateReasonSummaryFields(evals.filter((e) => e.status === "completed"));
        await putItem({ ...testBase, status: "completed", ...summaryFields, updatedAt: new Date().toISOString() } as unknown as Record<string, unknown>);
      } finally {
        runningAbortControllers.delete(testId);
      }
    })();
    return c.json({ started: true });
  }

  const now = new Date().toISOString();
  await putItem({ ...testBase, status: "running", updatedAt: now } as unknown as Record<string, unknown>);

  const ac = new AbortController();
  runningAbortControllers.set(testId, ac);
  // 非同期で実行（レスポンスを待たずに返す）
  (async () => {
    try {
      const personaIds: string[] = test.personaIds ?? [];
      for (const personaId of personaIds) {
        if (ac.signal.aborted) break;
        const persona = await getItem<PersonaRecord>({ PK: `USER#${userId}`, SK: `PERSONA#${personaId}` });
        const winner = Math.random() > 0.5 ? "A" : "B";
        // 勝者側を高め、敗者側を低めに振った 0〜100 スコアを生成
        const scoreFor = (isWinner: boolean) => {
          const base = isWinner ? 70 : 45;
          const r = () => base + Math.floor(Math.random() * 25);
          return { usability: r(), aesthetics: r(), clarity: r(), engagement: r(), trust: r() };
        };
        const evalRecord: EvaluationRecord = {
          ...evaluationKey(testId, personaId),
          winner: winner as "A" | "B",
          confidence: Math.floor(Math.random() * 35) + 60,
          reason: `[ローカルスタブ] ${persona?.displayName ?? personaId}視点での評価。デザイン${winner}の方が視認性・操作性に優れていると判断しました。`,
          scoresA: scoreFor(winner === "A"),
          scoresB: scoreFor(winner === "B"),
          status: "completed",
          personaDisplayName: persona?.displayName ?? personaId,
          evaluatedAt: now,
        };
        await putItem(evalRecord as unknown as Record<string, unknown>);
      }
      if (ac.signal.aborted) return;
      const evals = await queryByPK<EvaluationRecord>(`ABTEST#${testId}`, "EVAL#");
      const summaryFields = await generateReasonSummaryFields(evals.filter((e) => e.status === "completed"));
      await putItem({ ...testBase, status: "completed", ...summaryFields, updatedAt: now } as unknown as Record<string, unknown>);
    } finally {
      runningAbortControllers.delete(testId);
    }
  })();

  return c.json({ started: true });
});

app.post("/tests/:id/abort", async (c) => {
  const userId = c.req.header("x-local-user-id")!;
  const testId = c.req.param("id");

  const test = await getItem<ABTestRecord>(abtestKey(userId, testId));
  if (!test) return c.json({ error: "NOT_FOUND" }, 404);

  const ac = runningAbortControllers.get(testId);
  if (ac) ac.abort();
  runningAbortControllers.delete(testId);

  await putItem({ ...test, status: "failed", updatedAt: new Date().toISOString() } as unknown as Record<string, unknown>);
  return c.json({ aborted: true });
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

app.get("/settings", async (c) => {
  const res = await getSettings(toEvent(c.req));
  return c.body(res.body, res.statusCode as 200, res.headers as Record<string, string>);
});

app.put("/settings", async (c) => {
  const body = await c.req.text();
  const res = await putSettings({ ...toEvent(c.req, {}, body), body });
  return c.body(res.body, res.statusCode as 200, res.headers as Record<string, string>);
});

console.log(`Chorus local dev server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
