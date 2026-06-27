import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { createContainer } from "./container.js";
import type { ImageSource } from "./domain/ports/ai-service.js";
import type { EvaluationScores } from "./domain/types.js";

const LOCAL_UPLOAD_DIR = "/tmp/chorus-uploads";
mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });

const USE_LOCAL_BEDROCK = process.env.LOCAL_BEDROCK === "true";

const container = createContainer();
const {
  personaUseCases,
  abtestUseCases,
  interviewUseCases,
  evaluationUseCases,
  reportUseCases,
  settingsUseCases,
  personaRepo,
  testRepo,
  modelId,
} = container;

const runningAbortControllers = new Map<string, AbortController>();

function getImageFormat(key: string): "png" | "jpeg" | "gif" | "webp" {
  const ext = extname(key).slice(1).toLowerCase();
  if (ext === "jpg") return "jpeg";
  if (ext === "jpeg" || ext === "gif" || ext === "webp") return ext;
  return "png";
}

function imageKeyToPath(key: string): string {
  return join(LOCAL_UPLOAD_DIR, key.replace(/\//g, "_"));
}

function buildLocalImageSource(key: string): ImageSource {
  const buf = readFileSync(imageKeyToPath(key));
  return { kind: "bytes", data: buf, format: getImageFormat(key) };
}

const port = Number(process.env.PORT ?? 3001);

const app = new Hono();

app.use("*", cors({ origin: "*" }));

app.options("*", (c) => {
  c.res.headers.set("Access-Control-Allow-Origin", "*");
  c.res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  c.res.headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization,x-local-user-id");
  return c.body(null, 204);
});

app.get("/config", (c) => {
  return c.json({ modelId });
});

app.use("*", async (c, next) => {
  if (c.req.path.startsWith("/stub-upload/")) return next();
  const userId = c.req.header("x-local-user-id");
  if (!userId) {
    return c.json({ error: "UNAUTHORIZED", message: "x-local-user-id header required in local mode" }, 401);
  }
  await next();
});

// Persona routes
app.get("/personas", async (c) => {
  const userId = c.req.header("x-local-user-id")!;
  const personas = await personaUseCases.list(userId);
  return c.json(personas);
});

app.post("/personas", async (c) => {
  const userId = c.req.header("x-local-user-id")!;
  const input = await c.req.json();
  if (!input.displayName?.trim()) return c.json({ error: "VALIDATION_ERROR", message: "displayName is required" }, 400);
  const persona = await personaUseCases.create(userId, input);
  return c.json(persona, 201);
});

app.get("/personas/:id", async (c) => {
  const userId = c.req.header("x-local-user-id")!;
  const persona = await personaUseCases.get(userId, c.req.param("id"));
  if (!persona) return c.json({ error: "NOT_FOUND" }, 404);
  return c.json(persona);
});

app.put("/personas/:id", async (c) => {
  const userId = c.req.header("x-local-user-id")!;
  try {
    const input = await c.req.json();
    const persona = await personaUseCases.update(userId, c.req.param("id"), input);
    return c.json(persona);
  } catch (e) {
    if ((e as Error).name === "NotFoundError") return c.json({ error: "NOT_FOUND" }, 404);
    if ((e as Error).name === "ForbiddenError") return c.json({ error: "FORBIDDEN", message: (e as Error).message }, 403);
    throw e;
  }
});

app.delete("/personas/:id", async (c) => {
  const userId = c.req.header("x-local-user-id")!;
  try {
    await personaUseCases.delete(userId, c.req.param("id"));
    return c.json({ deleted: true });
  } catch (e) {
    if ((e as Error).name === "NotFoundError") return c.json({ error: "NOT_FOUND" }, 404);
    if ((e as Error).name === "ForbiddenError") return c.json({ error: "FORBIDDEN", message: (e as Error).message }, 403);
    throw e;
  }
});

app.post("/personas/:id/draft", async (c) => {
  const userId = c.req.header("x-local-user-id")!;
  const personaId = c.req.param("id");
  if (USE_LOCAL_BEDROCK) {
    try {
      const draft = await personaUseCases.generateDraft(userId, personaId);
      return c.json(draft);
    } catch (e) {
      if ((e as Error).name === "NotFoundError") return c.json({ error: "NOT_FOUND" }, 404);
      return c.json({ error: "AI_UNAVAILABLE" }, 503);
    }
  }
  const persona = await personaRepo.findById(userId, personaId);
  const name = persona?.displayName ?? "このペルソナ";
  return c.json({
    freeText: `[ローカルスタブ] ${name}は${persona?.occupation ?? "職業不明"}の${persona?.age ?? "年齢不明"}歳。日常的にデジタルサービスを利用しており、使いやすさと視覚的な明確さを重視する傾向があります。`,
    suggestedDescription: `[ローカルスタブ] ${name}の行動特性と価値観に関する説明文がここに生成されます。`,
  });
});

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

app.post("/personas/:id/interview", async (c) => {
  const userId = c.req.header("x-local-user-id")!;
  const personaId = c.req.param("id");
  if (USE_LOCAL_BEDROCK) {
    try {
      const { messages = [] } = await c.req.json();
      const content = await interviewUseCases.chat(userId, personaId, messages);
      return c.json({ content });
    } catch (e) {
      if ((e as Error).name === "NotFoundError") return c.json({ error: "NOT_FOUND" }, 404);
      return c.json({ error: "AI_UNAVAILABLE" }, 503);
    }
  }
  const persona = await personaRepo.findById(userId, personaId);
  const name = persona?.displayName ?? "ペルソナ";
  return c.text(`[ローカルスタブ] こんにちは。私は${name}です。ローカル開発モードのため、実際のAI応答は生成されません。本番環境ではBedrockを使用してペルソナとしての回答が生成されます。`);
});

// ABTest routes
app.post("/tests", async (c) => {
  const userId = c.req.header("x-local-user-id")!;
  const input = await c.req.json();
  if (!input.title?.trim()) return c.json({ error: "VALIDATION_ERROR", message: "title is required" }, 400);
  const test = await abtestUseCases.create(userId, input);
  return c.json(test, 201);
});

app.get("/tests", async (c) => {
  const userId = c.req.header("x-local-user-id")!;
  const tests = await abtestUseCases.list(userId);
  return c.json(tests);
});

app.get("/tests/:id", async (c) => {
  const userId = c.req.header("x-local-user-id")!;
  const test = await abtestUseCases.get(userId, c.req.param("id"));
  if (!test) return c.json({ error: "NOT_FOUND" }, 404);
  return c.json(test);
});

app.put("/tests/:id", async (c) => {
  const userId = c.req.header("x-local-user-id")!;
  try {
    const input = await c.req.json();
    const test = await abtestUseCases.update(userId, c.req.param("id"), input);
    return c.json(test);
  } catch (e) {
    if ((e as Error).name === "NotFoundError") return c.json({ error: "NOT_FOUND" }, 404);
    throw e;
  }
});

app.delete("/tests/:id", async (c) => {
  const userId = c.req.header("x-local-user-id")!;
  await abtestUseCases.delete(userId, c.req.param("id"));
  return c.json({ deleted: true });
});

// Figma token verification
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

// URL capture: local disk instead of S3
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

// Image upload URL: local disk stub
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

// Stub upload endpoint (local disk)
app.put("/stub-upload/*", async (c) => {
  const key = c.req.path.slice("/stub-upload/".length);
  const arrayBuffer = await c.req.arrayBuffer();
  writeFileSync(imageKeyToPath(key), Buffer.from(arrayBuffer));
  return c.text("", 200);
});

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
  const userId = c.req.header("x-local-user-id")!;
  try {
    const progress = await abtestUseCases.getProgress(userId, c.req.param("id"));
    return c.json(progress);
  } catch (e) {
    if ((e as Error).name === "NotFoundError") return c.json({ error: "NOT_FOUND" }, 404);
    throw e;
  }
});

