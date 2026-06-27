import { Hono } from "hono";
import { createCloudflareContainer, type CloudflareEnv } from "./infra/cloudflare/container-cloudflare.js";
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from "./application/errors.js";
import { verifyAccessJWT } from "./infra/cloudflare/cf-access-auth.js";
import type { ImageSource } from "./domain/ports/ai-service.js";
import type { EvaluationScores } from "./domain/types.js";

type Bindings = CloudflareEnv & {
  CF_ACCESS_TEAM_DOMAIN: string;
  CF_ACCESS_AUD: string;
};

const app = new Hono<{ Bindings: Bindings }>();

async function getUserId(c: { req: { header: (name: string) => string | undefined }; env: Bindings }): Promise<string> {
  const jwt = c.req.header("X-Access-Jwt");
  if (jwt) {
    return verifyAccessJWT(jwt, c.env.CF_ACCESS_TEAM_DOMAIN, c.env.CF_ACCESS_AUD);
  }
  throw new Error("Unauthorized");
}

function handleError(e: unknown) {
  if (e instanceof NotFoundError) return { status: 404 as const, body: { error: "NOT_FOUND" } };
  if (e instanceof ForbiddenError) return { status: 403 as const, body: { error: "FORBIDDEN", message: e.message } };
  if (e instanceof ValidationError) return { status: 400 as const, body: { error: "VALIDATION_ERROR", message: e.message } };
  if (e instanceof ConflictError) return { status: 409 as const, body: { error: "CONFLICT", message: e.message } };
  console.error(e);
  return { status: 500 as const, body: { error: "INTERNAL_ERROR", message: String(e) } };
}

// --- Persona routes ---

app.get("/personas", async (c) => {
  try {
    const container = createCloudflareContainer(c.env);
    const userId = await getUserId(c);
    return c.json(await container.personaUseCases.list(userId));
  } catch (e) {
    const err = handleError(e);
    return c.json(err.body, err.status);
  }
});

app.post("/personas", async (c) => {
  try {
    const container = createCloudflareContainer(c.env);
    const userId = await getUserId(c);
    const input = await c.req.json();
    if (!input.displayName?.trim()) return c.json({ error: "VALIDATION_ERROR", message: "displayName is required" }, 400);
    return c.json(await container.personaUseCases.create(userId, input), 201);
  } catch (e) {
    const err = handleError(e);
    return c.json(err.body, err.status);
  }
});

app.get("/personas/:id", async (c) => {
  try {
    const container = createCloudflareContainer(c.env);
    const userId = await getUserId(c);
    const persona = await container.personaUseCases.get(userId, c.req.param("id"));
    if (!persona) return c.json({ error: "NOT_FOUND" }, 404);
    return c.json(persona);
  } catch (e) {
    const err = handleError(e);
    return c.json(err.body, err.status);
  }
});

app.put("/personas/:id", async (c) => {
  try {
    const container = createCloudflareContainer(c.env);
    const userId = await getUserId(c);
    const input = await c.req.json();
    return c.json(await container.personaUseCases.update(userId, c.req.param("id"), input));
  } catch (e) {
    const err = handleError(e);
    return c.json(err.body, err.status);
  }
});

app.delete("/personas/:id", async (c) => {
  try {
    const container = createCloudflareContainer(c.env);
    const userId = await getUserId(c);
    await container.personaUseCases.delete(userId, c.req.param("id"));
    return c.json({ deleted: true });
  } catch (e) {
    const err = handleError(e);
    return c.json(err.body, err.status);
  }
});

app.post("/personas/:id/draft", async (c) => {
  try {
    const container = createCloudflareContainer(c.env);
    const userId = await getUserId(c);
    return c.json(await container.personaUseCases.generateDraft(userId, c.req.param("id")));
  } catch (e) {
    if (e instanceof NotFoundError) return c.json({ error: "NOT_FOUND" }, 404);
    return c.json({ error: "AI_UNAVAILABLE", message: String(e) }, 503);
  }
});

app.post("/personas/:id/upload-url", async (c) => {
  try {
    const container = createCloudflareContainer(c.env);
    const userId = await getUserId(c);
    const { contentType = "image/png" } = await c.req.json();
    return c.json(await container.personaUseCases.getUploadUrl(userId, c.req.param("id"), contentType));
  } catch (e) {
    const err = handleError(e);
    return c.json(err.body, err.status);
  }
});

app.post("/personas/:id/interview", async (c) => {
  try {
    const container = createCloudflareContainer(c.env);
    const userId = await getUserId(c);
    const { messages = [] } = await c.req.json();
    const content = await container.interviewUseCases.chat(userId, c.req.param("id"), messages);
    return c.json({ content });
  } catch (e) {
    if (e instanceof NotFoundError) return c.json({ error: "NOT_FOUND" }, 404);
    return c.json({ error: "AI_UNAVAILABLE", message: String(e) }, 503);
  }
});

// --- ABTest routes ---

app.post("/tests", async (c) => {
  try {
    const container = createCloudflareContainer(c.env);
    const userId = await getUserId(c);
    const input = await c.req.json();
    if (!input.title) input.title = "";
    return c.json(await container.abtestUseCases.create(userId, input), 201);
  } catch (e) {
    const err = handleError(e);
    return c.json(err.body, err.status);
  }
});

