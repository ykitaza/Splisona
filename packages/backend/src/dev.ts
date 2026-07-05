import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { extname } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createApp, type AppAdapters } from "./create-app.js";
import { createContainer } from "./container.js";
import { MemoryPersonaRepository, MemoryABTestRepository, MemoryEvaluationRepository, MemorySettingsRepository, MemoryProjectRepository, MemoryApiKeyRepository, MemoryShareLinkRepository } from "./infra/local/memory-repos.js";
import { FileStorageService } from "./infra/local/file-storage-service.js";
import { StubAIService } from "./infra/local/stub-ai-service.js";
import { captureWebsite } from "./infra/local/screenshot-capture.js";
import type { ImageSource } from "./domain/ports/ai-service.js";
import { loadSeedIfEmpty } from "./seed/load-seed.js";

const EXPORT_TEMPLATE_PATH = fileURLToPath(new URL("../../frontend/public/export-template.html", import.meta.url));

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
  apiKeyRepo: new MemoryApiKeyRepository(),
  shareRepo: new MemoryShareLinkRepository(),
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

const adapters: AppAdapters = {
  preMiddleware: [
    cors({
      origin: (origin) => origin?.startsWith("http://localhost:") ? origin : "http://localhost:5173",
      credentials: true,
    }),
  ],

  getContainer: () => container,

  async verifySession(c) {
    return c.req.header("x-local-user-id") ?? null;
  },
  sessionErrorBody: { error: "UNAUTHORIZED", message: "x-local-user-id header required in local mode" },

  async loadShareTemplate() {
    try {
      return readFileSync(EXPORT_TEMPLATE_PATH, "utf-8");
    } catch {
      return null;
    }
  },

  async loadImageDataUrl(_container, key) {
    if (!key) return null;
    const buf = fileStorage.readFile(key);
    if (!buf) return null;
    const format = fileStorage.getImageFormat(key);
    const mime = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : format === "gif" ? "image/gif" : "image/png";
    return `data:${mime};base64,${buf.toString("base64")}`;
  },
};

const app = createApp(adapters);

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
    } catch (e) {
      // 未捕捉例外は unhandled rejection でプロセスごと落ちるため、失敗として確定させる
      console.error("[executeTest] fatal:", e);
      try { await container.evaluationUseCases.abortTest(userId, testId); } catch {}
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