// Evaluation execution
app.post("/tests/:id/execute", async (c) => {
  const userId = c.req.header("x-local-user-id")!;
  const testId = c.req.param("id");

  const test = await testRepo.findById(userId, testId);
  if (!test) return c.json({ error: "NOT_FOUND" }, 404);
  if (test.status === "running") return c.json({ error: "CONFLICT" }, 409);

  if (USE_LOCAL_BEDROCK) {
    if (!test.designAImageKey || !test.designBImageKey) {
      return c.json({ error: "VALIDATION_ERROR", message: "Both design images must be set" }, 400);
    }
    if (!test.personaIds?.length) {
      return c.json({ error: "VALIDATION_ERROR", message: "At least one persona must be selected" }, 400);
    }
    const ac = new AbortController();
    runningAbortControllers.set(testId, ac);
    (async () => {
      try {
        await evaluationUseCases.executeTest(userId, testId, {
          buildImageSource: buildLocalImageSource,
          onAbort: ac.signal,
        });
      } finally {
        runningAbortControllers.delete(testId);
      }
    })();
    return c.json({ started: true });
  }

  // Stub mode: generate random evaluations
  const ac = new AbortController();
  runningAbortControllers.set(testId, ac);
  (async () => {
    try {
      await container.evalRepo.removeAllByTest(testId);
      await testRepo.save({ ...test, status: "running", reasonSummaryStatus: undefined, reasonSummaryA: undefined, reasonSummaryB: undefined, winnersReasonSummary: undefined, updatedAt: new Date().toISOString() });

      const now = new Date().toISOString();
      for (const personaId of test.personaIds ?? []) {
        if (ac.signal.aborted) break;
        const persona = await personaRepo.findById(userId, personaId);
        const winner = Math.random() > 0.5 ? "A" : "B";
        const scoreFor = (isWinner: boolean): EvaluationScores => {
          const base = isWinner ? 70 : 45;
          const r = () => base + Math.floor(Math.random() * 25);
          return { usability: r(), aesthetics: r(), clarity: r(), engagement: r(), trust: r() };
        };
        await container.evalRepo.save({
          testId,
          personaId,
          winner: winner as "A" | "B",
          confidence: Math.floor(Math.random() * 35) + 60,
          reason: `[ローカルスタブ] ${persona?.displayName ?? personaId}視点での評価。デザイン${winner}の方が視認性・操作性に優れていると判断しました。`,
          scoresA: scoreFor(winner === "A"),
          scoresB: scoreFor(winner === "B"),
          status: "completed",
          personaDisplayName: persona?.displayName ?? personaId,
          evaluatedAt: now,
        });
      }
      if (ac.signal.aborted) return;
      const evals = await container.evalRepo.findAllByTest(testId);
      const summaryFields = await evaluationUseCases.generateReasonSummaryFields(evals.filter((e) => e.status === "completed"));
      await testRepo.save({ ...test, status: "completed", ...summaryFields, updatedAt: new Date().toISOString() });
    } finally {
      runningAbortControllers.delete(testId);
    }
  })();

  return c.json({ started: true });
});

