import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { extname } from "node:path";
import { createRoutes, type RouteEnv } from "./routes.js";
import { createContainer } from "./container.js";
import { MemoryPersonaRepository, MemoryABTestRepository, MemoryEvaluationRepository, MemorySettingsRepository, MemoryProjectRepository } from "./infra/local/memory-repos.js";
import { FileStorageService } from "./infra/local/file-storage-service.js";
import { StubAIService } from "./infra/local/stub-ai-service.js";
import { captureWebsite } from "./infra/local/screenshot-capture.js";
import type { ImageSource } from "./domain/ports/ai-service.js";
import { loadSeedIfEmpty } from "./seed/load-seed.js";

const USE_LOCAL_BEDROCK = process.env.LOCAL_BEDROCK === "true";
const port = Number(process.env.PORT ?? 3001);
const LOCAL_UPLOAD_DIR = "/tmp/chorus-uploads";

const fileStorage = new FileStorageService(LOCAL_UPLOAD_DIR, `http://localhost:${port}`);

const container = createContainer({
  personaRepo: new MemoryPersonaRepository(),
  testRepo: new MemoryABTestRepository(),
  evalRepo: new MemoryEvaluationRepository(),
  settingsRepo: new MemorySettingsRepository(),
  projectRepo: new MemoryProjectRepository(),
  storageService: fileStorage,
  captureWebsite,
  ...(USE_LOCAL_BEDROCK ? {} : { aiService: new StubAIService() }),
});

function buildLocalImageSource(key: string): ImageSource {
  const buf = fileStorage.readFile(key);
  if (!buf) throw new Error(`Image not found: ${key}`);
  return { kind: "bytes", data: buf, format: fileStorage.getImageFormat(key) };
}

const runningAbortControllers = new Map<string, AbortController>();

const app = new Hono<RouteEnv>();

app.use("*", cors({
  origin: (origin) => origin?.startsWith("http://localhost:") ? origin : "http://localhost:5173",
  credentials: true,
}));

app.use("*", async (c, next) => {
  if (c.req.path.startsWith("/images/")) return next();

  const authHeader = c.req.header("Authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;
  if (bearer) {
    const result = await container.apiKeyUseCases.verify(bearer);
    if (!result) return c.json({ error: "UNAUTHORIZED", message: "invalid api key" }, 401);
    c.set("container", container);
    c.set("userId", result.userId);
    c.set("authVia", "apikey");
    return next();
  }

  const userId = c.req.header("x-local-user-id");
  if (!userId) return c.json({ error: "UNAUTHORIZED", message: "x-local-user-id header required in local mode" }, 401);
  c.set("container", container);
  c.set("userId", userId);
  c.set("authVia", "session");
  await next();
});

// Shared routes
app.route("/", createRoutes());

// --- Dev-only: image upload & serving (local file storage) ---
app.put("/images/*", async (c) => {
  const key = c.req.path.slice("/images/".length);
  const arrayBuffer = await c.req.arrayBuffer();
  await fileStorage.putObject(key, Buffer.from(arrayBuffer), "");
  return c.text("", 200);
});

app.get("/images/*", (c) => {
  const key = c.req.path.slice("/images/".length);
  const buf = fileStorage.readFile(key);
  if (!buf) return c.text("Not Found", 404);
  const ext = extname(key).slice(1).toLowerCase();
  const ct = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";
  return c.body(new Uint8Array(buf), 200, { "Content-Type": ct });
});

// --- Dev-only: execute with local abort tracking ---
app.post("/tests/:id/execute", async (c) => {
  const userId = c.var.userId;
  const testId = c.req.param("id");

  const test = await container.testRepo.findById(userId, testId);
  if (!test) return c.json({ error: "NOT_FOUND" }, 404);
  if (test.status === "running") return c.json({ error: "CONFLICT" }, 409);
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
      await container.evaluationUseCases.executeTest(userId, testId, {
        buildImageSource: buildLocalImageSource,
        onAbort: ac.signal,
      });
    } finally {
      runningAbortControllers.delete(testId);
    }
  })();

  return c.json({ started: true });
});

app.post("/tests/:id/abort", async (c) => {
  const userId = c.var.userId;
  const testId = c.req.param("id");

  const test = await container.testRepo.findById(userId, testId);
  if (!test) return c.json({ error: "NOT_FOUND" }, 404);

  const ac = runningAbortControllers.get(testId);
  if (ac) ac.abort();
  runningAbortControllers.delete(testId);

  return c.json({ aborted: true });
});

loadSeedIfEmpty(container.testRepo, container.evalRepo, LOCAL_UPLOAD_DIR)
  .then(() => {
    console.log(`Chorus local dev server running on http://localhost:${port}`);
    serve({ fetch: app.fetch, port });
  });
