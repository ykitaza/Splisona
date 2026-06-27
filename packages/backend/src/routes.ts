import { Hono } from "hono";
import type { AppContainer } from "./container.js";
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from "./application/errors.js";
import { toABTestDTO } from "./domain/types.js";

export interface RouteEnv {
  Variables: {
    container: AppContainer;
    userId: string;
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

  api.get("/config", (c) => c.json({ modelId: c.var.container.modelId }));

  // --- Persona ---
  api.get("/personas", async (c) => {
    try { return c.json(await c.var.container.personaUseCases.list(c.var.userId)); }
    catch (e) { const err = handleError(e); return c.json(err.body, err.status); }
  });

  api.post("/personas", async (c) => {
    try {
      const input = await c.req.json();
      if (!input.displayName?.trim()) return c.json({ error: "VALIDATION_ERROR", message: "displayName is required" }, 400);
      return c.json(await c.var.container.personaUseCases.create(c.var.userId, input), 201);
    } catch (e) { const err = handleError(e); return c.json(err.body, err.status); }
  });

  api.get("/personas/:id", async (c) => {
    try {
      const persona = await c.var.container.personaUseCases.get(c.var.userId, c.req.param("id"));
      if (!persona) return c.json({ error: "NOT_FOUND" }, 404);
      return c.json(persona);
    } catch (e) { const err = handleError(e); return c.json(err.body, err.status); }
  });

  api.put("/personas/:id", async (c) => {
    try {
      return c.json(await c.var.container.personaUseCases.update(c.var.userId, c.req.param("id"), await c.req.json()));
    } catch (e) { const err = handleError(e); return c.json(err.body, err.status); }
  });

  api.delete("/personas/:id", async (c) => {
    try {
      await c.var.container.personaUseCases.delete(c.var.userId, c.req.param("id"));
      return c.json({ deleted: true });
    } catch (e) { const err = handleError(e); return c.json(err.body, err.status); }
  });

  api.post("/personas/:id/draft", async (c) => {
    try { return c.json(await c.var.container.personaUseCases.generateDraft(c.var.userId, c.req.param("id"))); }
    catch (e) {
      if (e instanceof NotFoundError) return c.json({ error: "NOT_FOUND" }, 404);
      return c.json({ error: "AI_UNAVAILABLE", message: String(e) }, 503);
    }
  });

  api.post("/personas/:id/upload-url", async (c) => {
    try {
      const { contentType = "image/png" } = await c.req.json();
      return c.json(await c.var.container.personaUseCases.getUploadUrl(c.var.userId, c.req.param("id"), contentType));
    } catch (e) { const err = handleError(e); return c.json(err.body, err.status); }
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
    try { return c.json(await c.var.container.projectUseCases.list(c.var.userId)); }
    catch (e) { const err = handleError(e); return c.json(err.body, err.status); }
  });

  api.post("/projects", async (c) => {
    try {
      const input = await c.req.json();
      if (!input.name?.trim()) return c.json({ error: "VALIDATION_ERROR", message: "name is required" }, 400);
      return c.json(await c.var.container.projectUseCases.create(c.var.userId, input), 201);
    } catch (e) { const err = handleError(e); return c.json(err.body, err.status); }
  });

  api.get("/projects/:id", async (c) => {
    try { return c.json(await c.var.container.projectUseCases.getDetail(c.var.userId, c.req.param("id"))); }
    catch (e) { const err = handleError(e); return c.json(err.body, err.status); }
  });

  api.put("/projects/:id", async (c) => {
    try {
      return c.json(await c.var.container.projectUseCases.update(c.var.userId, c.req.param("id"), await c.req.json()));
    } catch (e) { const err = handleError(e); return c.json(err.body, err.status); }
  });

  api.delete("/projects/:id", async (c) => {
    try {
      await c.var.container.projectUseCases.delete(c.var.userId, c.req.param("id"));
      return c.json({ deleted: true });
    } catch (e) { const err = handleError(e); return c.json(err.body, err.status); }
  });

  api.post("/projects/:id/tests", async (c) => {
    try {
      const { testId } = await c.req.json();
      return c.json(await c.var.container.projectUseCases.addTest(c.var.userId, c.req.param("id"), testId));
    } catch (e) { const err = handleError(e); return c.json(err.body, err.status); }
  });

  api.delete("/projects/:id/tests/:testId", async (c) => {
    try {
      return c.json(await c.var.container.projectUseCases.removeTest(c.var.userId, c.req.param("id"), c.req.param("testId")));
    } catch (e) { const err = handleError(e); return c.json(err.body, err.status); }
  });

  // --- ABTest ---
  api.post("/tests", async (c) => {
    try {
      const input = await c.req.json();
      if (!input.title) input.title = "";
      return c.json(await c.var.container.abtestUseCases.create(c.var.userId, input), 201);
    } catch (e) { const err = handleError(e); return c.json(err.body, err.status); }
  });

  api.get("/tests", async (c) => {
    try { return c.json(await c.var.container.abtestUseCases.list(c.var.userId)); }
    catch (e) { const err = handleError(e); return c.json(err.body, err.status); }
  });

  api.get("/tests/:id", async (c) => {
    try {
      const test = await c.var.container.abtestUseCases.get(c.var.userId, c.req.param("id"));
      if (!test) return c.json({ error: "NOT_FOUND" }, 404);
      return c.json(test);
    } catch (e) { const err = handleError(e); return c.json(err.body, err.status); }
  });

  api.put("/tests/:id", async (c) => {
    try {
      return c.json(await c.var.container.abtestUseCases.update(c.var.userId, c.req.param("id"), await c.req.json()));
    } catch (e) { const err = handleError(e); return c.json(err.body, err.status); }
  });

  api.delete("/tests/:id", async (c) => {
    try {
      await c.var.container.abtestUseCases.delete(c.var.userId, c.req.param("id"));
      return c.json({ deleted: true });
    } catch (e) { const err = handleError(e); return c.json(err.body, err.status); }
  });

  api.post("/tests/:id/upload-url", async (c) => {
    try {
      const { side, contentType = "image/png" } = await c.req.json();
      return c.json(await c.var.container.abtestUseCases.getUploadUrl(c.var.userId, c.req.param("id"), side, contentType));
    } catch (e) { const err = handleError(e); return c.json(err.body, err.status); }
  });

  api.get("/tests/:id/progress", async (c) => {
    try { return c.json(await c.var.container.abtestUseCases.getProgress(c.var.userId, c.req.param("id"))); }
    catch (e) { const err = handleError(e); return c.json(err.body, err.status); }
  });

  api.post("/tests/:id/clone", async (c) => {
    try {
      const cloned = await c.var.container.abtestUseCases.clone(c.var.userId, c.req.param("id"));
      return c.json(toABTestDTO(cloned));
    } catch (e) { const err = handleError(e); return c.json(err.body, err.status); }
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
    try { return c.json(await c.var.container.reportUseCases.getReport(c.var.userId, c.req.param("id"))); }
    catch (e) { const err = handleError(e); return c.json(err.body, err.status); }
  });

  api.get("/tests/:id/export", async (c) => {
    try {
      const csv = await c.var.container.reportUseCases.exportReport(c.var.userId, c.req.param("id"));
      return c.body(csv, 200, { "Content-Type": "text/csv" });
    } catch (e) { const err = handleError(e); return c.json(err.body, err.status); }
  });

  // --- Figma ---
  api.post("/figma/verify", async (c) => {
    const { token } = await c.req.json<{ token: string }>();
    if (!token) return c.json({ valid: false, error: "token required" }, 400);
    try {
      const res = await fetch("https://api.figma.com/v1/me", { headers: { "X-Figma-Token": token } });
      if (!res.ok) return c.json({ valid: false, error: `Figma API returned ${res.status}` });
      const data = await res.json() as { email?: string; handle?: string };
      return c.json({ valid: true, email: data.email, handle: data.handle });
    } catch (e) { return c.json({ valid: false, error: String(e) }); }
  });

  // --- Settings ---
  api.get("/settings", async (c) => {
    try { return c.json(await c.var.container.settingsUseCases.getAll(c.var.userId)); }
    catch (e) { const err = handleError(e); return c.json(err.body, err.status); }
  });

  api.put("/settings", async (c) => {
    try {
      const { section, data } = await c.req.json();
      await c.var.container.settingsUseCases.put(c.var.userId, section, data);
      return c.json({ ok: true });
    } catch (e) { return c.json({ error: "invalid section" }, 400); }
  });

  return api;
}