app.post("/tests/:id/abort", async (c) => {
  const userId = c.req.header("x-local-user-id")!;
  const testId = c.req.param("id");

  const test = await testRepo.findById(userId, testId);
  if (!test) return c.json({ error: "NOT_FOUND" }, 404);

  const ac = runningAbortControllers.get(testId);
  if (ac) ac.abort();
  runningAbortControllers.delete(testId);

  await testRepo.save({ ...test, status: "failed", updatedAt: new Date().toISOString() });
  return c.json({ aborted: true });
});

// Report routes
app.get("/tests/:id/report", async (c) => {
  const userId = c.req.header("x-local-user-id")!;
  try {
    const report = await reportUseCases.getReport(userId, c.req.param("id"));
    return c.json(report);
  } catch (e) {
    if ((e as Error).name === "NotFoundError") return c.json({ error: "NOT_FOUND" }, 404);
    throw e;
  }
});

app.get("/tests/:id/export", async (c) => {
  const userId = c.req.header("x-local-user-id")!;
  try {
    const csv = await reportUseCases.exportReport(userId, c.req.param("id"));
    return c.body(csv, 200, { "Content-Type": "text/csv" });
  } catch (e) {
    if ((e as Error).name === "NotFoundError") return c.json({ error: "NOT_FOUND" }, 404);
    throw e;
  }
});

app.get("/settings", async (c) => {
  const userId = c.req.header("x-local-user-id")!;
  const result = await settingsUseCases.getAll(userId);
  return c.json(result);
});

app.put("/settings", async (c) => {
  const userId = c.req.header("x-local-user-id")!;
  const { section, data } = await c.req.json<{ section: string; data: unknown }>();
  try {
    await settingsUseCases.put(userId, section, data);
    return c.json({ ok: true });
  } catch {
    return c.json({ error: "invalid section" }, 400);
  }
});

console.log(`Chorus local dev server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