app.get("/tests", async (c) => {
  try {
    const container = createCloudflareContainer(c.env);
    const userId = await getUserId(c);
    return c.json(await container.abtestUseCases.list(userId));
  } catch (e) {
    const err = handleError(e);
    return c.json(err.body, err.status);
  }
});

app.get("/tests/:id", async (c) => {
  try {
    const container = createCloudflareContainer(c.env);
    const userId = await getUserId(c);
    const test = await container.abtestUseCases.get(userId, c.req.param("id"));
    if (!test) return c.json({ error: "NOT_FOUND" }, 404);
    return c.json(test);
  } catch (e) {
    const err = handleError(e);
    return c.json(err.body, err.status);
  }
});

app.put("/tests/:id", async (c) => {
  try {
    const container = createCloudflareContainer(c.env);
    const userId = await getUserId(c);
    const input = await c.req.json();
    return c.json(await container.abtestUseCases.update(userId, c.req.param("id"), input));
  } catch (e) {
    const err = handleError(e);
    return c.json(err.body, err.status);
  }
});

app.delete("/tests/:id", async (c) => {
  try {
    const container = createCloudflareContainer(c.env);
    const userId = await getUserId(c);
    await container.abtestUseCases.delete(userId, c.req.param("id"));
    return c.json({ deleted: true });
  } catch (e) {
    const err = handleError(e);
    return c.json(err.body, err.status);
  }
});

app.post("/tests/:id/upload-url", async (c) => {
  try {
    const container = createCloudflareContainer(c.env);
    const userId = await getUserId(c);
    const { side, contentType = "image/png" } = await c.req.json();
    return c.json(await container.abtestUseCases.getUploadUrl(userId, c.req.param("id"), side, contentType));
  } catch (e) {
    const err = handleError(e);
    return c.json(err.body, err.status);
  }
});

app.get("/tests/:id/progress", async (c) => {
  try {
    const container = createCloudflareContainer(c.env);
    const userId = await getUserId(c);
    return c.json(await container.abtestUseCases.getProgress(userId, c.req.param("id")));
  } catch (e) {
    const err = handleError(e);
    return c.json(err.body, err.status);
  }
});

// --- Upload route (R2 direct upload) ---

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

// --- Evaluation execution ---

app.post("/tests/:id/execute", async (c) => {
  try {
    const container = createCloudflareContainer(c.env);
    const userId = await getUserId(c);
    const testId = c.req.param("id");

    const test = await container.testRepo.findById(userId, testId);
    if (!test) return c.json({ error: "NOT_FOUND" }, 404);

    const buildImageSource = async (key: string): Promise<ImageSource> => {
      const obj = await (c.env.IMAGES as unknown as { get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null> }).get(key);
      if (!obj) throw new Error(`Image not found: ${key}`);
      const buf = Buffer.from(await obj.arrayBuffer());
      const ext = key.split(".").pop()?.toLowerCase() ?? "png";
      const format = ext === "jpg" || ext === "jpeg" ? "jpeg" : ext === "webp" ? "webp" : "png";
      return { kind: "bytes", data: buf, format: format as "png" | "jpeg" | "webp" };
    };

    // Workers では waitUntil で非同期実行
    c.executionCtx.waitUntil(
      container.evaluationUseCases.executeTest(userId, testId, {
        buildImageSource: (key: string) => buildImageSource(key),
      })
    );

    return c.json({ started: true });
  } catch (e) {
    const err = handleError(e);
    return c.json(err.body, err.status);
  }
});

app.post("/tests/:id/abort", async (c) => {
  try {
    const container = createCloudflareContainer(c.env);
    const userId = await getUserId(c);
    await container.evaluationUseCases.abortTest(userId, c.req.param("id"));
    return c.json({ aborted: true });
  } catch (e) {
    const err = handleError(e);
    return c.json(err.body, err.status);
  }
});

// --- Report routes ---

app.get("/tests/:id/report", async (c) => {
  try {
    const container = createCloudflareContainer(c.env);
    const userId = await getUserId(c);
    return c.json(await container.reportUseCases.getReport(userId, c.req.param("id")));
  } catch (e) {
    const err = handleError(e);
    return c.json(err.body, err.status);
  }
});

app.get("/tests/:id/export", async (c) => {
  try {
    const container = createCloudflareContainer(c.env);
    const userId = await getUserId(c);
    const csv = await container.reportUseCases.exportReport(userId, c.req.param("id"));
    return c.body(csv, 200, { "Content-Type": "text/csv" });
  } catch (e) {
    const err = handleError(e);
    return c.json(err.body, err.status);
  }
});

// --- Settings routes ---

app.get("/settings", async (c) => {
  try {
    const container = createCloudflareContainer(c.env);
    const userId = await getUserId(c);
    return c.json(await container.settingsUseCases.getAll(userId));
  } catch (e) {
    const err = handleError(e);
    return c.json(err.body, err.status);
  }
});

app.put("/settings", async (c) => {
  try {
    const container = createCloudflareContainer(c.env);
    const userId = await getUserId(c);
    const { section, data } = await c.req.json();
    await container.settingsUseCases.put(userId, section, data);
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ error: "invalid section" }, 400);
  }
});

app.get("/config", (c) => {
  return c.json({ modelId: c.env.GEMINI_MODEL_ID ?? "gemini-2.5-flash" });
});


export default app;
