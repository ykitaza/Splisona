import { Hono } from "hono";
import type { AppContainer } from "./container.js";
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from "./application/errors.js";
import { toABTestDTO } from "./domain/types.js";

export interface RouteEnv {
  Variables: {
    container: AppContainer;
    userId: string;
    authVia: "session" | "apikey";
  };
}

function handleError(e: unknown) {
  if (e instanceof NotFoundError) return { status: 404 as const, body: { error: "NOT_FOUND" } };
  if (e instanceof ForbiddenError) return { status: 403 as const, body: { error: "FORBIDDEN", message: e.message } };
  if (e instanceof ValidationError) return { status: 400 as const, body: { error: "VALIDATION_ERROR", message: e.message } };
  if (e instanceof ConflictError) return { status: 409 as const, body: { error: "CONFLICT", message: e.message } };
  console.error(e);
  return { status: 500 as const, body: { error: "INTERNAL_ERROR", message: String(e) } };
}

export { handleError };

export function createRoutes() {
  const api = new Hono<RouteEnv>();

  api.onError((e, c) => {
    const err = handleError(e);
    return c.json(err.body, err.status);
  });

  api.get("/config", (c) => c.json({ modelId: c.var.container.modelId }));

  // --- Persona ---
  api.get("/personas", async (c) => {
    return c.json(await c.var.container.personaUseCases.list(c.var.userId));
  });

  api.post("/personas", async (c) => {
    const input = await c.req.json();
    if (!input.displayName?.trim()) return c.json({ error: "VALIDATION_ERROR", message: "displayName is required" }, 400);
    return c.json(await c.var.container.personaUseCases.create(c.var.userId, input), 201);
  });

  api.get("/personas/:id", async (c) => {
    const persona = await c.var.container.personaUseCases.get(c.var.userId, c.req.param("id"));
    if (!persona) return c.json({ error: "NOT_FOUND" }, 404);
    return c.json(persona);
  });

  api.put("/personas/:id", async (c) => {
    return c.json(await c.var.container.personaUseCases.update(c.var.userId, c.req.param("id"), await c.req.json()));
  });

  api.delete("/personas/:id", async (c) => {
    await c.var.container.personaUseCases.delete(c.var.userId, c.req.param("id"));
    return c.json({ deleted: true });
  });

  api.post("/personas/:id/draft", async (c) => {
    try { return c.json(await c.var.container.personaUseCases.generateDraft(c.var.userId, c.req.param("id"))); }
    catch (e) {
      if (e instanceof NotFoundError) return c.json({ error: "NOT_FOUND" }, 404);
      return c.json({ error: "AI_UNAVAILABLE", message: String(e) }, 503);
    }
  });

  api.post("/personas/:id/upload-url", async (c) => {
    const { contentType = "image/png" } = await c.req.json();
    return c.json(await c.var.container.personaUseCases.getUploadUrl(c.var.userId, c.req.param("id"), contentType));
  });

  api.post("/personas/:id/interview", async (c) => {
    try {
      const { messages = [] } = await c.req.json();
      const content = await c.var.container.interviewUseCases.chat(c.var.userId, c.req.param("id"), messages);
      return c.json({ content });
    } catch (e) {
      if (e instanceof NotFoundError) return c.json({ error: "NOT_FOUND" }, 404);
      return c.json({ error: "AI_UNAVAILABLE", message: String(e) }, 503);
    }
  });

  // --- Project ---
  api.get("/projects", async (c) => {
    return c.json(await c.var.container.projectUseCases.list(c.var.userId));
  });

  api.post("/projects", async (c) => {
    const input = await c.req.json();
    if (!input.name?.trim()) return c.json({ error: "VALIDATION_ERROR", message: "name is required" }, 400);
    return c.json(await c.var.container.projectUseCases.create(c.var.userId, input), 201);
  });

  api.get("/projects/:id", async (c) => {
    return c.json(await c.var.container.projectUseCases.getDetail(c.var.userId, c.req.param("id")));
  });

  api.put("/projects/:id", async (c) => {
    return c.json(await c.var.container.projectUseCases.update(c.var.userId, c.req.param("id"), await c.req.json()));
  });

  api.delete("/projects/:id", async (c) => {
    await c.var.container.projectUseCases.delete(c.var.userId, c.req.param("id"));
    return c.json({ deleted: true });
  });

  api.post("/projects/:id/tests", async (c) => {
    const { testId } = await c.req.json();
    return c.json(await c.var.container.projectUseCases.addTest(c.var.userId, c.req.param("id"), testId));
  });

  api.delete("/projects/:id/tests/:testId", async (c) => {
    return c.json(await c.var.container.projectUseCases.removeTest(c.var.userId, c.req.param("id"), c.req.param("testId")));
  });

  // --- ABTest ---
  api.post("/tests", async (c) => {
    const input = await c.req.json();
    if (!input.title) input.title = "";
    const test = await c.var.container.abtestUseCases.create(c.var.userId, input);
    return c.json(toABTestDTO(test), 201);
  });

  api.get("/tests", async (c) => {
    const tests = await c.var.container.abtestUseCases.list(c.var.userId);
    return c.json(tests.map(toABTestDTO));
  });

  api.get("/tests/:id", async (c) => {
    const test = await c.var.container.abtestUseCases.get(c.var.userId, c.req.param("id"));
    if (!test) return c.json({ error: "NOT_FOUND" }, 404);
    return c.json(toABTestDTO(test));
  });

  api.put("/tests/:id", async (c) => {
    const test = await c.var.container.abtestUseCases.update(c.var.userId, c.req.param("id"), await c.req.json());
    return c.json(toABTestDTO(test));
  });

  api.delete("/tests/:id", async (c) => {
    await c.var.container.abtestUseCases.delete(c.var.userId, c.req.param("id"));
    return c.json({ deleted: true });
  });

  api.post("/tests/:id/upload-url", async (c) => {
    const { side, contentType = "image/png", segmentIndex } = await c.req.json();
    return c.json(await c.var.container.abtestUseCases.getUploadUrl(c.var.userId, c.req.param("id"), side, contentType, segmentIndex));
  });

  api.get("/tests/:id/progress", async (c) => {
    return c.json(await c.var.container.abtestUseCases.getProgress(c.var.userId, c.req.param("id")));
  });

  api.post("/tests/:id/clone", async (c) => {
    const cloned = await c.var.container.abtestUseCases.clone(c.var.userId, c.req.param("id"));
    return c.json(toABTestDTO(cloned));
  });

  api.post("/tests/:id/results", async (c) => {
    const input = await c.req.json();
    await c.var.container.evaluationUseCases.ingestResults(c.var.userId, c.req.param("id"), input);
    return c.json({ ok: true });
  });

  // --- Capture ---
  api.post("/tests/:id/capture", async (c) => {
    try {
      const input = await c.req.json();
      return c.json(await c.var.container.captureUseCases.captureDesign(input));
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : String(e) }, 422);
    }
  });

  // --- Report ---
  api.get("/tests/:id/report", async (c) => {
    return c.json(await c.var.container.reportUseCases.getReport(c.var.userId, c.req.param("id")));
  });

  api.get("/tests/:id/export", async (c) => {
    const csv = await c.var.container.reportUseCases.exportReport(c.var.userId, c.req.param("id"));
    return c.body(csv, 200, { "Content-Type": "text/csv" });
  });

  // --- Share ---
  api.post("/tests/:id/share", async (c) => {
    return c.json(await c.var.container.shareUseCases.create(c.var.userId, c.req.param("id")), 201);
  });

  api.get("/tests/:id/share", async (c) => {
    return c.json(await c.var.container.shareUseCases.status(c.var.userId, c.req.param("id")));
  });

  api.delete("/tests/:id/share", async (c) => {
    await c.var.container.shareUseCases.revoke(c.var.userId, c.req.param("id"));
    return c.json({ deleted: true });
  });

  // --- Figma ---
  api.post("/figma/verify", async (c) => {
    const { token } = await c.req.json<{ token: string }>();
    if (!token) return c.json({ valid: false, error: "token required" }, 400);
    try {
      // file_content:read スコープのみで検証可能な方法:
      // 存在しないファイルを叩き、404=トークン有効 / 403=トークン無効
      const res = await fetch("https://api.figma.com/v1/files/__verify__", { headers: { "X-Figma-Token": token } });
      if (res.status === 404) return c.json({ valid: true });
      if (res.status === 403) {
        const data = await res.json() as { err?: string };
        return c.json({ valid: false, error: data.err || "Invalid token" });
      }
      return c.json({ valid: false, error: `Figma API returned ${res.status}` });
    } catch (e) { return c.json({ valid: false, error: String(e) }); }
  });

  // --- Settings ---
  api.get("/settings", async (c) => {
    return c.json(await c.var.container.settingsUseCases.getAll(c.var.userId));
  });

  api.put("/settings", async (c) => {
    try {
      const { section, data } = await c.req.json();
      await c.var.container.settingsUseCases.put(c.var.userId, section, data);
      return c.json({ ok: true });
    } catch (e) { return c.json({ error: "invalid section" }, 400); }
  });

  // --- Agent (API Key) ---
  api.get("/agent/whoami", async (c) => {
    return c.json({ userId: c.var.userId });
  });

  api.post("/agent/keys", async (c) => {
    if (c.var.authVia !== "session") return c.json({ error: "FORBIDDEN", message: "api key cannot manage keys" }, 403);
    const { name } = await c.req.json();
    if (!name?.trim()) return c.json({ error: "VALIDATION_ERROR", message: "name is required" }, 400);
    return c.json(await c.var.container.apiKeyUseCases.issue(c.var.userId, name), 201);
  });

  api.get("/agent/keys", async (c) => {
    if (c.var.authVia !== "session") return c.json({ error: "FORBIDDEN", message: "api key cannot manage keys" }, 403);
    return c.json(await c.var.container.apiKeyUseCases.list(c.var.userId));
  });

  api.delete("/agent/keys/:keyId", async (c) => {
    if (c.var.authVia !== "session") return c.json({ error: "FORBIDDEN", message: "api key cannot manage keys" }, 403);
    await c.var.container.apiKeyUseCases.revoke(c.var.userId, c.req.param("keyId"));
    return c.json({ deleted: true });
  });

  return api;
}
